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
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const sharedRadius: RadiusTokens = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
};

const sharedElevation: ElevationTokens = {
  none: 0,
  sm: 1,
  md: 3,
  lg: 6,
};

/** System default; apps may substitute brand typefaces via theme extension. */
const systemFont = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const sharedTypography: TypographyTokens = {
  display: {
    fontFamily: systemFont,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  heading1: {
    fontFamily: systemFont,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading2: {
    fontFamily: systemFont,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  heading3: {
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
};

const lightColors: SemanticColorTokens = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  accent: '#2196F3',
  accentMuted: '#E3F2FD',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  inProgress: '#2196F3',
  border: '#E5E7EB',
  overlay: 'rgba(17, 24, 39, 0.5)',
  disabled: '#9CA3AF',
};

const darkColors: SemanticColorTokens = {
  background: '#0F172A',
  surface: '#1E293B',
  textPrimary: '#F9FAFB',
  textSecondary: '#94A3B8',
  textInverse: '#0F172A',
  accent: '#38BDF8',
  accentMuted: '#0369A1',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  inProgress: '#38BDF8',
  border: '#334155',
  overlay: 'rgba(15, 23, 42, 0.8)',
  disabled: '#64748B',
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
