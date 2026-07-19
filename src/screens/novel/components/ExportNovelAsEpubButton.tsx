import { NovelInfo } from '@database/types';
import { useBoolean } from '@hooks/index';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { MaterialDesignIconName } from '@type/icon';
import {
  composeCSS,
  composeJS,
  serializeInlineScriptValue,
} from '@utils/customCode';
import { showToast } from '@utils/showToast';
import React, { useMemo } from 'react';
import { StatusBar, StyleProp, ViewStyle } from 'react-native';

import ExportEpubLogsModal from './ExportEpubLogsModal';
import ExportEpubModal from './ExportEpubModal';

interface ExportNovelAsEpubButtonProps {
  novel?: NovelInfo;
  iconComponent: (props: {
    icon: MaterialDesignIconName;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    size?: number;
  }) => React.JSX.Element;
}

const ExportNovelAsEpubButton: React.FC<ExportNovelAsEpubButtonProps> = ({
  novel,
  iconComponent: IconComponent,
}) => {
  const theme = useTheme();

  const {
    value: isModalVisible,
    setTrue: showModal,
    setFalse: hideModal,
  } = useBoolean(false);

  const [logsModalVisible, setLogsModalVisible] = React.useState(false);
  const [exportParams, setExportParams] = React.useState<{
    destinationUri: string;
    fileName: string;
    startChapter?: number;
    endChapter?: number;
  }>();

  const readerSettings = useChapterReaderSettings();
  const {
    epubUseAppTheme = false,
    epubUseCustomCSS = false,
    epubUseCustomJS = false,
  } = readerSettings;
  const customCSS = useMemo(
    () => composeCSS(readerSettings.codeSnippetsCSS),
    [readerSettings.codeSnippetsCSS],
  );
  const customJS = useMemo(
    () => composeJS(readerSettings.codeSnippetsJS),
    [readerSettings.codeSnippetsJS],
  );

  const epubStylesheet = useMemo(() => {
    if (!novel) {
      return '';
    }

    const appThemeStyles = epubUseAppTheme
      ? `
      html {
        scroll-behavior: smooth;
        overflow-x: hidden;
        padding-top: ${StatusBar.currentHeight};
        word-wrap: break-word;
      }
      body {
        padding-left: ${readerSettings.padding}%;
        padding-right: ${readerSettings.padding}%;
        padding-bottom: 40px;
        font-size: ${readerSettings.textSize}px;
        color: ${readerSettings.textColor};
        text-align: ${readerSettings.textAlign};
        line-height: ${readerSettings.lineHeight};
        font-family: "${readerSettings.fontFamily}";
        background-color: "${readerSettings.theme}";
      }
      hr {
        margin-top: 20px;
        margin-bottom: 20px;
      }
      a {
        color: ${theme.primary};
      }
      img {
        display: block;
        width: auto;
        height: auto;
        max-width: 100%;
      }`
      : '';

    const customStyles = epubUseCustomCSS
      ? customCSS
          .replace(RegExp(`#sourceId-${novel.pluginId}\\s*\\{`, 'g'), 'body {')
          .replace(RegExp(`#sourceId-${novel.pluginId}[^.#A-Z]*`, 'gi'), '')
      : '';

    return appThemeStyles + customStyles;
  }, [
    customCSS,
    novel,
    epubUseAppTheme,
    epubUseCustomCSS,
    readerSettings,
    theme.primary,
  ]);

  const epubJavaScript = useMemo(() => {
    if (!novel) {
      return '';
    }

    return `
      const novelName = ${serializeInlineScriptValue(novel.name)};
      const chapterName = "";
      const sourceId = ${serializeInlineScriptValue(novel.pluginId)};
      const chapterId = "";
      const novelId = ${novel.id};
      const chapterElement = document.querySelector("[data-epub-chapter]");
      
      ${customJS}
    `;
  }, [customJS, novel]);

  const handleExportSubmit = (
    destinationUri: string,
    fileName: string,
    startChapter?: number,
    endChapter?: number,
  ) => {
    if (!novel) {
      showToast(getString('novelScreen.epub.noNovelSelected'));
      return;
    }

    setExportParams({ destinationUri, fileName, startChapter, endChapter });
    hideModal();
    setLogsModalVisible(true);
  };

  return (
    <>
      <IconComponent icon="book-arrow-down-outline" onPress={showModal} />
      <ExportEpubModal
        isVisible={isModalVisible}
        novelName={novel?.name}
        hideModal={hideModal}
        onSubmit={handleExportSubmit}
      />
      {novel && exportParams && (
        <ExportEpubLogsModal
          visible={logsModalVisible}
          onDismiss={() => setLogsModalVisible(false)}
          novel={novel}
          destinationUri={exportParams.destinationUri}
          fileName={exportParams.fileName}
          startChapter={exportParams.startChapter}
          endChapter={exportParams.endChapter}
          epubStylesheet={epubStylesheet}
          epubJavaScript={epubJavaScript}
          epubUseCustomJS={epubUseCustomJS}
        />
      )}
    </>
  );
};

export default ExportNovelAsEpubButton;
