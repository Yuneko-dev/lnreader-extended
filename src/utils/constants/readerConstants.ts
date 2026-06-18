import { ReaderTheme } from '@hooks/persisted/useSettings';
import { MaterialDesignIconName } from '@type/icon';

export const presetReaderThemes: ReaderTheme[] = [
  { backgroundColor: '#eae4d3', textColor: '#111111' },
  { backgroundColor: '#f5f5fa', textColor: '#111111' },
  { backgroundColor: '#F7DFC6', textColor: '#593100' },
  { backgroundColor: '#dce5e2', textColor: '#000000' },
  { backgroundColor: '#292832', textColor: '#CCCCCC' },
  {
    backgroundColor: '#000000',
    textColor: '#FFFFFFB3',
  },
];

interface TextAlignments {
  value: string;
  icon: MaterialDesignIconName;
}

export const textAlignments: TextAlignments[] = [
  { value: 'left', icon: 'format-align-left' },
  { value: 'center', icon: 'format-align-center' },
  { value: 'justify', icon: 'format-align-justify' },
  { value: 'right', icon: 'format-align-right' },
];

export interface Font {
  fontFamily: string;
  name: string;
}

export const readerFonts: Font[] = [
  { fontFamily: '', name: 'Original' },
  { fontFamily: 'lora', name: 'Lora' },
  { fontFamily: 'nunito', name: 'Nunito' },
  { fontFamily: 'noto-sans', name: 'Noto Sans' },
  { fontFamily: 'open-sans', name: 'Open Sans' },
  { fontFamily: 'arbutus-slab', name: 'Arbutus Slab' },
  { fontFamily: 'domine', name: 'Domine' },
  { fontFamily: 'lato', name: 'Lato' },
  { fontFamily: 'pt-serif', name: 'PT Serif' },
  { fontFamily: 'OpenDyslexic3-Regular', name: 'OpenDyslexic' },
  // Add more fonts (#1)
  { fontFamily: 'Bookerly-Regular', name: 'Bookerly' },
  { fontFamily: 'georgia', name: 'Georgia' },
  { fontFamily: 'Literata', name: 'Literata' },
  { fontFamily: 'Palatino_Linotype', name: 'Palatino' },
  { fontFamily: 'Times_New_Roman', name: 'Times New Roman' },
  // Add more fonts (#2)
  { fontFamily: 'BeVietnamPro-Regular', name: 'Be Vietnam Pro' },
  // #region https://github.com/nicoverbruggen/ebook-fonts
  { fontFamily: 'NV_Cardo-Regular', name: 'NV Cardo' },
  { fontFamily: 'NV_Cooper-Regular', name: 'NV Cooper' },
  { fontFamily: 'NV_Garamond-Regular', name: 'NV Garamond' },
  { fontFamily: 'NV_Legible_Next-Regular', name: 'NV Legible' },
  { fontFamily: 'NV_Libertinus-Regular', name: 'NV Libertinus' },
  { fontFamily: 'NV_NinePoint-Regular', name: 'NV NinePoint' },
  { fontFamily: 'NV_Technical-Regular', name: 'NV Technical' },
  { fontFamily: 'Readerly-Regular', name: 'Readerly' },
  // #endregion
];
