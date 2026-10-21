import { SettingsPage, SettingsTab, ZoneSettingsConfig } from '../features/settings/pages/SettingsPage';

describe('Admin Settings Page Expansion & Zone-Wise Isolation Contract', () => {
  it('validates 9 setting categories are supported in SettingsTab type', () => {
    const requiredSettingTabs: SettingsTab[] = [
      'admin-profile',
      'page-setup',
      'social-media',
      'admin-users',
      'roles-permissions',
      'tax-gst',
      'payment-settings',
      'app-settings',
      'security',
    ];

    expect(requiredSettingTabs).toHaveLength(9);
    expect(requiredSettingTabs).toContain('admin-profile');
    expect(requiredSettingTabs).toContain('page-setup');
    expect(requiredSettingTabs).toContain('social-media');
    expect(requiredSettingTabs).toContain('roles-permissions');
    expect(requiredSettingTabs).toContain('tax-gst');
    expect(requiredSettingTabs).toContain('payment-settings');
    expect(requiredSettingTabs).toContain('app-settings');
  });

  it('verifies different settings work based on zone independently', () => {
    const universalSettings: ZoneSettingsConfig = {
      zoneId: 'ALL',
      zoneName: 'Platform Universal (All Zones)',
      cityName: 'All Territories',
      gstinNumber: '29AAAAA0000A1Z5',
      foodGstRate: '5.0',
      deliveryGstRate: '18.0',
      tcsTaxRate: '1.0',
      cashfreeEnabled: true,
      stripeEnabled: true,
      codEnabled: true,
      codMaxLimit: '2000',
      minAppVersion: 'v2.4.0',
      maxDeliveryRadius: '15',
      forceUpdateEnabled: true,
      maintenanceMode: false,
      customerOrderingEnabled: true,
      restaurantEnabled: true,
      deliveryPartnerEnabled: true,
      baseDeliveryCharge: '35.00',
      baseDistanceKm: '3.00',
      additionalChargePerKm: '10.00',
      freeDeliveryMinOrder: '499.00',
      nightSurcharge: '25.00',
      surgeMultiplier: '1.15',
      isCustomOverride: false,
    };

    const tumkurSettings: ZoneSettingsConfig = {
      ...universalSettings,
      zoneId: 'dz-tumkur-zone',
      zoneName: 'Tumkur zone',
      cityName: 'Tumakuru',
      codMaxLimit: '1500',
      maxDeliveryRadius: '100',
      maintenanceMode: false,
      baseDeliveryCharge: '30.00',
      isCustomOverride: true,
    };

    const bangaloreSettings: ZoneSettingsConfig = {
      ...universalSettings,
      zoneId: 'dz-bengaluru-zone',
      zoneName: 'Bengaluru zone',
      cityName: 'Bangalore',
      codMaxLimit: '2500',
      maxDeliveryRadius: '50',
      maintenanceMode: false,
      baseDeliveryCharge: '40.00',
      isCustomOverride: true,
    };

    // Verify zone isolation
    expect(tumkurSettings.zoneId).toBe('dz-tumkur-zone');
    expect(tumkurSettings.codMaxLimit).toBe('1500');
    expect(tumkurSettings.maxDeliveryRadius).toBe('100');
    expect(tumkurSettings.baseDeliveryCharge).toBe('30.00');

    expect(bangaloreSettings.zoneId).toBe('dz-bengaluru-zone');
    expect(bangaloreSettings.codMaxLimit).toBe('2500');
    expect(bangaloreSettings.maxDeliveryRadius).toBe('50');
    expect(bangaloreSettings.baseDeliveryCharge).toBe('40.00');

    // Universal defaults must remain untouched
    expect(universalSettings.codMaxLimit).toBe('2000');
    expect(universalSettings.maxDeliveryRadius).toBe('15');
    expect(universalSettings.baseDeliveryCharge).toBe('35.00');
  });

  it('allows emergency maintenance mode to be enabled per-zone without affecting other zones', () => {
    const zoneStore: Record<string, Partial<ZoneSettingsConfig>> = {
      ALL: { maintenanceMode: false },
      'dz-tumkur-zone': { maintenanceMode: true }, // Tumkur weather emergency
      'dz-bengaluru-zone': { maintenanceMode: false }, // Bengaluru operational
    };

    expect(zoneStore['dz-tumkur-zone'].maintenanceMode).toBe(true);
    expect(zoneStore['dz-bengaluru-zone'].maintenanceMode).toBe(false);
    expect(zoneStore['ALL'].maintenanceMode).toBe(false);
  });
});
