import { EpubChapter, File, InternalEpubChapter } from '../../types';

/**
 * Creates a file object with the specified path, content, and optional isImage flag.
 *
 * @param {string} path - The file path.
 * @param {string} content - The content of the file.
 * @param {boolean} [isImage] - Optional flag indicating whether the file is an image.
 * @returns {File} - The created file object.
 */
export function createFile(
  path: string,
  content: string,
  isImage?: boolean,
): File {
  return {
    path,
    content,
    isImage,
  };
}

/**
 * Checks if all the items in the `content` array can be found in the `file` array.
 *
 * @param file - An array of File objects.
 * @param content - An array of strings representing the content to search for in the file paths.
 * @returns A boolean value indicating whether all items in the `content` array are found in the `file` array.
 */
export function isValid(file: File[], content: string[]): boolean {
  for (var i = 0; i < content.length; i++) {
    var item = file.find(x => x.path.indexOf(content[i]) !== -1);
    if (!item) {
      return false;
    }
  }
  return true;
}

/**
 * Delays the execution of code for a specified amount of time.
 * @param time The number of milliseconds to sleep.
 * @param args Additional arguments to be resolved with the Promise.
 * @returns A Promise that resolves after the specified time with the provided arguments.
 */
export function sleep(time: number, args?: any) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(args);
    }, time);
  }) as Promise<any>;
}

/**
 * Returns the first element of an array if it exists, otherwise returns undefined.
 *
 * @param array - The array to extract the first element from.
 * @returns The first element of the array, or undefined if the array is empty or does not exist.
 */
export function single(array: any) {
  if (array && array.length !== undefined && array.length > 0) {
    return array[0];
  }

  return undefined;
}

/**
 * Parses a JSON string and returns the parsed JSON object.
 *
 * @param json - The JSON string to be parsed.
 * @returns The parsed JSON object.
 * @throws If there is an error while parsing the JSON string.
 * @throws If the input JSON string is null, empty, or has a length less than or equal to 4.
 */
export function parseJSon(json: string) {
  if (json === null || !json || json.length <= 4) {
    return undefined;
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    throw e;
  }
}

/**
 * Extracts a JSON string from the given content by searching for a specific pattern and removing the surrounding tags.
 *
 * @param content The content string to extract the JSON from.
 * @returns The extracted JSON string, or an empty string if no JSON is found.
 */
export function jsonExtractor(content: string) {
  const jsonReg = new RegExp(/<JSON>(.|\n)*?<\/JSON>/, 'mgi');
  return (single(jsonReg.exec(content)) ?? '')
    .replace(/<JSON>/gim, '')
    .replace(/<\/JSON>/gim, '');
}

/**
 * Extracts the content within the <body> tags from the given HTML content.
 *
 * @param content The HTML content to extract the body content from.
 * @returns The extracted body content without the <body> tags.
 */
export function bodyExtrator(content: string) {
  const jsonReg = new RegExp(/<body>(.|\n)*?<\/body>/, 'mgi');
  return (single(jsonReg.exec(content)) ?? '')
    .replace(/<body>/gim, '')
    .replace(/<\/body>/gim, '');
}

/**
 * Returns the file extension of an image file based on the provided path.
 * If the file extension is not found, it returns "jpg" as the default value.
 *
 * @param path - The path of the image file.
 * @returns The file extension of the image file or "jpg" as the default value.
 *
 * @example
 * const path = "images/image.jpg";
 * const imageType = getImageType(path);
 * console.log(imageType); // Output: "jpg"
 */
export function getImageType(path: string) {
  return path.trim().match(/(?<=\.)[a-z]{1,4}(?=\?|$)/)?.[0] ?? 'jpg';
}

/**
 * Removes the .epub or .opf file extension from a given string.
 *
 * @param name - The string from which the file extension needs to be removed.
 * @returns The modified string without the file extension.
 *
 * @example
 * const fileName = "example.opf";
 * const result = removeFileExtension(fileName);
 * console.log(result); // Output: "example"
 */
export function removeFileExtension(name: string) {
  return name.replace(/(.*)(\.opf|\.epub)/, '$1');
}

/**
 * Removes all non-word and non-space characters from a given file name.
 *
 * @param fileName - The file name to sanitize.
 * @returns The sanitized file name.
 *
 * @example
 * const fileName = "my_file!@#.txt";
 * const sanitizedFileName = sanitizeFileName(fileName);
 * console.log(sanitizedFileName); // Output: "my_filetxt"
 */
export function sanitizeFileName(fileName: string) {
  return fileName.replace(/ /g, '_').replace(/[^\w]/gi, ''); // remove all non-word and non-space characters
}

/**
 * Modifies the file names of the given array of EpubChapter objects.
 * If a chapter has a fileName property, the ".xhtml" extension is removed.
 * If a chapter does not have a fileName property, it is set to the chapter's title.
 * The modified file names are prefixed with "content/" and spaces are replaced with underscores.
 * If there are duplicate file names, a number is appended to make them unique.
 *
 * @param chapters - The array of EpubChapter objects to modify.
 * @returns The modified array of EpubChapter objects with the file names updated.
 */
export function setChapterFileNames(
  chapters: EpubChapter[],
): InternalEpubChapter[] {
  const usedNames = new Set<string>();
  const sanitizedChapters = chapters.map((chapter: EpubChapter) => {
    const newChapter: InternalEpubChapter = {
      fileName: chapter.fileName
        ? chapter.fileName.replace('.xhtml', '')
        : chapter.title,
      title: chapter.title,
      htmlBody: chapter.htmlBody,
      parameter: chapter.parameter,
    };
    newChapter.fileName = sanitizeFileName(newChapter.fileName);
    return newChapter;
  });
  return sanitizedChapters.map((chapter: InternalEpubChapter) => {
    let fileName = 'content/' + chapter.fileName.replace(/ /g, '_') + '.xhtml';
    let j = 1;
    while (usedNames.has(fileName)) {
      fileName = fileName.replace(/(\d+)?\.xhtml$/, `${j}.xhtml`);
      j++;
    }
    usedNames.add(fileName);
    chapter.fileName = fileName;

    return chapter;
  });
}
