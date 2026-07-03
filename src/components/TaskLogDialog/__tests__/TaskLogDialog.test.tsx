import { render } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Dialog, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogViewer } from '../../LogViewer';
import TaskLogDialog from '../TaskLogDialog';

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({
    onSurface: '#111111',
    onSurfaceVariant: '#333333',
    overlay3: '#ffffff',
    primary: '#6200ee',
    surface: '#ffffff',
    surfaceVariant: '#eeeeee',
  }),
}));

describe('TaskLogDialog', () => {
  const baseProps = {
    visible: true,
    title: 'Task log',
    logs: [],
    onDismiss: jest.fn(),
    actions: <Text>Done</Text>,
  };

  const renderDialog = (running: boolean) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <PaperProvider>
          <TaskLogDialog {...baseProps} running={running} />
        </PaperProvider>
      </SafeAreaProvider>,
    );

  it('locks backdrop and Android back dismissal while running', () => {
    const { UNSAFE_getByType } = renderDialog(true);

    const dialog = UNSAFE_getByType(Dialog);
    expect(dialog.props.dismissable).toBe(false);
    expect(dialog.props.dismissableBackButton).toBe(false);
  });

  it('allows dismissal after the task finishes', () => {
    const { UNSAFE_getByType } = renderDialog(false);

    const dialog = UNSAFE_getByType(Dialog);
    expect(dialog.props.dismissable).toBe(true);
    expect(dialog.props.dismissableBackButton).toBe(true);
  });

  it('constrains the dialog and gives logs a stable shrinkable viewport', () => {
    const { UNSAFE_getByType } = renderDialog(true);

    const dialog = UNSAFE_getByType(Dialog);
    const viewer = UNSAFE_getByType(LogViewer);
    expect(StyleSheet.flatten(dialog.props.style)).toMatchObject({
      maxHeight: '90%',
    });
    expect(StyleSheet.flatten(viewer.props.style)).toMatchObject({
      flexShrink: 1,
      height: 350,
      minHeight: 96,
    });
    expect(dialog.props.theme.colors.primary).toBe('#6200ee');
  });

  it('scrolls idle content without wrapping the log viewer', () => {
    const { UNSAFE_getByType, UNSAFE_queryByType } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 320 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <PaperProvider>
          <TaskLogDialog
            {...baseProps}
            running={false}
            idleContent={<Text>Idle form</Text>}
          />
        </PaperProvider>
      </SafeAreaProvider>,
    );

    expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
    expect(UNSAFE_queryByType(LogViewer)).toBeNull();
  });
});
