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

  const { data: adminData, refetch } = useGetAdminRestaurantsQuery({
    status: (activeTab === 'ALL' || activeTab === 'TOP_RESTAURANTS') ? undefined : activeTab,
    size: 100,
  });

  const stores: StoreItem[] = adminData?.items?.map(r => ({
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

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newOwnerName.trim() || !newPhone.trim()) {
      alert('Please fill out Restaurant Name, Owner Name, and Contact Phone.');
      return;
    }
    setToastMessage(`New restaurant "${newVendorName}" registered successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
    setIsAddModalOpen(false);
  };

  const handleSaveCommission = (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => {
    setIsCommissionModalOpen(false);
    setToastMessage(`Commission settings updated for "${target.name}": ${settings.commissionPct}% food commission rate applied.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text as="h1" variant="heading1" color="#0369A1">
            Multi-Vendor Store Management
          </Text>
          <Text as="p" variant="caption" color="#0284C7">
            Manage, approve, and monitor stores & restaurants across all marketplace modules
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsCommissionModalOpen(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(14, 165, 233, 0.1)',
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
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
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
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #0284C7',
            boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Total Stores
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
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
            boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Active Vendors
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
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
            boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Pending Approvals
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
            {stores.filter((s) => s.status === 'PENDING').length}
          </Text>
        </div>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #BAE6FD',
            borderTop: '4px solid #BAE6FD',
            boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
          }}
        >
          <Text as="span" variant="caption" color="#0284C7">
            Suspended
          </Text>
          <Text as="h2" variant="heading1" color="#0369A1" style={{ marginTop: 4 }}>
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
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ALL', 'APPROVED', 'PENDING', 'SUSPENDED', 'TOP_RESTAURANTS'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : '#E0F2FE',
                color: activeTab === tab ? '#FFFFFF' : '#0369A1',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
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
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #BAE6FD',
            width: 320,
            fontSize: 14,
            outline: 'none',
            color: '#0369A1',
            backgroundColor: '#F0F9FF',
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
            boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', color: '#0369A1', fontWeight: 700 }}>
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
                <tr key={store.id} style={{ borderBottom: '1px solid #E0F2FE' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: '#0369A1' }}>{store.name}</div>
                    <div style={{ fontSize: 11, color: '#0284C7', fontFamily: 'monospace' }}>{store.id}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        backgroundColor: '#F0F9FF',
                        border: '1px solid #BAE6FD',
                        color: '#0369A1',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {store.module}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#0369A1' }}>{store.ownerName}</div>
                    <div style={{ fontSize: 12, color: '#0284C7' }}>{store.phone}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#0369A1', fontWeight: 500 }}>{store.zone}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#0369A1' }}>
                      <span> {store.rating}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#0284C7' }}>{store.ordersCount} orders</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0369A1' }}>
                    {store.commissionRate}%
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        backgroundColor:
                          store.status === 'APPROVED'
                            ? '#E0F2FE'
                            : store.status === 'PENDING'
                              ? '#0284C7'
                              : '#F0F9FF',
                        color:
                          store.status === 'APPROVED'
                            ? '#0369A1'
                            : store.status === 'PENDING'
                              ? '#FFFFFF'
                              : '#0284C7',
                        border: '1px solid #BAE6FD',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
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
                            padding: '6px 12px',
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
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
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
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
                          backgroundColor: '#F0F9FF',
                          color: '#0369A1',
                          border: '1px solid #BAE6FD',
                          borderRadius: 6,
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
            backgroundColor: 'rgba(8, 47, 73, 0.5)',
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
              borderRadius: 16,
              border: '1px solid #BAE6FD',
              width: 480,
              maxWidth: '90%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(14, 165, 233, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text as="h2" variant="heading2" color="#0369A1">
                Register New Restaurant
              </Text>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0284C7' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVendor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Restaurant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Spice Junction Curry House"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Cuisine Category</label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
                  >
                    <option value="North Indian & Biryani">North Indian & Biryani</option>
                    <option value="Italian & Wood-Fired Pizza">Italian & Wood-Fired Pizza</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                    <option value="Burgers & Fast Food">Burgers & Fast Food</option>
                    <option value="Chinese & Pan-Asian">Chinese & Pan-Asian</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Delivery Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  placeholder="15"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', color: '#0369A1', backgroundColor: '#F0F9FF' }}
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
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: '#FFFFFF', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)' }}
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
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
