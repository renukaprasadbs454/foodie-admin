/**
 * Canonical design tokens — Blueprint §19–§22, System Design §24.
 *
 * DOCUMENTATION GAP: frozen docs define token *categories* and semantic names
 * but do not publish numeric hex / font / spacing values. Values below are
 * provisional structural placeholders required for a compilable foundation.
 * Visual brand values MUST be amended in design docs before production UI polish.
 */

export type ColorMode = 'light' | 'dark';

export type SemanticColorTokens = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  error: string;
  success: string;
  warning: string;
  inProgress: string;
  border: string;
  overlay: string;
  disabled: string;
};

export type SpacingTokens = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type RadiusTokens = {
  sm: number;
  md: number;
  lg: number;
  full: number;
};

export type ElevationTokens = {
  none: number;
  sm: number;
  md: number;
  lg: number;
};

export type TypographyVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label';

export type TypographyStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight:
    | '400'
    | '500'
    | '600'
    | '700'
    | 'normal'
    | 'bold';
  lineHeight: number;
};

export type TypographyTokens = Record<TypographyVariant, TypographyStyle>;

export type DesignTokens = {
  color: SemanticColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  typography: TypographyTokens;
};

const sharedSpacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const sharedRadius: RadiusTokens = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

const sharedElevation: ElevationTokens = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
};

/** System default; apps may substitute brand typefaces via theme extension. */
const systemFont = 'System';

const sharedTypography: TypographyTokens = {
  display: {
    fontFamily: systemFont,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  heading1: {
    fontFamily: systemFont,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  heading2: {
    fontFamily: systemFont,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  heading3: {
    fontFamily: systemFont,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
};

const lightColors: SemanticColorTokens = {
  background: '#FFFFFF',
  surface: '#FAFAFA',
  textPrimary: '#000000',
  textSecondary: '#52525B',
  textInverse: '#FFFFFF',
  accent: '#000000',
  accentMuted: '#F4F4F5',
  error: '#18181B',
  success: '#000000',
  warning: '#71717A',
  inProgress: '#000000',
  border: '#E4E4E7',
  overlay: 'rgba(0,0,0,0.6)',
  disabled: '#A1A1AA',
};

const darkColors: SemanticColorTokens = {
  background: '#09090B',
  surface: '#18181B',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textInverse: '#000000',
  accent: '#FFFFFF',
  accentMuted: '#27272A',
  error: '#E4E4E7',
  success: '#FFFFFF',
  warning: '#A1A1AA',
  inProgress: '#FFFFFF',
  border: '#27272A',
  overlay: 'rgba(0,0,0,0.8)',
  disabled: '#71717A',
};

export const lightTokens: DesignTokens = {
  color: lightColors,
  spacing: sharedSpacing,
  radius: sharedRadius,
  elevation: sharedElevation,
  typography: sharedTypography,
};

export const darkTokens: DesignTokens = {
  color: darkColors,
  spacing: sharedSpacing,
  radius: sharedRadius,
  elevation: sharedElevation,
  typography: sharedTypography,
};

export const tokensByMode: Record<ColorMode, DesignTokens> = {
  light: lightTokens,
  dark: darkTokens,
};

/**
 * Merge app-specific accent / variant overrides onto shared tokens.
 * Blueprint §19.2 — apps only extend; they never redefine the full set.
 */
export function createAppTheme(
  mode: ColorMode,
  overrides?: {
    accent?: string;
    accentMuted?: string;
    color?: Partial<SemanticColorTokens>;
  },
): DesignTokens {
  const base = tokensByMode[mode];
  return {
    ...base,
    color: {
      ...base.color,
      ...(overrides?.color ?? {}),
      ...(overrides?.accent ? { accent: overrides.accent } : {}),
      ...(overrides?.accentMuted ? { accentMuted: overrides.accentMuted } : {}),
    },
  };
}
