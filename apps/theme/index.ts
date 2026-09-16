import { createAppTheme, type ColorMode } from 'foodie-shared-web';

/**
 * Admin theme — Blueprint §19.2.
 * Thin accent extension over foodie-shared-web tokens only.
 */
export function createAdminTheme(mode: ColorMode = 'light') {
  return createAppTheme(mode, {
    accent: mode === 'dark' ? '#FFFFFF' : '#000000',
    accentMuted: mode === 'dark' ? '#27272A' : '#F4F4F5',
    color: {
      success: mode === 'dark' ? '#FFFFFF' : '#000000',
      warning: mode === 'dark' ? '#A1A1AA' : '#71717A',
      inProgress: mode === 'dark' ? '#FFFFFF' : '#000000',
      error: mode === 'dark' ? '#E4E4E7' : '#18181B',
    },
  });
}

