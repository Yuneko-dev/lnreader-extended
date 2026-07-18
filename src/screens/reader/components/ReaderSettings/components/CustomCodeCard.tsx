import type { ThemeColors } from '@theme/types';
import React from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, IconButton } from 'react-native-paper';

type Props = {
  title: string;
  description: string;
  detail?: string;
  active: boolean;
  editLabel: string;
  deleteLabel: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  theme: ThemeColors;
};

const CustomCodeCard = ({
  title,
  description,
  detail,
  active,
  editLabel,
  deleteLabel,
  onToggle,
  onEdit,
  onDelete,
  theme,
}: Props) => {
  const handleAction =
    (action: () => void) => (event?: GestureResponderEvent) => {
      event?.stopPropagation();
      action();
    };

  return (
    <Card
      mode="contained"
      style={[
        styles.card,
        { backgroundColor: theme.surface2 ?? theme.surfaceVariant },
      ]}
    >
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ checked: active }}
        android_ripple={{ color: theme.rippleColor }}
        onPress={onToggle}
        style={styles.content}
      >
        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: active ? theme.onSurface : theme.onSurfaceDisabled },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.description,
              { color: active ? theme.primary : theme.onSurfaceDisabled },
            ]}
          >
            {description}
          </Text>
          {detail ? (
            <Text
              numberOfLines={1}
              style={[styles.detail, { color: theme.onSurfaceVariant }]}
            >
              {detail}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <IconButton
            accessibilityLabel={editLabel}
            icon="pencil-outline"
            iconColor={theme.onSurface}
            onPress={handleAction(onEdit)}
            size={22}
          />
          <IconButton
            accessibilityLabel={deleteLabel}
            icon="delete-outline"
            iconColor={theme.onSurface}
            onPress={handleAction(onDelete)}
            size={22}
          />
        </View>
      </Pressable>
    </Card>
  );
};

export default React.memo(CustomCodeCard);

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', marginEnd: -8 },
  card: { borderRadius: 16, marginBottom: 8 },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 88,
    padding: 12,
  },
  copy: { flex: 1, minWidth: 0 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  detail: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  title: { fontSize: 16, lineHeight: 22 },
});
