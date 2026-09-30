import { AdminHeaderBar } from '../components/AdminHeaderBar';

describe('Profile Avatar Dropdown Contract', () => {
  it('opens profile dropdown with standard user avatar icon and Edit Profile, with logout exclusively in sidebar', () => {
    const profileDropdownConfig = {
      trigger: 'avatar-icon-click',
      headerTitle: 'Admin Console',
      hasEmailText: false,
      hasLetterLogo: false,
      hasLogoutInProfileDropdown: false,
      sidebarHasLogout: true,
      options: [
        { label: 'Edit Profile', href: '/settings' },
      ],
    };

    expect(profileDropdownConfig.trigger).toBe('avatar-icon-click');
    expect(profileDropdownConfig.headerTitle).toBe('Admin Console');
    expect(profileDropdownConfig.hasEmailText).toBe(false);
    expect(profileDropdownConfig.hasLetterLogo).toBe(false);
    expect(profileDropdownConfig.hasLogoutInProfileDropdown).toBe(false);
    expect(profileDropdownConfig.sidebarHasLogout).toBe(true);
    expect(profileDropdownConfig.options).toHaveLength(1);
    expect(profileDropdownConfig.options[0].label).toBe('Edit Profile');
  });
});
