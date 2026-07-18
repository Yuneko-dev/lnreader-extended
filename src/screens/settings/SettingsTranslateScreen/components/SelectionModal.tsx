import { Button, Modal } from '@components';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Portal, RadioButton as PaperRadioButton } from 'react-native-paper';

export interface SelectionOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

interface SelectionModalProps<T extends string> {
  currentValue?: T;
  emptyMessage?: string;
  onDismiss: () => void;
  onSelect: (value: T) => void;
  options: readonly SelectionOption<T>[];
  title: string;
  visible: boolean;
}

export default function SelectionModal<T extends string>({
  currentValue,
  emptyMessage,
  onDismiss,
  onSelect,
  options,
  title,
  visible,
}: SelectionModalProps<T>) {
  const theme = useTheme();

  const selectOption = (value: T) => {
    onSelect(value);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {options.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {emptyMessage}
            </Text>
          ) : (
            options.map(option => {
              const selected = option.value === currentValue;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  android_ripple={{ color: theme.rippleColor }}
                  key={option.value}
                  onPress={() => selectOption(option.value)}
                  style={styles.option}
                >
                  <PaperRadioButton
                    color={theme.primary}
                    status={selected ? 'checked' : 'unchecked'}
                    uncheckedColor={theme.onSurfaceVariant}
                    value={option.value}
                  />
                  <View style={styles.optionTextContainer}>
                    <Text
                      numberOfLines={1}
                      style={[styles.optionLabel, { color: theme.onSurface }]}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.optionDescription,
                          { color: theme.onSurfaceVariant },
                        ]}
                      >
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <Button
          mode="text"
          onPress={onDismiss}
          style={styles.cancelButton}
          title={getString('common.cancel')}
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  cancelButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 24,
    textAlign: 'center',
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    paddingVertical: 4,
  },
  modal: {
    maxHeight: '80%',
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionLabel: {
    fontSize: 16,
    lineHeight: 24,
  },
  optionTextContainer: {
    flex: 1,
    marginStart: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 12,
  },
});
