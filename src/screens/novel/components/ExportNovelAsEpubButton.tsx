import React, { useMemo } from 'react';
import { Portal } from 'react-native-paper';
import { StatusBar, StyleProp, ViewStyle } from 'react-native';

import { NovelInfo } from '@database/types';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { useBoolean } from '@hooks/index';
import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';

import ExportEpubModal from './ExportEpubModal';
import ExportEpubLogsModal from './ExportEpubLogsModal';
import { MaterialDesignIconName } from '@type/icon';

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
    startChapter?: number;
    endChapter?: number;
  }>();

  const readerSettings = useChapterReaderSettings();
  const {
    epubUseAppTheme = false,
    epubUseCustomCSS = false,
    epubUseCustomJS = false,
  } = readerSettings;

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
      ? readerSettings.customCSS
          .replace(RegExp(`#sourceId-${novel.pluginId}\\s*\\{`, 'g'), 'body {')
          .replace(RegExp(`#sourceId-${novel.pluginId}[^.#A-Z]*`, 'gi'), '')
      : '';

    return appThemeStyles + customStyles;
  }, [novel, epubUseAppTheme, epubUseCustomCSS, readerSettings, theme.primary]);

  const epubJavaScript = useMemo(() => {
    if (!novel) {
      return '';
    }

    return `
      let novelName = "${novel.name}";
      let chapterName = "";
      let sourceId = ${novel.pluginId};
      let chapterId = "";
      let novelId = ${novel.id};
      let html = document.querySelector("chapter").innerHTML;
      
      ${readerSettings.customJS}
    `;
  }, [novel, readerSettings]);

  const handleExportSubmit = (
    destinationUri: string,
    startChapter?: number,
    endChapter?: number,
  ) => {
    if (!novel) {
      showToast(getString('novelScreen.epub.noNovelSelected'));
      return;
    }

    setExportParams({ destinationUri, startChapter, endChapter });
    hideModal();
    setLogsModalVisible(true);
  };

  return (
    <>
      <IconComponent icon="book-arrow-down-outline" onPress={showModal} />
      <Portal>
        <ExportEpubModal
          isVisible={isModalVisible}
          hideModal={hideModal}
          onSubmit={handleExportSubmit}
        />
        {novel && exportParams && (
          <ExportEpubLogsModal
            visible={logsModalVisible}
            onDismiss={() => setLogsModalVisible(false)}
            novel={novel}
            destinationUri={exportParams.destinationUri}
            startChapter={exportParams.startChapter}
            endChapter={exportParams.endChapter}
            epubStylesheet={epubStylesheet}
            epubJavaScript={epubJavaScript}
            epubUseCustomJS={epubUseCustomJS}
          />
        )}
      </Portal>
    </>
  );
};

export default ExportNovelAsEpubButton;
