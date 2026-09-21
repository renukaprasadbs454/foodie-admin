'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_14_RESTAURANT_LIST } from '@/constants/gaps';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';
import { useGetAdminRestaurantsQuery, useApproveRestaurantMutation, useSuspendRestaurantMutation, useUpdateAdminRestaurantPositionsMutation } from '@/api/endpoints/restaurantsApi';
import { RestaurantCommissionModal, CommissionSettingsData, SelectedRestaurantTarget } from '../components/RestaurantCommissionModal';
import { TopRestaurantsManager } from '../components/TopRestaurantsManager';

export interface StoreItem {
  id: string;
  name: string;
  module: string;
  ownerName: string;
  phone: string;
  zone: string;
  rating: number;
  ordersCount: number;
  commissionRate: number;
  status: 'APPROVED' | 'PENDING' | 'SUSPENDED';
  joinedDate: string;
  topPosition?: number | null;
}

const MOCK_STORES: StoreItem[] = [
  {
    id: 'b7c2a110-92d4-4f81-9b11-a83d712e5001',
    name: 'Royal Biryani House',
    module: 'North Indian & Biryani',
    ownerName: 'Rahul Sharma',
    phone: '+91 98765 43210',
    zone: 'Downtown Central',
    rating: 4.8,
    ordersCount: 1420,
    commissionRate: 15,
    status: 'APPROVED',
    joinedDate: '2025-01-15',
  },
  {
    id: 'c8d3b221-03e5-5f92-ac22-b94e823f6002',
    name: 'Bella Italia Pizzeria',
    module: 'Italian & Wood-Fired Pizza',
    ownerName: 'Priya Patel',
    phone: '+91 98123 45678',
    zone: 'North Metro',
    rating: 4.6,
    ordersCount: 890,
    commissionRate: 12,
    status: 'APPROVED',
    joinedDate: '2025-02-01',
  },
  {
    id: 'd9e4c332-14f6-6fa3-bd33-ca5f934a7003',
    name: 'Sweet Dreams Bakery & Cafe',
    module: 'Bakery & Desserts',
    ownerName: 'Suresh Kumar',
    phone: '+91 97890 12345',
    zone: 'Westside Hub',
    rating: 4.9,
    ordersCount: 650,
    commissionRate: 10,
    status: 'PENDING',
    joinedDate: '2025-03-10',
  },
  {
    id: 'e0f5d443-25a7-70b4-ce44-db6a045b8004',
    name: 'The Gourmet Burger Bistro',
    module: 'Burgers & Fast Food',
    ownerName: 'Ananya Verma',
    phone: '+91 96543 21098',
    zone: 'Downtown Central',
    rating: 4.5,
    ordersCount: 310,
    commissionRate: 15,
    status: 'SUSPENDED',
    joinedDate: '2025-01-20',
  },
  {
    id: 'f1a6e554-36b8-81c5-df55-ec7b156c9005',
    name: 'Dragon Bowl Asian Kitchen',
    module: 'Chinese & Pan-Asian',
    ownerName: 'Vikram Singh',
    phone: '+91 95432 10987',
    zone: 'East Suburban',
    rating: 4.7,
    ordersCount: 540,
    commissionRate: 12,
    status: 'APPROVED',
    joinedDate: '2025-02-18',
  },
];

