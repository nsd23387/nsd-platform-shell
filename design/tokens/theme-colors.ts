import type { ThemeMode } from '../../contexts/ThemeContext';

export interface ThemeBackground {
  page: string;
  surface: string;
  muted: string;
  hover: string;
  active: string;
}

export interface ThemeText {
  primary: string;
  secondary: string;
  muted: string;
  placeholder: string;
  disabled: string;
  inverse: string;
}

export interface ThemeBorder {
  default: string;
  subtle: string;
  strong: string;
  focus: string;
}

export interface ThemeSemanticGroup {
  light: string;
  base: string;
  dark: string;
}

export interface ThemeSemantic {
  success: ThemeSemanticGroup;
  warning: ThemeSemanticGroup;
  danger: ThemeSemanticGroup;
  info: ThemeSemanticGroup;
}

export interface ThemeTrend {
  bg: string;
  text: string;
}

export interface ThemeTrends {
  up: ThemeTrend;
  down: ThemeTrend;
  neutral: ThemeTrend;
}

export interface ThemeStatusPill {
  bg: string;
  text: string;
  border: string;
}

export interface ThemeStatusColors {
  exceptional: ThemeStatusPill;
  standard: ThemeStatusPill;
  breach: ThemeStatusPill;
  pending: ThemeStatusPill;
  active: ThemeStatusPill;
}

export interface ThemeCardVariants {
  default: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeColors {
  background: ThemeBackground;
  text: ThemeText;
  border: ThemeBorder;
  semantic: ThemeSemantic;
  trendColors: ThemeTrends;
  statusColors: ThemeStatusColors;
  cardVariants: ThemeCardVariants;
  chartColors: readonly string[];
}

const lightColors: ThemeColors = {
  background: {
    page: '#fafafa',
    surface: '#ffffff',
    muted: '#f5f5f5',
    hover: '#f0f0f0',
    active: '#e5e5e5',
  },
  text: {
    primary: '#1e1e4a',
    secondary: '#525252',
    muted: '#737373',
    placeholder: '#a3a3a3',
    disabled: '#d4d4d4',
    inverse: '#ffffff',
  },
  border: {
    default: '#e5e5e5',
    subtle: '#f0f0f0',
    strong: '#d4d4d4',
    focus: '#8b5cf6',
  },
  semantic: {
    success: { light: '#ecfdf5', base: '#10b981', dark: '#047857' },
    warning: { light: '#fefce8', base: '#eab308', dark: '#a16207' },
    danger: { light: '#fef2f2', base: '#ef4444', dark: '#b91c1c' },
    info: { light: '#f0f9ff', base: '#0ea5e9', dark: '#0369a1' },
  },
  trendColors: {
    up: { bg: '#ecfdf5', text: '#047857' },
    down: { bg: '#fef2f2', text: '#b91c1c' },
    neutral: { bg: '#f5f5f5', text: '#525252' },
  },
  statusColors: {
    exceptional: { bg: '#ecfdf5', text: '#047857', border: '#10b981' },
    standard: { bg: '#fefce8', text: '#a16207', border: '#eab308' },
    breach: { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
    pending: { bg: '#f5f5f5', text: '#525252', border: '#d4d4d4' },
    active: { bg: '#f0f9ff', text: '#0369a1', border: '#0ea5e9' },
  },
  cardVariants: {
    default: 'transparent',
    success: '#10b981',
    warning: '#eab308',
    danger: '#ef4444',
  },
  chartColors: ['#8b5cf6', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#06b6d4'],
};

const darkColors: ThemeColors = {
  background: {
    page: '#0f0f1a',
    surface: '#1a1a2e',
    muted: '#252540',
    hover: '#2d2d4a',
    active: '#363655',
  },
  text: {
    primary: '#e8e8f0',
    secondary: '#b0b0c0',
    muted: '#8888a0',
    placeholder: '#606078',
    disabled: '#404058',
    inverse: '#0f0f1a',
  },
  border: {
    default: '#2d2d4a',
    subtle: '#222238',
    strong: '#404058',
    focus: '#a78bfa',
  },
  semantic: {
    success: { light: '#0d2818', base: '#34d399', dark: '#6ee7b7' },
    warning: { light: '#2d2006', base: '#fbbf24', dark: '#fcd34d' },
    danger: { light: '#2d0a0a', base: '#f87171', dark: '#fca5a5' },
    info: { light: '#0a1e2d', base: '#38bdf8', dark: '#7dd3fc' },
  },
  trendColors: {
    up: { bg: '#0d2818', text: '#6ee7b7' },
    down: { bg: '#2d0a0a', text: '#fca5a5' },
    neutral: { bg: '#252540', text: '#b0b0c0' },
  },
  statusColors: {
    exceptional: { bg: '#0d2818', text: '#6ee7b7', border: '#34d399' },
    standard: { bg: '#2d2006', text: '#fcd34d', border: '#fbbf24' },
    breach: { bg: '#2d0a0a', text: '#fca5a5', border: '#f87171' },
    pending: { bg: '#252540', text: '#b0b0c0', border: '#404058' },
    active: { bg: '#0a1e2d', text: '#7dd3fc', border: '#38bdf8' },
  },
  cardVariants: {
    default: 'transparent',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
  },
  chartColors: ['#a78bfa', '#34d399', '#38bdf8', '#fbbf24', '#f87171', '#22d3ee'],
};

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}
