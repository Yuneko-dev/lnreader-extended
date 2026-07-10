import EpubFile, {
  EpubChapter,
  EpubSettings,
  File,
} from '@modules/epub-constructor';
import NativeFile from '@specs/NativeFile';
import NativeZipArchive from '@specs/NativeZipArchive';
import { EpubPerformanceTracker } from '@utils/epubPerformance';
import { Dirs, FileSystem } from 'react-native-file-access';
import { randomUUID } from 'react-native-quick-crypto';
import {
  copyFile,
  exists,
  hasPermission,
  mkdir,
  openDocumentTree,
  unlink,
  writeFile,
} from 'react-native-saf-x';

const getEpubfileName = (name: string) => {
  return name.replace(/\.epub$/i, '') + '.epub';
};

const validateDir = async (path: string) => {
  path = getFolderPath(path);
  if (!(await exists(path))) {
    await mkdir(path);
  }
};
const removeDir = async (path: string) => {
  if (await exists(path)) {
    await unlink(path);
  }
};

const checkFile = (path: string) => {
  const name = path.split('/').reverse()[0].toLocaleLowerCase();
  const fileExtension = [
    '.json',
    '.html',
    '.xml',
    '.opf',
    '.ncx',
    '.css',
    '.xhtml',
    '.js',
    'mimetype',
    '.epub',
  ];
  const fileInfo = {
    isDirectory: !fileExtension.find(x => name.indexOf(x) !== -1),
    folderPath:
      path.split('/').length > 1 &&
      fileExtension.find(x => name.indexOf(x) !== -1)
        ? path
            .split('/')
            .reverse()
            .filter((x, index) => index > 0)
            .reverse()
            .join('/')
        : path,
  };
  return fileInfo;
};

const getFolderPath = (path: string) => {
  const file = checkFile(path);
  return file.folderPath;
};

const isInternalStorage = (path: string) => {
  return /^\/[a-z]+(?=:)|^c[a-z]+(?=:)|^f[a-z]+(?=:)/.test(path.trim());
};

export default class EpubBuilder {
  private epub: EpubFile;
  private outputPath?: string;
  private tempPath?: string;
  private tempOutputPath: string;
  private fileName: string;
  private dProgress: number = 0;
  private prepared: boolean = false;
  private readonly workspaceId: string;
  private populationStats = { fileCount: 0, imageCount: 0, textBytes: 0 };

  static onProgress?: (
    progress: number,
    epubFile: string,
    operation:
      | 'constructEpub'
      | 'SaveFile'
      | 'LoadingFile'
      | 'Zip'
      | 'Unzip'
      | 'Reading'
      | 'Finished',
  ) => void;

  public onSaveProgress?: (
    progress: number,
    epubFile: string,
    operation: 'constructEpub' | 'SaveFile' | 'Finished',
  ) => Promise<void>;

  /*
    destinationFolderPath: destination to the folder, You could use react-native-fs RNFS.DownloadDirectoryPath
    */
  constructor(settings: EpubSettings, destinationFolderPath?: string) {
    this.epub = new EpubFile(settings);
    this.fileName = this.epub.epubSettings.fileName!;
    this.workspaceId = randomUUID();
    this.tempOutputPath = `${Dirs.CacheDir}/epubOutput/${this.workspaceId}/`;
    this.outputPath = destinationFolderPath
      ? getFolderPath(destinationFolderPath)
      : undefined;
  }

  public getEpubSettings() {
    return this.epub.epubSettings;
  }

  /*
        This will prepare a temp folder that contains the data of the epub file.
        the folder will be descarded when the epub file is created eg save() or discardChanges() 
    */
  public async prepare() {
    this.prepared = true;
    await this.createTempFolder();
    if (!this.epub.epubSettings.chapters) {
      this.epub.epubSettings.chapters = [] as EpubChapter[];
    }
    return this;
  }
  /*
        discard all changes
    */
  public async discardChanges() {
    try {
      if (this.tempPath) {
        await removeDir(this.tempPath);
        await removeDir(this.tempOutputPath);
      }
      this.tempPath = undefined;
    } catch (error) {
      throw error;
    }
  }
  /*
        add a new Chapter
    */
  public addChapter(epubChapter: EpubChapter) {
    if (!this.prepared || !this.epub.epubSettings.chapters) {
      throw new Error('Please run the prepare method first');
    }
    this.epub.epubSettings.chapters.push(epubChapter);
  }

  /*
    destinationFolderPath: destination to the folder, You could use react-native-fs RNFS.DownloadDirectoryPath
    removeTempFile(default true) set to false if there will be other changes to the epub file so it wont have to recreate the temp folder
    */
  public async save(removeTempFile?: boolean) {
    const performance = new EpubPerformanceTracker('export');
    const epubFileName = getEpubfileName(this.fileName);
    const tempOutputFile = this.tempOutputPath + epubFileName;
    let succeeded = false;

    try {
      if (!this.prepared) {
        await this.createTempFolder();
      }
      const outputFile = `${this.outputPath}/${epubFileName}`;

      performance.startPhase('constructAndWriteFiles');
      await this.populate();

      // Correct manifest MIME types based on actual file magic bytes
      performance.startPhase('correctManifestMimeTypes');
      if (this.tempPath) {
        await this.correctManifestMimeTypes();
      }

      performance.startPhase('prepareOutput');
      await removeDir(this.tempOutputPath);

      if (this.tempPath) {
        await validateDir(this.tempOutputPath);
        // Use NativeZipArchive.zipEpub for EPUB-compliant zip:
        // mimetype is written FIRST as STORED (uncompressed) entry
        performance.startPhase('zip');
        await NativeZipArchive.zipEpub(this.tempPath, tempOutputFile);

        performance.startPhase('copyToDestination');
        await copyFile('file://' + tempOutputFile, outputFile, {
          replaceIfDestinationExists: true,
        });
      }

      if (removeTempFile !== false) {
        performance.startPhase('cleanup');
        await this.discardChanges();
      }

      this.dProgress = 100;
      EpubBuilder.onProgress?.(this.dProgress, epubFileName, 'Finished');
      succeeded = true;

      return outputFile;
    } finally {
      performance.finish({
        epubFileName,
        succeeded,
        ...this.populationStats,
      });
    }
  }

