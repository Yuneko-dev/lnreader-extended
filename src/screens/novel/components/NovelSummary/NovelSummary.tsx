import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EnrichedMarkdownText,
  type LinkPressEvent,
  type MarkdownStyle,
} from 'react-native-enriched-markdown';

const COLLAPSED_LINE_COUNT = 3;
const SUMMARY_LINE_HEIGHT = 20;
const COLLAPSED_SUMMARY_HEIGHT = COLLAPSED_LINE_COUNT * SUMMARY_LINE_HEIGHT;
const OVERFLOW_THRESHOLD = 2;

interface NovelSummaryProps {
  summary: string;
  theme: ThemeColors;
}

const NovelSummary: React.FC<NovelSummaryProps> = ({ summary, theme }) => {
  const textColor = theme.onSurfaceVariant;

  const [expanded, setExpanded] = useState(false);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [summaryWidth, setSummaryWidth] = useState(200);

  const hasSummary = summary.trim().length > 0;
  const displaySummary = hasSummary
    ? summary
    : getString('novelScreen.noSummary');
  const hasMeasuredSummary = summaryHeight > 0;
  const isCollapsible =
    hasSummary &&
    (!hasMeasuredSummary ||
      summaryHeight > COLLAPSED_SUMMARY_HEIGHT + OVERFLOW_THRESHOLD);
  const shouldCollapse = isCollapsible && !expanded;

  const markdownStyle: MarkdownStyle = useMemo(
    () => ({
      paragraph: {
        color: textColor,
        fontSize: 14,
        lineHeight: SUMMARY_LINE_HEIGHT,
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
        lineHeight: SUMMARY_LINE_HEIGHT,
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
        lineHeight: SUMMARY_LINE_HEIGHT,
        marginBottom: 8,
      },
      list: {
        bulletColor: theme.primary,
        color: textColor,
        fontSize: 14,
        gapWidth: 8,
        lineHeight: SUMMARY_LINE_HEIGHT,
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
      /*
      strong: {
        color: theme.onSurface,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
      },
      em: {
        color: textColor,
        fontFamily: 'sans-serif',
        fontStyle: 'italic',
      },
      */
      image: {
        borderRadius: 6,
        height: summaryWidth,
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
      summaryWidth,
    ],
  );

  useEffect(() => {
    setExpanded(false);
    setSummaryHeight(0);
  }, [summary]);

  const toggleExpanded = useCallback(() => {
    if (hasSummary) {
      setExpanded(current => !current);
    }
  }, [hasSummary]);

  const handleSummaryLayout = useCallback((event: LayoutChangeEvent) => {
    setSummaryHeight(event.nativeEvent.layout.height);
  }, []);

  const handleMarkdownLayout = useCallback((event: LayoutChangeEvent) => {
    setSummaryWidth(Math.max(0, Math.round(event.nativeEvent.layout.width)));
  }, []);

  const handleLinkPress = useCallback(({ url }: LinkPressEvent) => {
    Linking.openURL(url);
  }, []);

  const bottom = expanded ? 0 : 4;
  const containerBottomPadding = isCollapsible && expanded ? 24 : 8;
  const opacity = expanded ? 1 : 0.7;

  return (
    <Pressable
      style={[
        styles.summaryContainer,
        { paddingBottom: containerBottomPadding },
      ]}
      onPress={toggleExpanded}
    >
      {hasSummary ? (
        <>
          <View
            style={[
              styles.markdownClip,
              shouldCollapse ? styles.markdownCollapsed : undefined,
            ]}
            onLayout={handleMarkdownLayout}
          >
            <EnrichedMarkdownText
              markdown={displaySummary}
              markdownStyle={markdownStyle}
              flavor="github"
              selectable={false}
              onLinkPress={handleLinkPress}
            />
          </View>
          <View
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.measurementContainer}
          >
            <EnrichedMarkdownText
              markdown={displaySummary}
              markdownStyle={markdownStyle}
              flavor="github"
              selectable={false}
              onLayout={handleSummaryLayout}
            />
          </View>
        </>
      ) : (
        <Text style={[styles.summaryText, { color: textColor }]}>
          {displaySummary}
        </Text>
      )}
      {isCollapsible ? (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: theme.background,
              bottom,
              opacity,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            color={theme.onBackground}
            size={24}
            style={[{ backgroundColor: theme.background }, styles.icon]}
          />
        </View>
      ) : null}
    </Pressable>
  );
};

export default NovelSummary;

const styles = StyleSheet.create({
  icon: {
    borderRadius: 50,
  },
  iconContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  summaryContainer: {
    marginBottom: 8,
    padding: 16,
    paddingTop: 8,
  },
  summaryText: {
    lineHeight: 20,
  },
  markdownClip: {
    overflow: 'hidden',
  },
  markdownCollapsed: {
    maxHeight: COLLAPSED_SUMMARY_HEIGHT,
  },
  measurementContainer: {
    left: 16,
    opacity: 0,
    position: 'absolute',
    right: 16,
    top: 8,
  },
});
