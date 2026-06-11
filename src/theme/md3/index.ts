import { catppuccinTheme } from './catppuccin';
import { defaultTheme } from './defaultTheme';
import { lavenderTheme } from './lavender';
import { midnightDusk } from './mignightDusk';
import { strawberryDaiquiriTheme } from './strawberry';
import { takoTheme } from './tako';
import { tealTurquoise } from './tealTurquoise';
import { yinyangTheme } from './yinyang';
import { yotsubaTheme } from './yotsuba';

export const lightThemes = [
  defaultTheme.light,
  midnightDusk.light,
  tealTurquoise.light,
  yotsubaTheme.light,
  lavenderTheme.light,
  strawberryDaiquiriTheme.light,
  takoTheme.light,
  catppuccinTheme.light,
  yinyangTheme.light,
].map((theme, i) => ({ ...theme, id: 100 + i }));
export const darkThemes = [
  defaultTheme.dark,
  midnightDusk.dark,
  tealTurquoise.dark,
  yotsubaTheme.dark,
  lavenderTheme.dark,
  strawberryDaiquiriTheme.dark,
  takoTheme.dark,
  catppuccinTheme.dark,
  yinyangTheme.dark,
].map((theme, i) => ({ ...theme, id: 100 + i }));
