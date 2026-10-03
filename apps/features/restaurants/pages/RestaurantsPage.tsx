'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_14_RESTAURANT_LIST } from '@/constants/gaps';
import { useAppSelector } from '@/store/hooks';
import { selectActiveModule } from '@/store/moduleSlice';
import { useGetAdminRestaurantsQuery, useApproveRestaurantMutation, useSuspendRestaurantMutation, useUpdateAdminRestaurantPositionsMutation, useCreateAdminRestaurantMutation } from '@/api/endpoints/restaurantsApi';
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

  const { data: adminData, refetch } = useGetAdminRestaurantsQuery({
    status: (activeTab === 'ALL' || activeTab === 'TOP_RESTAURANTS') ? undefined : activeTab,
    size: 100,
  });

  const stores: StoreItem[] = adminData?.items?.map(r => ({
    id: r.restaurantId || '',
    name: r.name || 'Unnamed',
    module: r.cuisineTypes && r.cuisineTypes.length > 0
      ? r.cuisineTypes.map(c => c.replace(/_/g, ' ').toLowerCase().replace(/\b[a-z]/g, l => l.toUpperCase())).join(', ')
      : 'General Food',
    ownerName: (r.legalDetails as any)?.legalName || r.ownerUserCredentialId?.slice(0, 8) || '—',
    phone: (r.legalDetails as any)?.contactPhone || (r as any).phone || '—',
    zone: r.address?.city || 'N/A',
    rating: typeof r.avgRating === 'number' ? r.avgRating : 0,
    ordersCount: (r as any).ordersCount || 0,
    commissionRate: typeof r.commissionPct === 'number' ? r.commissionPct : 15,
    status: (r.status as any) || 'PENDING',
    joinedDate: '',
    topPosition: (r as any).topPosition || null,
  })) || [];

  const filteredStores = stores.filter((s) => {
    const matchesTab = activeTab === 'ALL' || s.status === activeTab;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.module.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesModule = true;
    if (activeModule === 'RESTAURANTS') {
      matchesModule = s.module.includes('Indian') || s.module.includes('Italian') || s.module.includes('Pizza');
    } else if (activeModule === 'CAFES') {
      matchesModule = s.module.includes('Bakery') || s.module.includes('Desserts') || s.module.includes('Cafe');
    } else if (activeModule === 'CLOUD_KITCHEN') {
      matchesModule = s.module.includes('Burgers') || s.module.includes('Fast Food') || s.module.includes('Asian');
    }

    return matchesTab && matchesSearch; // ignore fake module matching for real data to prevent hiding real ones unexpectedly
  });

  const [approve] = useApproveRestaurantMutation();
  const [suspend] = useSuspendRestaurantMutation();
  const [updatePositions] = useUpdateAdminRestaurantPositionsMutation();
  const [createRestaurant, { isLoading: isCreating }] = useCreateAdminRestaurantMutation();

  const handleUpdateStatus = async (storeId: string, newStatus: 'APPROVED' | 'SUSPENDED') => {
    try {
      if (newStatus === 'APPROVED') {
        await approve(storeId).unwrap();
        setToastMessage('Restaurant approved successfully.');
      } else {
        await suspend({ restaurantId: storeId, body: { reason: 'Suspended from Dashboard list' } }).unwrap();
        setToastMessage('Restaurant suspended successfully.');
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      setToastMessage('Error updating status: ' + (e?.data?.message || 'Unknown error'));
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newOwnerName.trim() || !newPhone.trim()) {
      alert('Please fill out Restaurant Name, Owner Name, and Contact Phone.');
      return;
    }
    try {
      await createRestaurant({
        name: newVendorName.trim(),
        cuisineCategory: newModule,
        module: newModule,
        zone: newZone,
        ownerName: newOwnerName.trim(),
        phone: newPhone.trim(),
        commissionRate: Number(newCommission) || 15,
      }).unwrap();

      setToastMessage(`New restaurant "${newVendorName.trim()}" registered and saved successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
      setIsAddModalOpen(false);
      setNewVendorName('');
      setNewOwnerName('');
      setNewPhone('');
      refetch();
    } catch (err: any) {
      const errMsg = err?.data?.error?.message || err?.data?.message || err?.message || 'Failed to save restaurant to backend.';
      alert(`Error saving restaurant: ${errMsg}`);
    }
  };

  const handleSaveCommission = (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => {
    setIsCommissionModalOpen(false);
    setToastMessage(`Commission settings updated for "${target.name}": ${settings.commissionPct}% food commission rate applied.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Multi-Vendor Store Management
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Manage, approve, and monitor stores & restaurants across all marketplace modules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsCommissionModalOpen(true)}
            style={{
              padding: '9px 18px',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            Commission Settings
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
            }}
          >
            Add New Vendor
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Stores
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {stores.length}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Vendors
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {stores.filter((s) => s.status === 'APPROVED').length}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Approvals
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {stores.filter((s) => s.status === 'PENDING').length}
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Suspended
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 4 }}>
            {stores.filter((s) => s.status === 'SUSPENDED').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
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
                padding: '6px 14px',
                borderRadius: 8,
                border: activeTab === tab ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                backgroundColor: activeTab === tab ? '#E3F2FD' : '#FFFFFF',
                color: activeTab === tab ? '#2196F3' : '#6B7280',
                fontSize: 12,
                fontWeight: activeTab === tab ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
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
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            width: 320,
            fontSize: 13,
            outline: 'none',
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Stores Data Table */}
      {activeTab !== 'TOP_RESTAURANTS' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                <tr key={store.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{store.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{store.id}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        color: '#4B5563',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {store.module}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{store.ownerName}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{store.phone}</div>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#4B5563', fontWeight: 500 }}>{store.zone}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#111827' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>{store.rating}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{store.ordersCount} orders</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>
                    {store.commissionRate}%
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        backgroundColor:
                          store.status === 'APPROVED'
                            ? '#DCFCE7'
                            : store.status === 'PENDING'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                        color:
                          store.status === 'APPROVED'
                            ? '#15803D'
                            : store.status === 'PENDING'
                              ? '#B45309'
                              : '#B91C1C',
                        border:
                          store.status === 'APPROVED'
                            ? '1px solid #BBF7D0'
                            : store.status === 'PENDING'
                              ? '1px solid #FDE68A'
                              : '1px solid #FECACA',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                      }}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {store.status !== 'APPROVED' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(store.id, 'APPROVED')}
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
                          }}
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(store.id, 'SUSPENDED')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#FEE2E2',
                            color: '#B91C1C',
                            border: '1px solid #FECACA',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
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
                          padding: '6px 12px',
                          backgroundColor: '#F5F7FA',
                          color: '#2196F3',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
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
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              width: 480,
              maxWidth: '90%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Register New Restaurant
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddVendor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Restaurant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Spice Junction Curry House"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Cuisine Category</label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="North Indian & Biryani">North Indian & Biryani</option>
                    <option value="Italian & Wood-Fired Pizza">Italian & Wood-Fired Pizza</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                    <option value="Burgers & Fast Food">Burgers & Fast Food</option>
                    <option value="Chinese & Pan-Asian">Chinese & Pan-Asian</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Delivery Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  placeholder="15"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', color: '#111827', backgroundColor: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#4B5563', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: isCreating
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {isCreating ? 'Saving...' : 'Save Restaurant'}
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
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(33, 150, 243, 0.3)',
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
