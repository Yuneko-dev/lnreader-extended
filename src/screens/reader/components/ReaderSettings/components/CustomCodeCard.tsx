import type { ThemeColors } from '@theme/types';
import React from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';

type Props = {
  title: string;
  description: string;
  detail?: string;
  showDetail?: boolean;
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
  showDetail = false,
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
      >
        <View
          style={[
            styles.content,
            showDetail ? styles.contentWithDetail : styles.contentCompact,
          ]}
        >
          <View style={styles.copy}>
            <Text
              variant="bodyLarge"
              numberOfLines={1}
              style={{
                color: active ? theme.onSurface : theme.onSurfaceDisabled,
              }}
            >
              {title}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: active ? theme.primary : theme.onSurfaceDisabled,
              }}
            >
              {description}
            </Text>
            {showDetail && detail ? (
              <Text
                variant="labelSmall"
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
              iconColor={theme.onSurfaceVariant}
              onPress={handleAction(onEdit)}
              size={20}
              style={styles.action}
            />
            <IconButton
              accessibilityLabel={deleteLabel}
              icon="delete-outline"
              iconColor={theme.onSurfaceVariant}
              onPress={handleAction(onDelete)}
              size={20}
              style={styles.action}
            />
          </View>
        </View>
      </Pressable>
    </Card>
  );
};

export default React.memo(CustomCodeCard);

const styles = StyleSheet.create({
  action: { margin: 0 },
  actions: { flexDirection: 'row' },
  card: { borderRadius: 12, marginVertical: 4, overflow: 'hidden' },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentCompact: { minHeight: 72 },
  contentWithDetail: { minHeight: 88 },
  copy: { flex: 1, minWidth: 0 },
  detail: { fontFamily: 'monospace', marginTop: 2 },
});
