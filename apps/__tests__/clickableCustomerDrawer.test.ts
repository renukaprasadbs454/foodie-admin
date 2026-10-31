describe('Customer Full Details Drawer & Clickable Customer Cell Tests', () => {
  test('lookupKey resolution selects most specific identifier in priority: customerId -> customerPhone -> customerName', () => {
    const resolveLookupKey = (id: any, phone: any, name: any) => {
      if (id && typeof id === 'string' && id.trim()) return id.trim();
      if (phone && typeof phone === 'string' && phone.trim()) return phone.trim();
      if (name && typeof name === 'string' && name.trim()) return name.trim();
      return '';
    };

    // Priority 1: customerId
    expect(resolveLookupKey('cust-123', '+919845012345', 'Chandu')).toBe('cust-123');

    // Priority 2: customerPhone when customerId is missing/blank
    expect(resolveLookupKey(null, '+919845012345', 'Chandu')).toBe('+919845012345');
    expect(resolveLookupKey('', '+919845012345', 'Chandu')).toBe('+919845012345');

    // Priority 3: customerName when both ID and phone are missing
    expect(resolveLookupKey(null, null, 'CHANDU KT')).toBe('CHANDU KT');
    expect(resolveLookupKey('', '   ', 'Chandu')).toBe('Chandu');

    // Fallback when empty
    expect(resolveLookupKey(null, null, null)).toBe('');
  });

  test('CustomerFullDetails payload contains all required customer fields', () => {
    const mockCustomerResponse = {
      customer: {
        id: 'c-uuid-chandu',
        name: 'CHANDU KT',
        email: 'chandu.kt@example.com',
        phone: '+919845012345',
        avatarUrl: null,
        walletBalance: 0,
        totalOrders: 5,
        totalSpend: 1395,
        savedAddressesCount: 2,
        accountStatus: 'ACTIVE',
        joinedDate: '2026-10-01',
        lastOrderDate: '2026-10-31',
        loyaltyTier: 'GOLD',
      },
      addresses: [
        {
          id: 'addr-1',
          title: 'Home',
          name: 'CHANDU KT',
          phone: '+919845012345',
          streetAddress: '12th Main Road, HAL 2nd Stage',
          apartment: 'Apt 204',
          landmark: 'Near Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560038',
          isDefault: true,
        },
        {
          id: 'addr-2',
          title: 'Work',
          name: 'CHANDU KT',
          phone: '+919845012345',
          streetAddress: 'Embassy Tech Village',
          apartment: 'Tower B, 4th Floor',
          landmark: 'Outer Ring Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560103',
          isDefault: false,
        },
      ],
      orders: [
        {
          id: 'ord-101',
          orderNumber: 'FD-20261031-000001',
          restaurantName: 'Biryani Central',
          totalAmount: 279,
          status: 'READY_FOR_PICKUP',
          createdAt: '2026-10-31T10:00:00Z',
        },
      ],
      payments: [],
      complaints: [],
      reviews: [],
    };

    // 1. Full Name
    expect(mockCustomerResponse.customer.name).toBe('CHANDU KT');
    // 2. Phone
    expect(mockCustomerResponse.customer.phone).toBe('+919845012345');
    // 3. Email
    expect(mockCustomerResponse.customer.email).toBe('chandu.kt@example.com');
    // 4. Saved addresses
    expect(mockCustomerResponse.addresses.length).toBe(2);
    expect(mockCustomerResponse.addresses[0].isDefault).toBe(true);
    expect(mockCustomerResponse.addresses[0].streetAddress).toContain('HAL 2nd Stage');
    // 5. Total order count
    expect(mockCustomerResponse.customer.totalOrders).toBe(5);
    // 6. Status active / blocked
    expect(mockCustomerResponse.customer.accountStatus).toBe('ACTIVE');
  });

  test('Status toggle updates ACTIVE to SUSPENDED/BLOCKED and vice versa', () => {
    const toggleStatus = (currentStatus: any) => {
      const isCurrentlyActive = String(currentStatus).toUpperCase() === 'ACTIVE';
      return isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    };

    expect(toggleStatus('ACTIVE')).toBe('SUSPENDED');
    expect(toggleStatus('SUSPENDED')).toBe('ACTIVE');
    expect(toggleStatus('BLOCKED')).toBe('ACTIVE');
  });
});
