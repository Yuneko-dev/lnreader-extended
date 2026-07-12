import { IconButtonV2 } from '@components';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { NativeChapterSearch } from '../hooks/useNativeChapterSearch';

type ReaderSearchbarProps = {
  theme: ThemeColors;
  search: NativeChapterSearch;
};

const ReaderSearchbar = ({ theme, search }: ReaderSearchbarProps) => {
  const inputRef = useRef<TextInput>(null);
  const hasMatches = search.result.total > 0;
  const resultText = search.text
    ? search.result.isDoneCounting
      ? `${search.result.current}/${search.result.total}`
      : '…'
    : '';

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <View style={styles.container}>
      <IconButtonV2
        name="magnify"
        color={theme.onSurfaceVariant}
        onPress={() => inputRef.current?.focus()}
        padding={8}
        theme={theme}
      />
      <TextInput
        ref={inputRef}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={search.setSearchText}
        onSubmitEditing={search.submitSearch}
        placeholder={getString('readerScreen.findInChapter')}
        placeholderTextColor={theme.onSurfaceVariant}
        returnKeyType="search"
        selectionColor={theme.primary}
        style={[styles.input, { color: theme.onSurface }]}
        submitBehavior="submit"
        value={search.text}
      />
      <Text style={[styles.result, { color: theme.onSurfaceVariant }]}>
        {resultText}
      </Text>
      <IconButtonV2
        name="chevron-up"
        color={theme.onSurface}
        disabled={!hasMatches}
        onPress={() => search.findNext(false)}
        padding={8}
        theme={theme}
      />
      <IconButtonV2
        name="chevron-down"
        color={theme.onSurface}
        disabled={!hasMatches}
        onPress={() => search.findNext(true)}
        padding={8}
        theme={theme}
      />
      <IconButtonV2
        name="close"
        color={theme.onSurface}
        onPress={search.closeSearch}
        padding={8}
        theme={theme}
      />
    </View>
  );
};

export default React.memo(ReaderSearchbar);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minWidth: 48,
    paddingVertical: 0,
  },
  result: {
    fontSize: 13,
    minWidth: 44,
    textAlign: 'center',
  },
});
