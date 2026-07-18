import {
  Button,
  Checkbox,
  KeyboardAvoidingModal,
  Menu,
  StableTextInput,
} from '@components';
import { useBoolean } from '@hooks';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import {
  compileRegex,
  REGEX_FLAGS,
  type RegexReplacement,
  runRegexReplacement,
} from '@utils/customCode';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HelperText } from 'react-native-paper';

type Props = {
  visible: boolean;
  initialRule?: RegexReplacement;
  onDismiss: () => void;
  onSave: (rule: RegexReplacement) => void;
};

const regexFlagLabels = {
  g: 'customCodeSettings.regexFlag.g',
  i: 'customCodeSettings.regexFlag.i',
  m: 'customCodeSettings.regexFlag.m',
  s: 'customCodeSettings.regexFlag.s',
  u: 'customCodeSettings.regexFlag.u',
  y: 'customCodeSettings.regexFlag.y',
} as const;

const RegexDialog = ({ visible, initialRule, onDismiss, onSave }: Props) => {
  const theme = useTheme();
  const {
    value: flagsMenuVisible,
    setTrue: openFlagsMenu,
    setFalse: closeFlagsMenu,
  } = useBoolean(false);
  const [title, setTitle] = useState('');
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [replacement, setReplacement] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [testOutput, setTestOutput] = useState<string>();
  const [regexError, setRegexError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialRule?.title ?? '');
      setPattern(initialRule?.pattern ?? '');
      setFlags(initialRule?.flags ?? 'g');
      setReplacement(initialRule?.replacement ?? '');
      setSampleInput('');
      setTestOutput(undefined);
      setRegexError('');
      setSubmitted(false);
      closeFlagsMenu();
    }
  }, [closeFlagsMenu, initialRule, visible]);

  const toggleFlag = (flag: (typeof REGEX_FLAGS)[number]) => {
    setFlags(current =>
      REGEX_FLAGS.filter(value =>
        value === flag ? !current.includes(value) : current.includes(value),
      ).join(''),
    );
    setTestOutput(undefined);
    setRegexError('');
  };

  const buildRule = (): RegexReplacement => ({
    title: title.trim(),
    pattern,
    flags,
    replacement,
    active: initialRule?.active ?? true,
  });

  const validatePattern = () => {
    try {
      compileRegex(pattern, flags);
      setRegexError('');
      return true;
    } catch (error) {
      setRegexError(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const runTest = () => {
    if (!pattern) {
      setRegexError(getString('customCodeSettings.patternRequired'));
      setTestOutput(undefined);
      return;
    }
    if (!validatePattern()) {
      setTestOutput(undefined);
      return;
    }

    setTestOutput(runRegexReplacement(sampleInput, buildRule()));
  };

  const save = () => {
    setSubmitted(true);
    if (!title.trim() || !pattern || !validatePattern()) return false;

    onSave(buildRule());
    return true;
  };

  return (
    <KeyboardAvoidingModal
      contentContainerStyle={styles.content}
      onConfirm={save}
      onDismiss={onDismiss}
      title={getString(
        initialRule
          ? 'customCodeSettings.editRegexRule'
          : 'customCodeSettings.addRegexRule',
      )}
      visible={visible}
    >
      <StableTextInput
        error={submitted && !title.trim()}
        label={getString('customCodeSettings.ruleTitle')}
        mode="outlined"
        onChangeText={setTitle}
        value={title}
      />
      <HelperText
        type="error"
        visible={submitted && !title.trim()}
        theme={{ colors: theme }}
      >
        {getString('customCodeSettings.titleRequired')}
      </HelperText>

      <View style={styles.expressionRow}>
        <Text style={[styles.slash, { color: theme.onSurface }]}>/</Text>
        <StableTextInput
          autoCapitalize="none"
          autoCorrect={false}
          error={(submitted && !pattern) || Boolean(regexError)}
          label={getString('customCodeSettings.regexPattern')}
          mode="outlined"
          onChangeText={value => {
            setPattern(value);
            setRegexError('');
            setTestOutput(undefined);
          }}
          spellCheck={false}
          style={styles.pattern}
          value={pattern}
        />
        <Menu
          anchor={
            <Pressable
              accessibilityLabel={getString('customCodeSettings.regexFlags')}
              accessibilityRole="button"
              android_ripple={{ color: theme.rippleColor }}
              onPress={openFlagsMenu}
              style={styles.flagsAnchor}
            >
              <Text style={[styles.flags, { color: theme.primary }]}>
                /{flags}
              </Text>
            </Pressable>
          }
          onDismiss={closeFlagsMenu}
          visible={flagsMenuVisible}
        >
          {REGEX_FLAGS.map(flag => (
            <Checkbox
              key={flag}
              label={getString(regexFlagLabels[flag])}
              onPress={() => toggleFlag(flag)}
              status={flags.includes(flag)}
              theme={theme}
            />
          ))}
        </Menu>
      </View>
      <HelperText
        type="error"
        visible={(submitted && !pattern) || Boolean(regexError)}
        theme={{ colors: theme }}
      >
        {regexError || getString('customCodeSettings.patternRequired')}
      </HelperText>

      <StableTextInput
        autoCapitalize="none"
        autoCorrect={false}
        label={getString('customCodeSettings.replaceWith')}
        mode="outlined"
        onChangeText={value => {
          setReplacement(value);
          setTestOutput(undefined);
        }}
        value={replacement}
      />
      <HelperText type="info" visible theme={{ colors: theme }}>
        {getString('customCodeSettings.emptyReplacementHint')}
      </HelperText>

      <Text style={[styles.testTitle, { color: theme.onSurface }]}>
        {getString('customCodeSettings.testRegex')}
      </Text>
      <StableTextInput
        label={getString('customCodeSettings.sampleInput')}
        mode="outlined"
        multiline
        numberOfLines={3}
        onChangeText={value => {
          setSampleInput(value);
          setTestOutput(undefined);
        }}
        value={sampleInput}
      />
      <Button
        mode="outlined"
        onPress={runTest}
        title={getString('customCodeSettings.runTest')}
      />
      {testOutput !== undefined ? (
        <View
          style={[styles.output, { backgroundColor: theme.surfaceVariant }]}
        >
          <Text style={[styles.outputLabel, { color: theme.primary }]}>
            {getString('customCodeSettings.testOutput')}
          </Text>
          <Text selectable style={{ color: theme.onSurface }}>
            {testOutput || getString('customCodeSettings.emptyOutput')}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingModal>
  );
};

export default React.memo(RegexDialog);

const styles = StyleSheet.create({
  content: { gap: 4 },
  expressionRow: { alignItems: 'center', flexDirection: 'row' },
  flags: { fontFamily: 'monospace', fontSize: 16, fontWeight: '600' },
  flagsAnchor: {
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 8,
  },
  output: { borderRadius: 12, gap: 4, padding: 12 },
  outputLabel: { fontSize: 12, fontWeight: '600' },
  pattern: { flex: 1 },
  slash: { fontFamily: 'monospace', fontSize: 20, marginEnd: 8 },
  testTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
});
