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
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Icon, Text } from 'react-native-paper';

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
  const inputTheme = {
    colors: {
      background: theme.surface,
      error: theme.error,
      onSurface: theme.onSurface,
      onSurfaceVariant: theme.onSurfaceVariant,
      outline: theme.outline,
      primary: theme.primary,
    },
  };

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
      <View style={styles.field}>
        <StableTextInput
          error={submitted && !title.trim()}
          label={getString('customCodeSettings.ruleTitle')}
          mode="outlined"
          onChangeText={setTitle}
          style={styles.input}
          textColor={theme.onSurface}
          theme={inputTheme}
          value={title}
        />
        {submitted && !title.trim() ? (
          <HelperText type="error" visible theme={{ colors: theme }}>
            {getString('customCodeSettings.titleRequired')}
          </HelperText>
        ) : null}
      </View>

      <View style={styles.field}>
        <View style={styles.expressionRow}>
          <Text
            variant="titleMedium"
            style={[styles.slash, { color: theme.onSurfaceVariant }]}
          >
            /
          </Text>
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
            style={[styles.input, styles.pattern]}
            textColor={theme.onSurface}
            theme={inputTheme}
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
                <Text
                  variant="labelLarge"
                  style={[styles.slash, { color: theme.primary }]}
                >
                  /{flags}
                </Text>
              </Pressable>
            }
            contentStyle={{ backgroundColor: theme.surface }}
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
        {(submitted && !pattern) || regexError ? (
          <HelperText type="error" visible theme={{ colors: theme }}>
            {regexError || getString('customCodeSettings.patternRequired')}
          </HelperText>
        ) : null}
      </View>

      <View style={styles.field}>
        <StableTextInput
          autoCapitalize="none"
          autoCorrect={false}
          label={getString('customCodeSettings.replaceWith')}
          mode="outlined"
          onChangeText={value => {
            setReplacement(value);
            setTestOutput(undefined);
          }}
          style={styles.input}
          textColor={theme.onSurface}
          theme={inputTheme}
          value={replacement}
        />
        <Text
          variant="bodySmall"
          style={[styles.supportingText, { color: theme.onSurfaceVariant }]}
        >
          {getString('customCodeSettings.emptyReplacementHint')}
        </Text>
      </View>

      <View
        testID="regex-test-section"
        style={[styles.testSection, { backgroundColor: theme.surfaceVariant }]}
      >
        <View style={styles.testHeader}>
          <Icon source="test-tube" color={theme.onSurfaceVariant} size={20} />
          <Text variant="titleSmall" style={{ color: theme.onSurface }}>
            {getString('customCodeSettings.testRegex')}
          </Text>
        </View>
        <StableTextInput
          label={getString('customCodeSettings.sampleInput')}
          mode="outlined"
          multiline
          numberOfLines={3}
          onChangeText={value => {
            setSampleInput(value);
            setTestOutput(undefined);
          }}
          style={[styles.input, styles.sampleInput]}
          textColor={theme.onSurface}
          theme={inputTheme}
          value={sampleInput}
        />
        <Button
          icon="progress-check"
          mode="contained-tonal"
          onPress={runTest}
          title={getString('customCodeSettings.runTest')}
        />
        {testOutput !== undefined ? (
          <View style={[styles.output, { backgroundColor: theme.surface }]}>
            <Text variant="labelMedium" style={{ color: theme.primary }}>
              {getString('customCodeSettings.testOutput')}
            </Text>
            <Text
              selectable
              variant="bodyMedium"
              style={{ color: theme.onSurface }}
            >
              {testOutput || getString('customCodeSettings.emptyOutput')}
            </Text>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingModal>
  );
};

export default React.memo(RegexDialog);

const styles = StyleSheet.create({
  content: { gap: 16 },
  expressionRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  field: { gap: 0 },
  flagsAnchor: {
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 52,
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  input: { backgroundColor: 'transparent' },
  output: { borderRadius: 12, gap: 6, padding: 12 },
  pattern: { flex: 1 },
  sampleInput: { minHeight: 96 },
  slash: { marginTop: 10, fontSize: 16 },
  supportingText: { marginStart: 16, marginTop: 16, marginEnd: 16 },
  testHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  testSection: { borderRadius: 16, gap: 12, padding: 16 },
});
