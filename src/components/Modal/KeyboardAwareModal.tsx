import { useTheme } from '@hooks/persisted';
import { ThemeColors } from '@theme/types';
import React, { ReactNode } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useAnimatedKeyboard } from 'react-native-keyboard-controller';
import { Modal, ModalProps, overlay, Portal } from 'react-native-paper';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import useKeyboardModalDismiss from './useKeyboardModalDismiss';

const MODAL_MARGIN = 24;
const BORDER_RADIUS = 28;

const getModalTitleColor = (theme: ThemeColors) => ({
  color: theme.onSurface,
});

export type KeyboardAwareModalProps = {
  title?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  onDismiss: () => void;
  scrollable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
} & Omit<
  ModalProps,
  'children' | 'contentContainerStyle' | 'onDismiss' | 'theme'
>;

const KeyboardAwareModal: React.FC<KeyboardAwareModalProps> = ({
  visible,
  onDismiss: onDismissProp,
  title,
  footer,
  children,
  scrollable = true,
  containerStyle,
  contentContainerStyle,
  scrollViewProps,
  style,
  ...props
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();

  const dismiss = useKeyboardModalDismiss(onDismissProp);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const keyboardHeight = Math.max(0, keyboard.height.value);
    const availableHeight =
      windowHeight - insets.top - Math.max(insets.bottom, keyboardHeight);

    return {
      maxHeight: Math.max(0, availableHeight),
      marginBottom: keyboardHeight,
    };
  }, [insets.bottom, insets.top, windowHeight]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={dismiss}
        {...props}
        style={[styles.modalWrapper, style]}
      >
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.modalContainer,
            { backgroundColor: overlay(2, theme.surface) },
            animatedContainerStyle,
            containerStyle,
          ]}
        >
          {title == null ? null : (
            <View style={styles.titleContainer}>
              {typeof title === 'string' || typeof title === 'number' ? (
                <Text
                  accessibilityRole="header"
                  style={[styles.modalTitle, getModalTitleColor(theme)]}
                >
                  {title}
                </Text>
              ) : (
                title
              )}
            </View>
          )}

          <View style={styles.body}>
            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                {...scrollViewProps}
                contentContainerStyle={[styles.content, contentContainerStyle]}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.content, contentContainerStyle]}>
                {children}
              </View>
            )}
          </View>

          {footer}
        </Animated.View>
      </Modal>
    </Portal>
  );
};

export default KeyboardAwareModal;

const styles = StyleSheet.create({
  modalWrapper: {
    justifyContent: 'center',
    paddingHorizontal: MODAL_MARGIN,
  },
  modalContainer: {
    borderRadius: BORDER_RADIUS,
    shadowColor: 'transparent',
  },
  titleContainer: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
  },
  body: {
    flexShrink: 1,
    minHeight: 0,
  },
  content: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
});
