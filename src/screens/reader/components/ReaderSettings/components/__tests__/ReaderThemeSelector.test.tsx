import { render } from '@testing-library/react-native';
import React from 'react';
import { FlatList as GestureHandlerFlatList } from 'react-native-gesture-handler';

import ReaderThemeSelector from '../ReaderThemeSelector';

const mockSetChapterReaderSettings = jest.fn();

jest.mock('@hooks/persisted', () => ({
  useChapterReaderSettings: () => ({
    customThemes: [],
    setChapterReaderSettings: mockSetChapterReaderSettings,
    textColor: '#111111',
    theme: '#eae4d3',
  }),
}));

describe('ReaderThemeSelector', () => {
  it('uses a gesture-aware horizontal list for preset selection', () => {
    const view = render(<ReaderThemeSelector />);
    const list = view.UNSAFE_getByType(GestureHandlerFlatList);

    expect(list.props.horizontal).toBe(true);

    // eslint-disable-next-line testing-library/render-result-naming-convention
    const themeButton = list.props.renderItem({
      index: 0,
      item: list.props.data[0],
    });
    themeButton.props.onPress();
    expect(mockSetChapterReaderSettings).toHaveBeenCalledWith({
      textColor: '#111111',
      theme: '#eae4d3',
    });
  });
});
