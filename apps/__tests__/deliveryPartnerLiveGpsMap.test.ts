import fs from 'fs';
import path from 'path';

describe('Delivery Partner Live GPS & Operating Location Map Feature', () => {
  const mapComponentPath = path.resolve(
    __dirname,
    '../features/deliveryPartners/components/DeliveryPartnerLocationMap.tsx'
  );
  const drawerPath = path.resolve(
    __dirname,
    '../features/deliveryPartners/components/DeliveryPartnerFullDetailsDrawer.tsx'
  );

  it('verifies DeliveryPartnerLocationMap component exists and contains online/offline handling', () => {
    expect(fs.existsSync(mapComponentPath)).toBe(true);
    const mapContent = fs.readFileSync(mapComponentPath, 'utf8');

    // Component definition & props
    expect(mapContent).toContain('export function DeliveryPartnerLocationMap');
    expect(mapContent).toContain('partnerName');
    expect(mapContent).toContain('isOnline');
    expect(mapContent).toContain('latitude');
    expect(mapContent).toContain('longitude');

    // Online live vs offline last active handling
    expect(mapContent).toContain('LIVE GPS POSITION');
    expect(mapContent).toContain('LAST ACTIVE LOCATION');
    expect(mapContent).toContain('radar-ping');
    expect(mapContent).toContain('openstreetmap.org');
    expect(mapContent).toContain('BillingNotEnabledMapError');

    // Controls & external navigation
    expect(mapContent).toContain('handleRecenter');
    expect(mapContent).toContain('handleZoomIn');
    expect(mapContent).toContain('handleZoomOut');
    expect(mapContent).toContain('https://www.google.com/maps?q=');
  });

  it('verifies DeliveryPartnerFullDetailsDrawer integrates DeliveryPartnerLocationMap inside Live GPS card', () => {
    expect(fs.existsSync(drawerPath)).toBe(true);
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');

    // Imports the map component
    expect(drawerContent).toContain("import { DeliveryPartnerLocationMap } from './DeliveryPartnerLocationMap'");

    // Operating Zone & Live GPS Location card
    expect(drawerContent).toContain('Live GPS & Operating Location');
    expect(drawerContent).toContain('<DeliveryPartnerLocationMap');

    // Online vs Offline status badges in card header
    expect(drawerContent).toContain('LIVE GPS TRACKING (ONLINE)');
    expect(drawerContent).toContain('LAST ACTIVE LOCATION (OFFLINE)');

    // Text details preserved
    expect(drawerContent).toContain('GPS LATITUDE');
    expect(drawerContent).toContain('GPS LONGITUDE');
    expect(drawerContent).toContain('CURRENT ZONE STATUS');
    expect(drawerContent).toContain('Operating inside designated service boundaries');
    expect(drawerContent).toContain('getPartnerCoordinates');
  });

  it('validates coordinate fallback logic across zones (Hassan, Tumkur, Kunigal, Bangalore)', () => {
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');

    // Contains zone coordinate fallbacks
    expect(drawerContent).toContain('13.0033'); // Hassan
    expect(drawerContent).toContain('13.3409'); // Tumkur
    expect(drawerContent).toContain('13.0260'); // Kunigal
    expect(drawerContent).toContain('12.9716'); // Bangalore / Default
  });

  it('verifies dummy data is removed from Vehicle & Fleet Category and replaced with database values', () => {
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');

    // Dummy vehicle number KA-05-EQ-9876 is removed
    expect(drawerContent).not.toContain('KA-05-EQ-9876');

    // Dummy address is removed
    expect(drawerContent).not.toContain('Flat 402, Green Glen Layout, Outer Ring Road');

    // Real database field with clean fallback is used
    expect(drawerContent).toContain("currentPartner.vehicleNumber?.trim() ? currentPartner.vehicleNumber : 'Not Provided'");
    expect(drawerContent).toContain("currentPartner.vehicleType || 'N/A'");
  });
});

