import { MarkdownText } from '@components';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
          >
            <MarkdownText markdown={displaySummary} theme={theme} />
          </View>
          <View
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.measurementContainer}
          >
            <MarkdownText
              markdown={displaySummary}
              theme={theme}
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
