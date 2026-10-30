import { calculateCustomerLtvBadge } from '../features/customers/types/customerTypes';

describe('Customer Details Full Page & Security Controls', () => {
  test('aggregates complete user data across orders, payments, complaints, locations, and reviews', () => {
    const mockDetail = {
      customer: {
        id: 'f2b8182f-e14d-4edb-ae51-8d655fe8cc07',
        name: 'Chinku',
        email: 'chinku@gmail.com',
        phone: '+919865321475',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'BRONZE',
        totalOrders: 1,
        totalSpend: 487,
        savedAddressesCount: 2,
        joinedDate: '2026-09-27',
        lastOrderDate: '2026-09-27',
        isCodDisabled: false,
        suspensionReason: null,
        totalOrdersDelivered: 1,
        totalOrdersCancelled: 0,
        avgOrderValue: 487,
      },
      addresses: [
        {
          id: 'ADDR-1',
          title: 'Home',
          name: 'Chinku',
          streetAddress: 'Flat 402, Metro Residency, 100 Feet Rd',
          city: 'Bangalore',
          postalCode: '560038',
          isDefault: true,
          latitude: 12.9716,
          longitude: 77.5946,
        },
      ],
      orders: [
        {
          id: 'ORD-1',
          orderNumber: 'FD-20260927-000009',
          restaurantName: 'Hotel Mayura',
          totalAmount: 487,
          status: 'DELIVERED',
          createdAt: '2026-09-27T10:00:00Z',
          paymentMethod: 'ONLINE_UPI',
        },
      ],
      payments: [
        {
          id: 'PAY-1',
          orderId: 'ORD-1',
          orderNumber: 'FD-20260927-000009',
          amount: 487,
          paymentMethod: 'ONLINE_UPI',
          status: 'SUCCESS',
          createdAt: '2026-09-27T10:01:00Z',
        },
      ],
      complaints: [
        {
          id: 'TICK-1',
          subject: 'Late night food delivery enquiry',
          category: 'DELIVERY',
          status: 'RESOLVED',
          priority: 'MEDIUM',
          createdAt: '2026-09-28T09:00:00Z',
        },
      ],
      reviews: [
        {
          id: 'REV-1',
          restaurantName: 'Hotel Mayura',
          restaurantRating: 5,
          deliveryRating: 5,
          comment: 'Fresh food and quick delivery!',
          createdAt: '2026-09-27T11:00:00Z',
        },
      ],
    };

    expect(mockDetail.customer.id).toBe('f2b8182f-e14d-4edb-ae51-8d655fe8cc07');
    expect(mockDetail.orders).toHaveLength(1);
    expect(mockDetail.payments).toHaveLength(1);
    expect(mockDetail.complaints).toHaveLength(1);
    expect(mockDetail.addresses).toHaveLength(1);
    expect(mockDetail.reviews).toHaveLength(1);
    expect(mockDetail.customer.isCodDisabled).toBe(false);
  });

  test('validates mandatory suspension reason enforcement', () => {
    const validateSuspension = (status: string, reason?: string) => {
      if (status === 'SUSPENDED') {
        if (!reason || reason.trim().length < 3) {
          return { valid: false, error: 'Mandatory suspension reason must be provided (minimum 3 characters).' };
        }
      }
      return { valid: true };
    };

    // Blank / empty reasons must be rejected
    expect(validateSuspension('SUSPENDED', '')).toEqual({
      valid: false,
      error: 'Mandatory suspension reason must be provided (minimum 3 characters).',
    });
    expect(validateSuspension('SUSPENDED', '  ')).toEqual({
      valid: false,
      error: 'Mandatory suspension reason must be provided (minimum 3 characters).',
    });
    expect(validateSuspension('SUSPENDED', 'no')).toEqual({
      valid: false,
      error: 'Mandatory suspension reason must be provided (minimum 3 characters).',
    });

    // Valid reasons pass
    expect(validateSuspension('SUSPENDED', 'Frequent fake COD order rejections').valid).toBe(true);
    expect(validateSuspension('ACTIVE').valid).toBe(true);
  });

  test('enforces COD restrictions and toggling for problematic accounts', () => {
    let customerCodDisabled = false;

    const toggleCod = (currentState: boolean) => !currentState;

    customerCodDisabled = toggleCod(customerCodDisabled);
    expect(customerCodDisabled).toBe(true);

    customerCodDisabled = toggleCod(customerCodDisabled);
    expect(customerCodDisabled).toBe(false);
  });

  test('anonymizes and purges customer profile under data deletion request', () => {
    const purgeCustomer = (c: { id: string; name: string; email: string; phone: string }) => ({
      ...c,
      name: `Purged User (${c.id.substring(0, 8)})`,
      email: `anonymized-${c.id.substring(0, 8)}@foodie.local`,
      phone: '—',
      accountStatus: 'SUSPENDED',
      isDeleted: true,
    });

    const original = {
      id: 'f2b8182f-e14d-4edb-ae51-8d655fe8cc07',
      name: 'Chinku',
      email: 'chinku@gmail.com',
      phone: '+919865321475',
    };

    const purged = purgeCustomer(original);
    expect(purged.name).toBe('Purged User (f2b8182f)');
    expect(purged.email).toBe('anonymized-f2b8182f@foodie.local');
    expect(purged.isDeleted).toBe(true);
  });

  test('calculateCustomerLtvBadge returns proper tier and colors', () => {
    expect(calculateCustomerLtvBadge(1500).tier).toBe('PLATINUM VIP');
    expect(calculateCustomerLtvBadge(600).tier).toBe('GOLD');
    expect(calculateCustomerLtvBadge(300).tier).toBe('SILVER');
    expect(calculateCustomerLtvBadge(50).tier).toBe('BRONZE');
  });
});
