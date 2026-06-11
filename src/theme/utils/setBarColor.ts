import { ThemeColors } from '@theme/types';
import Color, { ColorInstance } from 'color';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'react-native';

export const setStatusBarColor = (color: ThemeColors | ColorInstance) => {
  if (color instanceof Color) {
    // fullscreen reader mode
    StatusBar.setBarStyle(color.isDark() ? 'light-content' : 'dark-content');
    StatusBar.setBackgroundColor(color.hexa());
  } else {
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setBarStyle(color.isDark ? 'light-content' : 'dark-content');
  }
};

export const changeNavigationBarColor = (color: string, isDark = false) => {
  // NavigationBar.setBackgroundColorAsync(color);
  NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
};
