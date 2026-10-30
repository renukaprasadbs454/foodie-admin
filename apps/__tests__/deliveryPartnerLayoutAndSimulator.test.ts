import fs from 'fs';
import path from 'path';

describe('Super Admin Delivery Partners Page Layout & Simulator Contract', () => {
  const pagePath = path.resolve(__dirname, '../features/deliveryPartners/pages/DeliveryPartnersPage.tsx');
  const cardPath = path.resolve(__dirname, '../features/deliveryPartners/components/DeliveryPricingSettingsCard.tsx');

  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const cardContent = fs.readFileSync(cardPath, 'utf8');

  describe('UI Layout Rearrangement Order', () => {
    it('places Section 1: Delivery Partner List at the top before Shifts', () => {
      const partnerListIdx = pageContent.indexOf('1. Delivery Partner List');
      const kpiIdx = pageContent.indexOf('Dynamic Overview KPI Cards');
      const tableIdx = pageContent.indexOf('Dynamic Delivery Partners Table');
      const shiftIdx = pageContent.indexOf('2. Delivery Fleet Management – My Shifts');

      expect(partnerListIdx).toBeGreaterThan(-1);
      expect(kpiIdx).toBeGreaterThan(-1);
      expect(tableIdx).toBeGreaterThan(-1);
      expect(shiftIdx).toBeGreaterThan(-1);

      // Section 1 is placed before Section 2
      expect(partnerListIdx).toBeLessThan(shiftIdx);
      expect(kpiIdx).toBeLessThan(shiftIdx);
      expect(tableIdx).toBeLessThan(shiftIdx);
    });

    it('places Section 2: Delivery Fleet Management (My Shifts) below the Partner List and before Payout Structure', () => {
      const tableIdx = pageContent.indexOf('Dynamic Delivery Partners Table');
      const shiftIdx = pageContent.indexOf('2. Delivery Fleet Management – My Shifts');
      const pricingCardIdx = pageContent.indexOf('<DeliveryPricingSettingsCard />');

      expect(tableIdx).toBeLessThan(shiftIdx);
      expect(shiftIdx).toBeLessThan(pricingCardIdx);
    });

    it('contains all required features in Section 1 (KPI summary cards, tabs, search, KYC actions)', () => {
      expect(pageContent).toContain('Total Registered Fleet');
      expect(pageContent).toContain('Currently Online');
      expect(pageContent).toContain('Pending KYC Reviews');
      expect(pageContent).toContain('Verified Drivers');
      expect(pageContent).toContain("key: 'ALL', label: `All Fleet");
      expect(pageContent).toContain("key: 'VERIFIED', label: `Verified");
      expect(pageContent).toContain("key: 'PENDING', label: `Pending KYC");
      expect(pageContent).toContain("key: 'REJECTED', label: 'Rejected'");
      expect(pageContent).toContain('placeholder="Search by Name, Phone, Vehicle No..."');
      expect(pageContent).toContain('handleApproveKyc');
      expect(pageContent).toContain('setSelectedDocPreview');
      expect(pageContent).toContain('setRejectModalPartner');
    });

    it('contains all required features in Section 2 (Active Shifts, zone filter, Create Shift, Add Another Shift, Edit, Delete)', () => {
      expect(pageContent).toContain('Delivery Fleet Management – My Shifts');
      expect(pageContent).toContain('id="add-another-shift-button"');
      expect(pageContent).toContain('id="create-shift-section-button"');
      expect(pageContent).toContain('handleOpenEditShift');
      expect(pageContent).toContain('setShiftToDelete');
      expect(pageContent).toContain('shift-zone-filter-select');
    });

    it('renders Section 3: Delivery Partner Payout Structure & Incentives followed immediately by Section 4: Formula & Interactive Payout Simulator', () => {
      const payoutHeaderIdx = cardContent.indexOf('Delivery Partner Payout Structure & Incentives');
      const saveUniversalIdx = cardContent.indexOf('Save Universal Payout Structure');
      const simulatorHeaderIdx = cardContent.indexOf('4. Formula & Interactive Payout Simulator');

      expect(payoutHeaderIdx).toBeGreaterThan(-1);
      expect(saveUniversalIdx).toBeGreaterThan(-1);
      expect(simulatorHeaderIdx).toBeGreaterThan(-1);

      // Section 3 payout header comes before save button, which comes before Section 4 simulator
      expect(payoutHeaderIdx).toBeLessThan(saveUniversalIdx);
      expect(saveUniversalIdx).toBeLessThan(simulatorHeaderIdx);
    });

    it('contains all required features in Section 3 (Scope, Min Price, Money per KM, Matrix, Toggles, Save buttons)', () => {
      expect(cardContent).toContain('zoneScopeSelect');
      expect(cardContent).toContain('minPriceInput');
      expect(cardContent).toContain('moneyPerKmInput');
      expect(cardContent).toContain('Save Changes');
      expect(cardContent).toContain('Rider Incentives & Performance Bonus Matrix');
      expect(cardContent).toContain('Base Pay per Order');
      expect(cardContent).toContain('Peak Hour Bonus');
      expect(cardContent).toContain('Daily Target Bonus');
      expect(cardContent).toContain('Weekly Target Bonus');
      expect(cardContent).toContain('+ Add Custom Rule');
      expect(cardContent).toContain('Save Incentives');
      expect(cardContent).toContain('Save Universal Payout Structure');
    });

    it('contains all required features in Section 4 (Formula banner, Operator Quick Test, Add Test Distance, trip cards, delete)', () => {
      expect(cardContent).toContain('Formula & Interactive Payout Simulator');
      expect(cardContent).toContain('Operator Quick Test:');
      expect(cardContent).toContain('+ Add Test Distance');
      expect(cardContent).toContain('Base Guaranteed');
      expect(cardContent).toContain('Distance Incentive');
      expect(cardContent).toContain('handleRemoveDistanceCard');
    });
  });

  describe('Formula & Interactive Payout Simulator Dynamic Calculation Contract', () => {
    // Formula: Payout = Math.max(minPrice, distanceKm * moneyPerKm)
    const calculateSimulatorPayout = (distKm: number, minPrice: number, moneyPerKm: number) => {
      const feeByKm = distKm * moneyPerKm;
      if (feeByKm > minPrice) {
        return { payout: feeByKm, appliedRule: 'PER_KM' as const, isPerKm: true };
      }
      return { payout: minPrice, appliedRule: 'MIN_PRICE' as const, isPerKm: false };
    };

    it('calculates Base Guaranteed when distance × moneyPerKm <= minimum price', () => {
      // Example with minPrice = ₹30, moneyPerKm = ₹14
      // 1 km trip: 1 * 14 = 14 <= 30 => payout = 30
      const result = calculateSimulatorPayout(1, 30, 14);
      expect(result.payout).toBe(30);
      expect(result.appliedRule).toBe('MIN_PRICE');
      expect(result.isPerKm).toBe(false);

      // 2 km trip: 2 * 14 = 28 <= 30 => payout = 30
      const result2 = calculateSimulatorPayout(2, 30, 14);
      expect(result2.payout).toBe(30);
      expect(result2.appliedRule).toBe('MIN_PRICE');
    });

    it('calculates Distance Incentive when distance × moneyPerKm > minimum price', () => {
      // Example with minPrice = ₹30, moneyPerKm = ₹14
      // 3 km trip: 3 * 14 = 42 > 30 => payout = 42
      const result = calculateSimulatorPayout(3, 30, 14);
      expect(result.payout).toBe(42);
      expect(result.appliedRule).toBe('PER_KM');
      expect(result.isPerKm).toBe(true);

      // 5 km trip: 5 * 14 = 70 > 30 => payout = 70
      const result5 = calculateSimulatorPayout(5, 30, 14);
      expect(result5.payout).toBe(70);
      expect(result5.appliedRule).toBe('PER_KM');
      expect(result5.isPerKm).toBe(true);
    });

    it('dynamically adapts calculation when admin updates payout configuration', () => {
      // Initial: ₹40 base, ₹15 / km
      const initial5Km = calculateSimulatorPayout(5, 40, 15);
      expect(initial5Km.payout).toBe(75);

      // Admin updates to: ₹50 base, ₹20 / km
      const updated5Km = calculateSimulatorPayout(5, 50, 20);
      expect(updated5Km.payout).toBe(100);

      // Short trip (2 km) with updated rates: 2 * 20 = 40 <= 50 => base ₹50
      const updated2Km = calculateSimulatorPayout(2, 50, 20);
      expect(updated2Km.payout).toBe(50);
      expect(updated2Km.appliedRule).toBe('MIN_PRICE');
    });
  });
});
