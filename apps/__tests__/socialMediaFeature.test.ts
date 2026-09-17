import { SOCIAL_MEDIA_OPTIONS } from '../features/social-media/types/socialMediaTypes';
import { DASHBOARD_NAV } from '../lib/routeGuards';

describe('Social Media Feature Contract', () => {
  it('houses social media configuration under settings and includes /settings in navigation', () => {
    const settingsNav = DASHBOARD_NAV.find((item) => item.href === '/settings');

    expect(settingsNav).toBeDefined();
    expect(settingsNav?.label).toBe('Settings');
    expect(settingsNav?.category).toBe('SYSTEM');
  });

  it('supports essential social media platforms (Pinterest, LinkedIn, Facebook, Instagram, YouTube, Twitter, TikTok)', () => {
    const values = SOCIAL_MEDIA_OPTIONS.map((opt) => opt.value);

    expect(values).toContain('pinterest');
    expect(values).toContain('linkedin');
    expect(values).toContain('facebook');
    expect(values).toContain('instagram');
    expect(values).toContain('youtube');
    expect(values).toContain('twitter');
    expect(values).toContain('tiktok');
  });
});
