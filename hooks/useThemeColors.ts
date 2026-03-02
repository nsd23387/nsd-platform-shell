'use client';

import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../design/tokens/theme-colors';
import type { ThemeColors } from '../design/tokens/theme-colors';

export function useThemeColors(): ThemeColors {
  const { mode } = useTheme();
  return useMemo(() => getThemeColors(mode), [mode]);
}
