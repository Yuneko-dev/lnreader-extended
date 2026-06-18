import { TurboModule, TurboModuleRegistry } from 'react-native';

interface ReadDirResult {
  name: string;
  path: string;
  isDirectory: boolean; // int
}

export interface Spec extends TurboModule {
  writeFile: (path: string, content: string) => void;
  readFile: (path: string) => string;
  copyFile: (sourcePath: string, destPath: string) => void;
  moveFile: (sourcePath: string, destPath: string) => void;
  exists: (filePath: string) => boolean;
  /**
   * @description create parents, and do nothing if exists;
   */
  mkdir: (filePath: string) => void;
  /**
   * @description remove recursively
   */
  unlink: (filePath: string) => void;
  readDir: (dirPath: string) => ReadDirResult[];
  getFileSize: (path: string) => number;
  getFreeSpace: () => number;
  /**
   * Detect actual image MIME type by reading magic bytes.
   * Returns standard MIME type string (e.g. "image/jpeg", "image/png").
   * Returns "application/octet-stream" if unknown.
   */
  detectImageMimeType: (filePath: string) => string;
  downloadFile: (
    url: string,
    destPath: string,
    method: string,
    headers: { [key: string]: string } | Headers,
    body?: string,
  ) => Promise<void>;
  getConstants: () => {
    ExternalDirectoryPath: string;
    ExternalCachesDirectoryPath: string;
    CachesDirectoryPath?: string;
    TotalSpace: number;
    FreeSpace: number;
    StoragePath: string;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeFile');
