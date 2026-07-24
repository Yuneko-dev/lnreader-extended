import { NitroModules } from 'react-native-nitro-modules'
import type { Epub } from './specs/Epub.nitro'

export const epub = NitroModules.createHybridObject<Epub>('Epub')

export type { Epub } from './specs/Epub.nitro'
export type { EpubChapter } from './types/EpubChapter'
export type { EpubExportChapter } from './types/EpubExportChapter'
export type { EpubExportMetadata } from './types/EpubExportMetadata'
export type { EpubExportResult } from './types/EpubExportResult'
export type { EpubNovel } from './types/EpubNovel'
