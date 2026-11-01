import fs from 'fs';
import path from 'path';

describe('Delivery Partner Full Details Drawer & Clickable Name Feature', () => {
  const pagePath = path.resolve(__dirname, '../features/deliveryPartners/pages/DeliveryPartnersPage.tsx');
  const drawerPath = path.resolve(__dirname, '../features/deliveryPartners/components/DeliveryPartnerFullDetailsDrawer.tsx');

  it('verifies DeliveryPartnerFullDetailsDrawer component exists and has required tabs', () => {
    expect(fs.existsSync(drawerPath)).toBe(true);
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');

    // All required data sections/tabs requested by user:
    expect(drawerContent).toContain("'OVERVIEW'");
    expect(drawerContent).toContain("'ORDERS'");
    expect(drawerContent).toContain("'CASH_IN_HAND'");
    expect(drawerContent).toContain("'PAYMENTS'");
    expect(drawerContent).toContain("'DOCUMENTS'");
    expect(drawerContent).toContain("'REVIEWS'");
    expect(drawerContent).toContain("'COMPLAINTS'");
    expect(drawerContent).toContain("'SHIFTS'");

    // Checks for related queries
    expect(drawerContent).toContain('useGetAdminOrdersQuery');
    expect(drawerContent).toContain('useGetAdminPayoutsQuery');
    expect(drawerContent).toContain('useGetAdminReviewsQuery');
    expect(drawerContent).toContain('useGetAllTicketsQuery');
    expect(drawerContent).toContain('useGetAdminShiftsQuery');

    // Checks for direct actions
    expect(drawerContent).toContain('useSuspendDeliveryPartnerMutation');
    expect(drawerContent).toContain('useApproveDeliveryPartnerKycMutation');
    expect(drawerContent).toContain('useRejectDeliveryPartnerKycMutation');

    // Cash in hand limit ₹2000 logic
    expect(drawerContent).toContain('maxCashInHandLimit || 2000');
    expect(drawerContent).toContain('Cash in Hand');
  });

  it('makes delivery partner name clickable to open details drawer in DeliveryPartnersPage.tsx', () => {
    const pageContent = fs.readFileSync(pagePath, 'utf8');

    // State for details drawer
    expect(pageContent).toContain('selectedPartnerForDetails');
    expect(pageContent).toContain('setSelectedPartnerForDetails');

    // Partner name cell is clickable
    expect(pageContent).toContain('onClick={() => setSelectedPartnerForDetails(p)}');

    // Drawer rendered conditionally when partner is selected
    expect(pageContent).toContain('<DeliveryPartnerFullDetailsDrawer');
    expect(pageContent).toContain('open={Boolean(selectedPartnerForDetails)}');
  });

  it('satisfies constraint: details is NOT a separate button in Actions column', () => {
    const pageContent = fs.readFileSync(pagePath, 'utf8');

    // Extract the actions column content
    const actionsIdx = pageContent.indexOf('Actions');
    expect(actionsIdx).toBeGreaterThan(0);

    // Verify there is NO button with text "Details" or "View Details"
    expect(pageContent).not.toMatch(/<button[^>]*>\s*Details\s*<\/button>/i);
    expect(pageContent).not.toMatch(/<button[^>]*>\s*View Details\s*<\/button>/i);
  });
});