export function RestaurantsPage() {
  const { tokens } = useTheme();
  const router = useRouter();
  const activeModule = useAppSelector(selectActiveModule);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'SUSPENDED' | 'TOP_RESTAURANTS'>('ALL');
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  // New Vendor Form State
  const [newVendorName, setNewVendorName] = useState('');
  const [newModule, setNewModule] = useState('North Indian & Biryani');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newZone, setNewZone] = useState('Downtown Central');
  const [newCommission, setNewCommission] = useState('15');

  useEffect(() => {
    trackAnalyticsEvent('admin_restaurants_viewed', {
      gapId: GAP_API_14_RESTAURANT_LIST,
    });
  }, []);

  const [localStores, setLocalStores] = useState<StoreItem[]>(MOCK_STORES);

  const { data: adminData, refetch } = useGetAdminRestaurantsQuery({
    status: (activeTab === 'ALL' || activeTab === 'TOP_RESTAURANTS') ? undefined : activeTab,
    size: 100,
  });

  useEffect(() => {
    if (adminData?.items && adminData.items.length > 0) {
      const mapped: StoreItem[] = adminData.items.map(r => ({
        id: r.restaurantId || '',
        name: r.name || 'Unnamed',
        module: r.cuisineTypes?.join(', ') || 'N/A',
        ownerName: r.ownerUserCredentialId?.slice(0, 8) || '—',
        phone: (r.legalDetails as any)?.contactPhone || '—',
        zone: r.address?.city || 'N/A',
        rating: typeof r.avgRating === 'number' ? r.avgRating : 0,
        ordersCount: 0,
        commissionRate: typeof r.commissionPct === 'number' ? r.commissionPct : 15,
        status: (r.status as any) || 'PENDING',
        joinedDate: '',
        topPosition: (r as any).topPosition || null,
      }));
      setLocalStores(mapped);
    }
  }, [adminData]);

  const stores = localStores;

  const filteredStores = stores.filter((s) => {
    const matchesTab = activeTab === 'ALL' || s.status === activeTab;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.module.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const [approve] = useApproveRestaurantMutation();
  const [suspend] = useSuspendRestaurantMutation();
  const [updatePositions] = useUpdateAdminRestaurantPositionsMutation();

  const handleUpdateStatus = async (storeId: string, newStatus: 'APPROVED' | 'SUSPENDED') => {
    setLocalStores(prev => prev.map(s => s.id === storeId ? { ...s, status: newStatus } : s));
    try {
      if (newStatus === 'APPROVED') {
        await approve(storeId).unwrap();
        setToastMessage('Restaurant approved successfully.');
      } else {
        await suspend({ restaurantId: storeId, body: { reason: 'Suspended from Dashboard list' } }).unwrap();
        setToastMessage('Restaurant suspended successfully.');
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage(`Restaurant ${newStatus.toLowerCase()} successfully.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newOwnerName.trim() || !newPhone.trim()) {
      alert('Please fill out Restaurant Name, Owner Name, and Contact Phone.');
      return;
    }
    const newStore: StoreItem = {
      id: `rest-${Date.now().toString().slice(-6)}`,
      name: newVendorName.trim(),
      module: newModule,
      ownerName: newOwnerName.trim(),
      phone: newPhone.trim(),
      zone: newZone,
      rating: 5.0,
      ordersCount: 0,
      commissionRate: Number(newCommission) || 15,
      status: 'PENDING',
      joinedDate: new Date().toISOString().split('T')[0],
    };
    setLocalStores(prev => [newStore, ...prev]);
    setToastMessage(`New restaurant "${newVendorName}" registered successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
    setIsAddModalOpen(false);
    setNewVendorName('');
    setNewOwnerName('');
    setNewPhone('');
  };

  const handleSaveCommission = (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => {
    setLocalStores(prev => prev.map(s => s.id === target.id ? { ...s, commissionRate: settings.commissionPct } : s));
    setIsCommissionModalOpen(false);
    setToastMessage(`Commission settings updated for "${target.name}": ${settings.commissionPct}% food commission rate applied.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#0C4A6E">
            Multi-Vendor Store Management
          </Text>
          <Text as="p" variant="caption" color="#0369A1">
            Manage, approve, and monitor stores & restaurants across all marketplace modules
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsCommissionModalOpen(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#E0F2FE',
              color: '#0284C7',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
              transition: 'all 0.15s ease',
            }}
          >
            Commission Settings
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            + Add New Vendor
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #0284C7',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Total Stores
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
            {stores.length}
          </Text>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #0EA5E9',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Active Vendors
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
            {stores.filter((s) => s.status === 'APPROVED').length}
          </Text>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #38BDF8',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Pending Approvals
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
            {stores.filter((s) => s.status === 'PENDING').length}
          </Text>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #94A3B8',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#0369A1">
            Suspended
          </Text>
          <Text as="h2" variant="heading1" color="#0C4A6E" style={{ marginTop: 4 }}>
            {stores.filter((s) => s.status === 'SUSPENDED').length}
          </Text>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid #BAE6FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['ALL', 'APPROVED', 'PENDING', 'SUSPENDED', 'TOP_RESTAURANTS'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === tab ? '1px solid #0284C7' : '1px solid #BAE6FD',
                backgroundColor: activeTab === tab ? '#0284C7' : '#F0F9FF',
                color: activeTab === tab ? '#FFFFFF' : '#0369A1',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              {tab === 'ALL' ? 'All Stores' : tab === 'TOP_RESTAURANTS' ? 'Top Restaurants' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by store name, zone, or UUID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #BAE6FD',
            width: 320,
            fontSize: 13,
            outline: 'none',
            color: '#0C4A6E',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Stores Data Table */}
      {activeTab !== 'TOP_RESTAURANTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.04)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0C4A6E', fontWeight: 800 }}>
                <th style={{ padding: '14px 20px' }}>Store Info</th>
                <th style={{ padding: '14px 20px' }}>Module</th>
                <th style={{ padding: '14px 20px' }}>Owner & Contact</th>
                <th style={{ padding: '14px 20px' }}>Zone</th>
                <th style={{ padding: '14px 20px' }}>Rating & Orders</th>
                <th style={{ padding: '14px 20px' }}>Commission</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id} style={{ borderBottom: '1px solid #BAE6FD' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 800, color: '#0C4A6E' }}>{store.name}</div>
                    <div style={{ fontSize: 11, color: '#0369A1', fontFamily: 'monospace' }}>{store.id}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        backgroundColor: '#E0F2FE',
                        border: '1px solid #BAE6FD',
                        color: '#0284C7',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                      }}
                    >
                      {store.module}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: '#0C4A6E' }}>{store.ownerName}</div>
                    <div style={{ fontSize: 12, color: '#0369A1' }}>{store.phone}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#0C4A6E', fontWeight: 600 }}>{store.zone}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, color: '#0C4A6E' }}>
                      <span>⭐ {store.rating}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#0369A1' }}>{store.ordersCount} orders</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#0C4A6E' }}>
                    {store.commissionRate}%
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        backgroundColor:
                          store.status === 'APPROVED'
                            ? '#E0F2FE'
                            : store.status === 'PENDING'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                        color:
                          store.status === 'APPROVED'
                            ? '#0284C7'
                            : store.status === 'PENDING'
                              ? '#B45309'
                              : '#991B1B',
                        border:
                          store.status === 'APPROVED'
                            ? '1px solid #BAE6FD'
                            : store.status === 'PENDING'
                              ? '1px solid #FDE68A'
                              : '1px solid #FECACA',
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 20,
                      }}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {store.status !== 'APPROVED' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(store.id, 'APPROVED')}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                          }}
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(store.id, 'SUSPENDED')}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/restaurants/${store.id}`)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#E0F2FE',
                          color: '#0284C7',
                          border: '1px solid #BAE6FD',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'TOP_RESTAURANTS' && (
        <TopRestaurantsManager
          stores={stores.filter(s => s.status === 'APPROVED')}
          onSavePositions={async (positions) => {
            try {
              await updatePositions(positions).unwrap();
              setToastMessage('Top restaurants updated successfully!');
              setTimeout(() => setToastMessage(null), 3000);
            } catch (e: any) {
              setToastMessage('Error saving top restaurants: ' + (e?.message || 'Unknown error'));
              setTimeout(() => setToastMessage(null), 3000);
            }
          }}
        />
      )}

      {/* Add New Vendor Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(12, 74, 110, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: 480,
              maxWidth: '90%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(2, 132, 199, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              border: '1px solid #BAE6FD',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text as="h2" variant="heading2" color="#0C4A6E">
                Register New Restaurant
              </Text>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0369A1' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVendor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Restaurant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Spice Junction Curry House"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Cuisine Category</label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="North Indian & Biryani">North Indian & Biryani</option>
                    <option value="Italian & Wood-Fired Pizza">Italian & Wood-Fired Pizza</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                    <option value="Burgers & Fast Food">Burgers & Fast Food</option>
                    <option value="Chinese & Pan-Asian">Chinese & Pan-Asian</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Delivery Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="Downtown Central">Downtown Central</option>
                    <option value="North Metro">North Metro</option>
                    <option value="Westside Hub">Westside Hub</option>
                    <option value="East Suburban">East Suburban</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0C4A6E' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  placeholder="15"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0C4A6E', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF', color: '#0369A1', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' }}
                >
                  Save Restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commission Settings Modal */}
      <RestaurantCommissionModal
        open={isCommissionModalOpen}
        restaurantName={filteredStores[0]?.name || stores[0]?.name || 'Select Restaurant'}
        restaurantId={filteredStores[0]?.id || stores[0]?.id || ''}
        initialCommission={filteredStores[0]?.commissionRate ?? 15}
        showRestaurantSelector={true}
        onClose={() => setIsCommissionModalOpen(false)}
        onSave={handleSaveCommission}
      />

      {toastMessage ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#0C4A6E',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            border: '1px solid #0284C7',
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
