import ConfirmationDialog from '@components/ConfirmationDialog/ConfirmationDialog';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Linking, View } from 'react-native';
import {
  EnrichedMarkdownText,
  type LinkPressEvent,
  type MarkdownStyle,
} from 'react-native-enriched-markdown';

interface MarkdownTextProps {
  markdown: string;
  theme: ThemeColors;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({
  markdown,
  theme,
  onLayout,
}) => {
  const [width, setWidth] = useState(200);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const textColor = theme.onSurfaceVariant;

  const markdownStyle: MarkdownStyle = useMemo(
    () => ({
      paragraph: {
        color: textColor,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
        marginTop: 0,
      },
      h1: {
        color: theme.onSurface,
        fontSize: 22,
        fontWeight: 'bold',
        lineHeight: 28,
        marginBottom: 10,
        marginTop: 2,
      },
      h2: {
        color: theme.onSurface,
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
        marginBottom: 8,
        marginTop: 10,
      },
      h3: {
        color: theme.onSurface,
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 22,
        marginBottom: 6,
        marginTop: 8,
      },
      h4: {
        color: theme.onSurface,
        fontSize: 15,
        fontWeight: 'bold',
        lineHeight: 21,
        marginBottom: 6,
        marginTop: 8,
      },
      h5: {
        color: theme.onSurface,
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 20,
        marginBottom: 6,
        marginTop: 8,
      },
      h6: {
        color: textColor,
        fontSize: 13,
        fontWeight: 'bold',
        lineHeight: 18,
        marginBottom: 6,
        marginTop: 8,
      },
      blockquote: {
        backgroundColor: theme.surfaceVariant,
        borderColor: theme.outlineVariant,
        borderWidth: 3,
        color: textColor,
        fontSize: 14,
        gapWidth: 10,
        lineHeight: 20,
        marginBottom: 8,
      },
      list: {
        bulletColor: theme.primary,
        color: textColor,
        fontSize: 14,
        gapWidth: 8,
        lineHeight: 20,
        marginBottom: 8,
        marginLeft: 18,
        markerColor: theme.primary,
      },
      code: {
        backgroundColor: theme.surfaceVariant,
        borderColor: theme.outlineVariant,
        color: theme.onSurface,
        fontSize: 13,
      },
      codeBlock: {
        backgroundColor: theme.surfaceVariant,
        borderColor: theme.outlineVariant,
        borderRadius: 6,
        borderWidth: 1,
        color: theme.onSurface,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
        padding: 10,
      },
      link: {
        color: theme.primary,
        underline: true,
      },
      image: {
        borderRadius: 6,
        height: width,
        marginBottom: 8,
        marginTop: 4,
      },
      thematicBreak: {
        color: theme.outlineVariant,
        height: 1,
        marginBottom: 8,
        marginTop: 8,
      },
      table: {
        borderColor: theme.outlineVariant,
        borderRadius: 6,
        borderWidth: 1,
        cellPaddingHorizontal: 10,
        cellPaddingVertical: 8,
        color: textColor,
        fontSize: 13,
        headerBackgroundColor: theme.surfaceVariant,
        headerTextColor: theme.onSurface,
        lineHeight: 18,
        marginBottom: 8,
        rowEvenBackgroundColor: theme.background,
        rowOddBackgroundColor: theme.surface,
      },
    }),
    [
      textColor,
      theme.background,
      theme.onSurface,
      theme.outlineVariant,
      theme.primary,
      theme.surface,
      theme.surfaceVariant,
      width,
    ],
  );

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(Math.max(0, Math.round(event.nativeEvent.layout.width)));
  }, []);

  const handleLinkPress = useCallback(({ url }: LinkPressEvent) => {
    setExternalUrl(url);
  }, []);

  const handleOpenExternalLink = useCallback(() => {
    if (externalUrl) {
      Linking.openURL(externalUrl);
    }
  }, [externalUrl]);

  const dismissExternalLinkDialog = useCallback(() => {
    setExternalUrl(null);
  }, []);

  return (
    <>
      <View onLayout={handleContainerLayout}>
        <EnrichedMarkdownText
          markdown={markdown}
          markdownStyle={markdownStyle}
          flavor="github"
          selectable={false}
          onLinkPress={handleLinkPress}
          onLayout={onLayout}
        />
      </View>

      <ConfirmationDialog
        visible={externalUrl !== null}
        title={getString('externalLinkDialog.title')}
        message={getString('externalLinkDialog.message', {
          url: externalUrl ?? '',
        })}
        theme={theme}
        onSubmit={handleOpenExternalLink}
        onDismiss={dismissExternalLinkDialog}
      />
    </>
  );
};

export default MarkdownText;
