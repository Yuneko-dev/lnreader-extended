import { useTheme } from '@hooks/persisted';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface DialogTitleProps {
  title: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ title }) => {
  const theme = useTheme();

  return (
    <Text style={[styles.dialogTitle, { color: theme.onSurface }]}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  dialogTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
});