  private async pickFolder() {
    const folder = await openDocumentTree(true);
    if (folder) {
      this.outputPath = folder.uri;
      return;
    }
    throw new Error('No permissions to access destination folder granted.');
  }

  private async createTempFolder() {
    this.tempPath = `${Dirs.CacheDir}/epubCreation/${this.workspaceId}`;
    await validateDir(this.tempPath);
    await validateDir(this.tempPath + '/META-INF');
    await validateDir(this.tempPath + '/EPUB/content');
    await validateDir(this.tempPath + '/EPUB/images');

    if (!this.outputPath) {
      await this.pickFolder();
    } else {
      const isPermitted = await hasPermission(this.outputPath);
      if (!isPermitted) {
        await this.pickFolder();
      }
    }
  }

  /**
   * Scans all image files in EPUB/images/, detects actual MIME type
   * via magic bytes (NativeFile.detectImageMimeType), and patches
   * the OPF manifest to reflect the correct media-type.
   *
   * This ensures 100% EPUBCheck compliance for image MIME types,
   * regardless of the original URL extension.
   */
  private async correctManifestMimeTypes() {
    if (!this.tempPath) return;

    const imagesDir = this.tempPath + '/EPUB/images';
    const opfPath = this.tempPath + '/EPUB/package.opf';

    if (!NativeFile.exists(opfPath) || !NativeFile.exists(imagesDir)) return;

    const imageFiles = NativeFile.readDir(imagesDir);
    if (imageFiles.length === 0) return;

    const mimeTypesByHref = new Map<string, string>();

    for (const imageFile of imageFiles) {
      if (imageFile.isDirectory) continue;

      const detectedMime = NativeFile.detectImageMimeType(imageFile.path);
      if (detectedMime === 'application/octet-stream') continue;

      mimeTypesByHref.set(`images/${imageFile.name}`, detectedMime);
    }

    if (mimeTypesByHref.size === 0) return;

    const opfContent = NativeFile.readFile(opfPath);
    let modified = false;
    const correctedOpf = opfContent.replace(/<item\b[^>]*>/g, item => {
      const href = item.match(/\bhref="([^"]+)"/)?.[1];
      const detectedMime = href ? mimeTypesByHref.get(href) : undefined;
      if (!detectedMime) return item;

      const currentMime = item.match(/\bmedia-type="([^"]+)"/)?.[1];
      if (!currentMime || currentMime === detectedMime) return item;

      modified = true;
      return item.replace(
        /\bmedia-type="[^"]+"/,
        `media-type="${detectedMime}"`,
      );
    });

    if (modified) NativeFile.writeFile(opfPath, correctedOpf);
  }

  public async populate() {
    const epubFileName = getEpubfileName(this.fileName);
    const epub = new EpubFile(this.epub.epubSettings);

    const progressCallback =
      EpubBuilder.onProgress || this.onSaveProgress
        ? async (progress: number) => {
            EpubBuilder.onProgress?.(
              this.dProgress,
              epubFileName,
              'constructEpub',
            );
            if (this.onSaveProgress) {
              await this.onSaveProgress(
                progress,
                epubFileName,
                'constructEpub',
              );
            }
          }
        : undefined;
    const files: File[] = await epub.constructEpub(progressCallback);

    this.populationStats = files.reduce(
      (stats, file) => ({
        fileCount: stats.fileCount + 1,
        imageCount: stats.imageCount + (file.isImage ? 1 : 0),
        textBytes: stats.textBytes + (file.isImage ? 0 : file.content.length),
      }),
      { fileCount: 0, imageCount: 0, textBytes: 0 },
    );

    this.dProgress = 0;

    const len = files.length + 1;
    for (let i = 0; i < files.length; i++) {
      this.dProgress = ((i + 1) / parseFloat(len.toString())) * 100;
      const file = files[i];
      const path = this.tempPath + '/' + file.path;
      if (file.isImage) {
        try {
          if (isInternalStorage(file.content)) {
            await copyFile(file.content, path);
          } else {
            await FileSystem.fetch(file.content, { path });
          }
        } catch (e: any) {
          console.error(`[EpubBuilder] [Error] ${e.message}`);
          // Silently skip images that fail to copy (e.g. file not found)
          continue;
        }
      } else {
        // Write ALL text files including mimetype
        await writeFile(path, file.content);
      }
      if (this.outputPath) {
        EpubBuilder.onProgress?.(this.dProgress, epubFileName, 'SaveFile');
        if (this.onSaveProgress) {
          await this.onSaveProgress?.(this.dProgress, epubFileName, 'SaveFile');
        }
      }
    }
  }
}
