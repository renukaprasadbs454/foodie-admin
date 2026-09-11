import { createAppTheme, type ColorMode } from 'foodie-shared-web';

/**
 * Admin theme — Blueprint §19.2.
 * Thin accent extension over foodie-shared-web tokens only.
 */
export function createAdminTheme(mode: ColorMode = 'light') {
  return createAppTheme(mode, {
    accent: '#000000',
    accentMuted: '#F4F4F5',
    color: {
      warning: '#71717A',
      inProgress: '#000000',
    },
  });
}

