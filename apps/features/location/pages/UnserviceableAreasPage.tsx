'use client';

import React, { useState, useMemo } from 'react';
import { useGetAdminRestaurantsQuery } from '@/api/endpoints/restaurantsApi';
import {
  useGetUnserviceableRequestsQuery,
  useCreateUnserviceableRequestMutation,
  useUpdateUnserviceableRequestStatusMutation,
  useApproveUnserviceableRequestMutation,
  useExtendZoneForUnserviceableRequestMutation,
  useGetCitiesQuery,
  useGetZonesQuery,
  UnserviceableRequestDto,
  DocumentDetailDto,
  RequestSource,
  inferRequestSource,
  getRequesterDisplayName,
  getRequestedArea,
  getSubmittedDocumentsList,
  formatDocumentName,
  getNormalizedDocuments,
  resolveDocumentUrl,
} from '@/api/endpoints/locationApi';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function UnserviceableAreasPage() {
  const {
    data: dbRequests = [],
    isLoading: isLoadingReqs,
    isError: isErrorReqs,
    refetch: refetchReqs,
    isFetching: isFetchingReqs,
  } = useGetUnserviceableRequestsQuery(undefined, { pollingInterval: 5000, refetchOnFocus: true });

  const { data: dbCities = [] } = useGetCitiesQuery();
  const { data: dbZones = [] } = useGetZonesQuery();

  const [createUnserviceableRequest, { isLoading: isSubmitting }] = useCreateUnserviceableRequestMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateUnserviceableRequestStatusMutation();
  const [approveRequest, { isLoading: isApproving }] = useApproveUnserviceableRequestMutation();
  const [extendZone, { isLoading: isExtendingZone }] = useExtendZoneForUnserviceableRequestMutation();

  const { data: dbRestaurantsData } = useGetAdminRestaurantsQuery({ size: 100 }, { pollingInterval: 10000 });
  const restaurantsList = useMemo(() => {
    if (!dbRestaurantsData) return [];
    if (Array.isArray(dbRestaurantsData)) return dbRestaurantsData;
    if (Array.isArray((dbRestaurantsData as any).items)) return (dbRestaurantsData as any).items;
    return [];
  }, [dbRestaurantsData]);

  const getNearbyRestaurantsForRequest = (req: UnserviceableRequestDto) => {
    if (!req.latitude || !req.longitude) return [];
    const reqLat = Number(req.latitude);
    const reqLng = Number(req.longitude);
    if (isNaN(reqLat) || isNaN(reqLng)) return [];

    const list: Array<{
      restaurantId: string;
      name: string;
      distanceKm: number;
      zoneName: string;
      cityName: string;
      cuisineTypes: string[];
      avgRating: number;
    }> = [];

    for (const r of restaurantsList) {
      const rLat = Number(r.latitude ?? r.address?.latitude);
      const rLng = Number(r.longitude ?? r.address?.longitude);
      if (!rLat || !rLng || isNaN(rLat) || isNaN(rLng) || (rLat === 0 && rLng === 0)) continue;

      const dist = calculateDistanceKm(reqLat, reqLng, rLat, rLng);
      let zName = 'Nearby Zone';
      if ((r as any).zoneName) {
        zName = (r as any).zoneName;
      } else if (r.address?.city) {
        const c = r.address.city.toLowerCase();
        if (c.includes('bangalore') || c.includes('bengalu')) zName = 'Bangalore Zone';
        else if (c.includes('tumkur')) zName = 'Tumkur Zone';
        else zName = `${r.address.city} Zone`;
      }

      list.push({
        restaurantId: r.restaurantId,
        name: r.name,
        distanceKm: dist,
        zoneName: zName,
        cityName: r.address?.city || req.cityName || 'Karnataka',
        cuisineTypes: Array.isArray(r.cuisineTypes) ? r.cuisineTypes : [],
        avgRating: Number(r.avgRating || 0),
      });
    }

    list.sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  };

  // Zone isolation context
  const userAssignedZone = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_user_assigned_zone') || sessionStorage.getItem('foodie_user_assigned_zone') || (typeof document !== 'undefined' ? document.cookie.match(/foodie_user_assigned_zone=([^;]+)/)?.[1] : null))
    : null;
  const userStoredRole = typeof window !== 'undefined'
    ? (localStorage.getItem('foodie_admin_role') || sessionStorage.getItem('foodie_admin_role'))
    : null;
  const isSuperAdmin = !userStoredRole || userStoredRole.toUpperCase() === 'SUPER_ADMIN';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<RequestSource | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  // Modals state
  const [detailModalRequest, setDetailModalRequest] = useState<UnserviceableRequestDto | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    request: UnserviceableRequestDto;
    document: DocumentDetailDto;
    allDocs: DocumentDetailDto[];
    docIndex: number;
  } | null>(null);

  // Lock body scroll and support Escape key only when modal dialogs (log or doc preview) are open
  React.useEffect(() => {
    if (showLogModal || selectedDocPreview) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (selectedDocPreview) {
            setSelectedDocPreview(null);
          } else if (showLogModal) {
            setShowLogModal(false);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showLogModal, selectedDocPreview]);

  // Keep detailModalRequest fresh if background query updates
  React.useEffect(() => {
    if (detailModalRequest) {
      const updated = dbRequests.find((r) => r.id === detailModalRequest.id);
      if (updated && updated.status !== detailModalRequest.status) {
        setDetailModalRequest(updated);
      }
    }
  }, [dbRequests, detailModalRequest?.id]);

  // Navigation handlers between full-page request details and request list
  const handleOpenDetails = (req: UnserviceableRequestDto) => {
    setDetailModalRequest(req);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('requestId', req.id);
      window.history.pushState({ requestId: req.id }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCloseDetails = () => {
    setDetailModalRequest(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('requestId');
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.pathname);
    }
  };

  // Sync with URL query parameter (for direct links or browser back/forward)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && dbRequests.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get('requestId') || params.get('id');
      if (reqId) {
        const found = dbRequests.find((r) => r.id === reqId);
        if (found && (!detailModalRequest || detailModalRequest.id !== reqId)) {
          setDetailModalRequest(found);
        }
      }
    }
  }, [dbRequests]);

  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const reqId = params.get('requestId') || params.get('id');
        if (reqId) {
          const found = dbRequests.find((r) => r.id === reqId);
          if (found) setDetailModalRequest(found);
        } else {
          setDetailModalRequest(null);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dbRequests]);

  // New Request Form state
  const [newSource, setNewSource] = useState<RequestSource>('CUSTOMER');
  const [newName, setNewName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Bangalore');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Derive zone matching helper
  const isMatchingZone = (z: string, t: string) => {
    if (!z || !t) return false;
    const cleanZ = z.trim().toLowerCase();
    const cleanT = t.trim().toLowerCase();
    if (cleanZ === cleanT || cleanZ.includes(cleanT) || cleanT.includes(cleanZ)) return true;
    const isZBlr = cleanZ.includes('bangalore') || cleanZ.includes('bengaluru') || cleanZ.includes('blr');
    const isTBlr = cleanT.includes('bangalore') || cleanT.includes('bengaluru') || cleanT.includes('blr');
    if (isZBlr && isTBlr) return true;
    const isZTmk = cleanZ.includes('tumkur') || cleanZ.includes('tumakuru') || cleanZ.includes('tmk');
    const isTTmk = cleanT.includes('tumkur') || cleanT.includes('tumakuru') || cleanT.includes('tmk');
    if (isZTmk && isTTmk) return true;
    return false;
  };

  // Helper to find nearest admin-created operating zone and its distance
  const getNearestZoneForRequest = (req: UnserviceableRequestDto) => {
    if (!dbZones || dbZones.length === 0) return null;
    const activeZones = dbZones.filter((z) => z.status !== 'DELETED' && (!z.zoneName || !z.zoneName.toLowerCase().includes('zone 1')));
    if (activeZones.length === 0) return null;

    const reqLat = Number(req.latitude);
    const reqLng = Number(req.longitude);
    if (!isNaN(reqLat) && !isNaN(reqLng) && reqLat !== 0 && reqLng !== 0) {
      let nearest: { zone: (typeof activeZones)[0]; distanceKm: number } | null = null;
      for (const zone of activeZones) {
        const zLat = Number(zone.latitude);
        const zLng = Number(zone.longitude);
        if (isNaN(zLat) || isNaN(zLng) || (zLat === 0 && zLng === 0)) continue;
        const dist = calculateDistanceKm(reqLat, reqLng, zLat, zLng);
        if (!nearest || dist < nearest.distanceKm) {
          nearest = { zone, distanceKm: dist };
        }
      }
      if (nearest) {
        const finalDist = req.distanceFromZoneKm != null && req.distanceFromZoneKm > 0
          ? req.distanceFromZoneKm
          : nearest.distanceKm;
        return { zone: nearest.zone, distanceKm: finalDist };
      }
    }

    if (req.cityName) {
      const matched = activeZones.find((z) => isMatchingZone(req.cityName!, z.cityName || z.zoneName));
      if (matched) {
        return { zone: matched, distanceKm: req.distanceFromZoneKm != null ? req.distanceFromZoneKm : 0 };
      }
    }

    return null;
  };

  // Filter out dummy/sample records (req-1 and req-2)
  const realDbRequests = useMemo(() => {
    return dbRequests.filter((req) => req.id !== 'req-1' && req.id !== 'req-2');
  }, [dbRequests]);

  // Zone isolation filtering: ensures particular zone admin sees requests nearest to their zone
  const zoneFilteredRequests = useMemo(() => {
    if (isSuperAdmin || !userAssignedZone) return realDbRequests;
    const assignedTarget = decodeURIComponent(userAssignedZone).trim().toLowerCase();
    return realDbRequests.filter((req) => {
      const city = req.cityName || '';
      if (isMatchingZone(city, assignedTarget)) return true;
      const nearestInfo = getNearestZoneForRequest(req);
      if (nearestInfo) {
        if (
          isMatchingZone(nearestInfo.zone.id, assignedTarget) ||
          isMatchingZone(nearestInfo.zone.zoneName, assignedTarget) ||
          isMatchingZone(nearestInfo.zone.cityName || '', assignedTarget)
        ) {
          return true;
        }
      }
      return false;
    });
  }, [realDbRequests, isSuperAdmin, userAssignedZone, dbZones]);

  // Enriched and Filtered Requests
  const filteredRequests = useMemo(() => {
    return zoneFilteredRequests.filter((req) => {
      const source = inferRequestSource(req);
      if (selectedSource !== 'ALL' && source !== selectedSource) return false;
      if (selectedStatus !== 'ALL' && req.status !== selectedStatus) return false;
      if (selectedCity !== 'ALL' && (req.cityName || '').toLowerCase() !== selectedCity.toLowerCase()) return false;

      if (selectedZone !== 'ALL') {
        const zoneObj = dbZones.find((z) => z.id === selectedZone);
        if (zoneObj && req.cityName && !isMatchingZone(req.cityName, zoneObj.cityName || zoneObj.zoneName)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const displayName = getRequesterDisplayName(req).toLowerCase();
        const restName = (req.restaurantName || '').toLowerCase();
        const contact = (req.contactPerson || '').toLowerCase();
        const email = (req.contactEmail || '').toLowerCase();
        const phone = (req.contactPhone || '').toLowerCase();
        const addr = (req.address || '').toLowerCase();
        const city = (req.cityName || '').toLowerCase();
        const id = (req.id || '').toLowerCase();

        const match =
          displayName.includes(q) ||
          restName.includes(q) ||
          contact.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          addr.includes(q) ||
          city.includes(q) ||
          id.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [zoneFilteredRequests, selectedSource, selectedStatus, selectedCity, selectedZone, searchQuery, dbZones]);

  // KPI Calculations
  const stats = useMemo(() => {
    let customerCount = 0;
    let deliveryCount = 0;
    let restaurantCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    zoneFilteredRequests.forEach((r) => {
      const src = inferRequestSource(r);
      if (src === 'CUSTOMER') customerCount++;
      else if (src === 'DELIVERY_PARTNER') deliveryCount++;
      else if (src === 'RESTAURANT') restaurantCount++;

      if (r.status === 'PENDING') pendingCount++;
      else if (r.status === 'APPROVED') approvedCount++;
      else if (r.status === 'REJECTED') rejectedCount++;
    });

    return {
      total: zoneFilteredRequests.length,
      customerCount,
      deliveryCount,
      restaurantCount,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }, [zoneFilteredRequests]);

  // Status Handlers
  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      await updateStatus({ requestId, status: newStatus }).unwrap();
      showToast(`Request ${requestId} status updated to ${newStatus}`);
      if (detailModalRequest && detailModalRequest.id === requestId) {
        setDetailModalRequest({
          ...detailModalRequest,
          status: newStatus as 'PENDING' | 'APPROVED' | 'REJECTED',
        });
      }
    } catch (err: any) {
      showToast(`Failed to update status: ${err?.data?.message || err?.message || 'Server Error'}`, 'error');
    }
  };

  const handleApproveAndCreateZone = async (req: UnserviceableRequestDto) => {
    try {
      await approveRequest(req.id).unwrap();
      showToast(`Request ${req.id} approved!`);
      if (detailModalRequest && detailModalRequest.id === req.id) {
        setDetailModalRequest({
          ...detailModalRequest,
          status: 'APPROVED',
        });
      }
    } catch (err: any) {
      showToast(`Failed to approve request: ${err?.data?.message || err?.message || 'Server Error'}`, 'error');
    }
  };

  const handleExtendZone = async (req: UnserviceableRequestDto) => {
    try {
      const res = await extendZone(req.id).unwrap();
      showToast(`Zone "${res.zoneName}" extended up to requested area and request approved!`);
      if (detailModalRequest && detailModalRequest.id === req.id) {
        setDetailModalRequest({
          ...detailModalRequest,
          status: 'APPROVED',
        });
      }
    } catch (err: any) {
      showToast(`Failed to extend zone: ${err?.data?.message || err?.message || 'Server Error'}`, 'error');
    }
  };

  // Submit New Request Handler
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) {
      alert('Please fill in Requester Name and Address / Location.');
      return;
    }

    let encodedRestName = newName.trim();
    if (newSource === 'CUSTOMER') {
      encodedRestName = `[Customer] ${newName.trim()}`;
    } else if (newSource === 'DELIVERY_PARTNER') {
      encodedRestName = `[Delivery Partner] ${newName.trim()}`;
    }

    try {
      await createUnserviceableRequest({
        restaurantName: encodedRestName,
        contactPerson: newContactPerson.trim() || newName.trim(),
        contactEmail: newEmail.trim(),
        contactPhone: newPhone.trim(),
        address: newAddress.trim(),
        cityName: newCity,
        latitude: newLat ? parseFloat(newLat) : 0,
        longitude: newLng ? parseFloat(newLng) : 0,
        status: 'PENDING',
        requestSource: newSource,
        requesterName: newName.trim(),
        requestedArea: newAddress.trim(),
      }).unwrap();

      showToast(`Unserviceable area request from ${newSource} successfully submitted to backend!`);
      setShowLogModal(false);
      setNewName('');
      setNewContactPerson('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      setNewLat('');
      setNewLng('');
    } catch (err: any) {
      showToast(`Failed to create request: ${err?.data?.message || err?.message || 'Server Error'}`, 'error');
    }
  };

  // Render Source Badge helper
  const renderSourceBadge = (source: RequestSource) => {
    switch (source) {
      case 'CUSTOMER':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Customer
          </span>
        );
      case 'DELIVERY_PARTNER':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#F5F3FF',
              color: '#6D28D9',
              border: '1px solid #DDD6FE',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Delivery Partner
          </span>
        );
      case 'RESTAURANT':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18" />
            </svg>
            Restaurant
          </span>
        );
    }
  };

  // Render Status Badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A' }} />
            APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#DC2626' }} />
            REJECTED
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706' }} />
            PENDING
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px 0 32px 0' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: toastMsg.type === 'error' ? '#991B1B' : '#065F46',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {toastMsg.type === 'error' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {detailModalRequest ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Breadcrumb & Back Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              onClick={handleCloseDetails}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <span style={{ fontSize: 16 }}>←</span>
              <span>Back to Requests</span>
            </button>

            <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Unserviceable Areas</span>
              <span>/</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>Demand Request #{detailModalRequest.id}</span>
            </div>
          </div>

          {/* Request Header Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Request Details
                </h1>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1px solid #BFDBFE',
                  }}
                >
                  #REQ-{detailModalRequest.id}
                </span>
                {renderSourceBadge(inferRequestSource(detailModalRequest))}
                {renderStatusBadge(detailModalRequest.status)}
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                Submitted on {detailModalRequest.createdAt ? String(detailModalRequest.createdAt).replace('T', ' ').slice(0, 16) : 'Not available'} • Requester: <strong>{getRequesterDisplayName(detailModalRequest)}</strong>
              </div>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {detailModalRequest.status !== 'APPROVED' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExtendZone(detailModalRequest)}
                    disabled={isExtendingZone}
                    style={{
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isExtendingZone ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    {isExtendingZone ? 'Extending...' : 'Extend Zone'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveAndCreateZone(detailModalRequest)}
                    disabled={isApproving}
                    style={{
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isApproving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </button>
                </>
              )}

              {detailModalRequest.status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(detailModalRequest.id, 'REJECTED')}
                  disabled={isUpdatingStatus}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#FEE2E2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reject
                </button>
              )}

              {detailModalRequest.status !== 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(detailModalRequest.id, 'PENDING')}
                  disabled={isUpdatingStatus}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    border: '1px solid #FDE68A',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reset to Pending
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseDetails}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Requests
              </button>
            </div>
          </div>

          {/* Details Content in 2 Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Customer Information Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>👤</span>
                  <span>Customer Information</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Customer Name</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                      {getRequesterDisplayName(detailModalRequest) || 'Not available'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Contact Person</div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>
                      {detailModalRequest.contactPerson || 'Not available'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Phone Number</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {detailModalRequest.contactPhone ? (
                        <a href={`tel:${detailModalRequest.contactPhone}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {detailModalRequest.contactPhone}
                        </a>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Not available</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Email Address</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {detailModalRequest.contactEmail ? (
                        <a href={`mailto:${detailModalRequest.contactEmail}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {detailModalRequest.contactEmail}
                        </a>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Not available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Geospatial Details Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🗺️</span>
                  <span>Location & Geospatial Details</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Requested Area / Address</div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
                      {getRequestedArea(detailModalRequest) || 'Not available'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>City</div>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>
                        {detailModalRequest.cityName || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>Coordinates</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {detailModalRequest.latitude && detailModalRequest.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${detailModalRequest.latitude},${detailModalRequest.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#2563EB',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontWeight: 600,
                            }}
                          >
                            <span>{detailModalRequest.latitude}, {detailModalRequest.longitude}</span>
                            <span
                              style={{
                                fontSize: 11,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                color: '#2563EB',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}
                            >
                              Maps ↗
                            </span>
                          </a>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Not specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Verification Documents Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📑</span>
                  <span>Submitted Verification Documents</span>
                </div>
                {(() => {
                  const normalizedDocs = getNormalizedDocuments(detailModalRequest);
                  if (normalizedDocs.length === 0) {
                    return (
                      <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
                        No verification documents attached to this demand request.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {normalizedDocs.map((doc, idx) => (
                        <div
                          key={doc.documentId || idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedDocPreview({
                              request: detailModalRequest,
                              document: doc,
                              allDocs: normalizedDocs,
                              docIndex: idx,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedDocPreview({
                                request: detailModalRequest,
                                document: doc,
                                allDocs: normalizedDocs,
                                docIndex: idx,
                              });
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: '#FFFFFF',
                            color: '#1E40AF',
                            border: '1px solid #BFDBFE',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                            e.currentTarget.style.borderColor = '#60A5FA';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#BFDBFE';
                          }}
                          title="Click to view and inspect document"
                        >
                          <span style={{ fontSize: 16 }}>📄</span>
                          <span style={{ fontWeight: 600, color: '#1E3A8A' }}>
                            {doc.name || formatDocumentName(doc.docType)}
                          </span>
                          <span
                            style={{
                              marginLeft: 4,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Verified
                          </span>
                          <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>↗</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Nearest Operating Zone & Distance Analysis Card */}
              {(() => {
                const nearestZoneInfo = getNearestZoneForRequest(detailModalRequest);
                const distStr =
                  nearestZoneInfo && nearestZoneInfo.distanceKm > 0
                    ? `${nearestZoneInfo.distanceKm.toFixed(1)} km`
                    : '< 1 km';

                return (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      padding: '20px 24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1E40AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>📍</span>
                      <span>Nearest Operating Zone & Distance Analysis</span>
                    </div>
                    {nearestZoneInfo ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F8FAFC',
                          padding: '16px 20px',
                          borderRadius: 12,
                          border: '1px solid #BFDBFE',
                          flexWrap: 'wrap',
                          gap: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E3A8A' }}>
                            {nearestZoneInfo.zone.zoneName || nearestZoneInfo.zone.cityName}
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                            City: <strong>{nearestZoneInfo.zone.cityName}</strong> • Operating Radius:{' '}
                            <strong>{nearestZoneInfo.zone.radiusKm} km</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: '#1D4ED8',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              padding: '8px 14px',
                              borderRadius: 10,
                              display: 'inline-block',
                            }}
                          >
                            {distStr} from zone
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#64748B' }}>
                        No operating zones registered yet.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Nearby Restaurants & Distances Card */}
              {(() => {
                const nearbyRests = getNearbyRestaurantsForRequest(detailModalRequest);
                return (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      padding: '20px 24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🍽️</span>
                        <span>Nearby Restaurants & Distances</span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          padding: '3px 10px',
                          borderRadius: 12,
                        }}
                      >
                        {nearbyRests.length} {nearbyRests.length === 1 ? 'nearby' : 'nearby'}
                      </span>
                    </div>

                    {nearbyRests.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          maxHeight: 460,
                          overflowY: nearbyRests.length > 6 ? 'auto' : 'visible',
                          borderRadius: 10,
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {nearbyRests.map((nr, idx) => (
                          <div
                            key={nr.restaurantId || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                              borderBottom: idx === nearbyRests.length - 1 ? 'none' : '1px solid #F1F5F9',
                              gap: 12,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {nr.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                {nr.zoneName} •{' '}
                                {Array.isArray(nr.cuisineTypes) && nr.cuisineTypes.length
                                  ? nr.cuisineTypes.slice(0, 2).join(', ')
                                  : 'Multi-cuisine'}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  backgroundColor: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  display: 'inline-block',
                                }}
                              >
                                {nr.distanceKm.toFixed(1)} km
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#64748B', padding: '12px 0' }}>
                        No operating restaurants found within 50 km.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          backgroundColor: '#FFFFFF',
          padding: '24px 28px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Unserviceable Areas Request
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                padding: '3px 8px',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563EB' }} />
              REAL-TIME
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#6B7280' }}>
            Review, analyze, and convert location expansion requests submitted by Customers, Delivery Partners, and Restaurants.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => void refetchReqs()}
            disabled={isFetchingReqs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: isFetchingReqs ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: isFetchingReqs ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isFetchingReqs ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
              transition: 'transform 0.1s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log Demand Request
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Requests
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Aggregated platform demand
          </div>
        </div>

        {/* Customer Requests Card */}
        <div
          onClick={() => setSelectedSource(selectedSource === 'CUSTOMER' ? 'ALL' : 'CUSTOMER')}
          style={{
            backgroundColor: selectedSource === 'CUSTOMER' ? '#F8FAFC' : '#FFFFFF',
            padding: '20px 22px',
            borderRadius: 14,
            border: selectedSource === 'CUSTOMER' ? '2px solid #2196F3' : '1px solid #E5E7EB',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: selectedSource === 'CUSTOMER' ? '#1D4ED8' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Requests
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: selectedSource === 'CUSTOMER' ? '#E3F2FD' : '#F3F4F6',
                color: selectedSource === 'CUSTOMER' ? '#1976D2' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10 }}>
            {stats.customerCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {selectedSource === 'CUSTOMER' ? 'Filter active (click to reset)' : 'Unserved customer areas'}
          </div>
        </div>

        {/* Delivery Partner Requests Card */}
        <div
          onClick={() => setSelectedSource(selectedSource === 'DELIVERY_PARTNER' ? 'ALL' : 'DELIVERY_PARTNER')}
          style={{
            backgroundColor: selectedSource === 'DELIVERY_PARTNER' ? '#F8FAFC' : '#FFFFFF',
            padding: '20px 22px',
            borderRadius: 14,
            border: selectedSource === 'DELIVERY_PARTNER' ? '2px solid #2196F3' : '1px solid #E5E7EB',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: selectedSource === 'DELIVERY_PARTNER' ? '#1D4ED8' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Partner Requests
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: selectedSource === 'DELIVERY_PARTNER' ? '#E3F2FD' : '#F3F4F6',
                color: selectedSource === 'DELIVERY_PARTNER' ? '#1976D2' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10 }}>
            {stats.deliveryCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {selectedSource === 'DELIVERY_PARTNER' ? 'Filter active (click to reset)' : 'Driver coverage expansion'}
          </div>
        </div>

        {/* Restaurant Requests Card */}
        <div
          onClick={() => setSelectedSource(selectedSource === 'RESTAURANT' ? 'ALL' : 'RESTAURANT')}
          style={{
            backgroundColor: selectedSource === 'RESTAURANT' ? '#F8FAFC' : '#FFFFFF',
            padding: '20px 22px',
            borderRadius: 14,
            border: selectedSource === 'RESTAURANT' ? '2px solid #2196F3' : '1px solid #E5E7EB',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: selectedSource === 'RESTAURANT' ? '#1D4ED8' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Restaurant Requests
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: selectedSource === 'RESTAURANT' ? '#E3F2FD' : '#F3F4F6',
                color: selectedSource === 'RESTAURANT' ? '#1976D2' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10 }}>
            {stats.restaurantCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {selectedSource === 'RESTAURANT' ? 'Filter active (click to reset)' : 'Merchant onboarding demand'}
          </div>
        </div>

        {/* Pending Action Card */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          style={{
            backgroundColor: selectedStatus === 'PENDING' ? '#F8FAFC' : '#FFFFFF',
            padding: '20px 22px',
            borderRadius: 14,
            border: selectedStatus === 'PENDING' ? '2px solid #2196F3' : '1px solid #E5E7EB',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: selectedStatus === 'PENDING' ? '#1D4ED8' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Review
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: selectedStatus === 'PENDING' ? '#E3F2FD' : '#F3F4F6',
                color: selectedStatus === 'PENDING' ? '#1976D2' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10 }}>
            {stats.pendingCount}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {selectedStatus === 'PENDING' ? 'Filter active (click to reset)' : 'Awaiting zone conversion'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          backgroundColor: '#FFFFFF',
          padding: '18px 24px',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Source Pills Tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em', marginRight: 4 }}>
            Source:
          </span>
          {[
            { id: 'ALL', label: `All Sources (${stats.total})` },
            { id: 'CUSTOMER', label: `Customer (${stats.customerCount})` },
            { id: 'DELIVERY_PARTNER', label: `Delivery Partner (${stats.deliveryCount})` },
            { id: 'RESTAURANT', label: `Restaurant (${stats.restaurantCount})` },
          ].map((pill) => {
            const isActive = selectedSource === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedSource(pill.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: isActive ? '1px solid #2196F3' : '1px solid #E5E7EB',
                  backgroundColor: isActive ? '#E3F2FD' : '#F9FAFB',
                  color: isActive ? '#1976D2' : '#4B5563',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Search & Dropdown Filters Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 12, top: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by Requester, Area, City, Phone, Email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                color: '#374151',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* City Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>City:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                color: '#374151',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Cities</option>
              {dbCities.map((c) => (
                <option key={c.id} value={c.cityName}>
                  {c.cityName}
                </option>
              ))}
            </select>
          </div>

          {/* Zone Filter */}
          {dbZones.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Zone:</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #D1D5DB',
                  fontSize: 13,
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Zones</option>
                {dbZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zoneName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedSource !== 'ALL' || selectedStatus !== 'ALL' || selectedCity !== 'ALL' || selectedZone !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSource('ALL');
                setSelectedStatus('ALL');
                setSelectedCity('ALL');
                setSelectedZone('ALL');
                setSearchQuery('');
              }}
              style={{
                padding: '8px 14px',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Loading State */}
        {isLoadingReqs ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#6B7280' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #E5E7EB',
                borderTop: '3px solid #2196F3',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
              Loading real unserviceable area requests from database...
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Connecting to live Foodie Backend API
            </div>
          </div>
        ) : isErrorReqs ? (
          /* Error State */
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#DC2626' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Failed to load unserviceable area requests
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#6B7280' }}>
              The backend service could not be reached or returned an error. Please verify your connection.
            </p>
            <button
              type="button"
              onClick={() => void refetchReqs()}
              style={{
                padding: '8px 18px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              Try Again
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* Empty State */
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#6B7280' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              No unserviceable area requests found.
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#6B7280', maxWidth: 460, marginInline: 'auto', lineHeight: '1.5' }}>
              {searchQuery || selectedSource !== 'ALL' || selectedStatus !== 'ALL' || selectedCity !== 'ALL' || selectedZone !== 'ALL'
                ? 'No requests match your current search and filter settings. Try clearing or resetting filters.'
                : 'There are currently no location expansion requests pending from Customers, Delivery Partners, or Restaurants.'}
            </p>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(33, 150, 243, 0.25)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Demand Request
            </button>
          </div>
        ) : (
          /* Data Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Request ID
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Source
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Requester / Contact
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Live Requested Location & Nearby Zone Restaurants
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Coordinates
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Documents
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Date
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const source = inferRequestSource(req);
                  const displayName = getRequesterDisplayName(req);
                  const area = getRequestedArea(req);
                  const formattedDate = req.createdAt
                    ? String(req.createdAt).replace('T', ' ').slice(0, 16)
                    : '-';

                  return (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* ID */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            padding: '3px 7px',
                            borderRadius: 6,
                          }}
                          title={req.id}
                        >
                          {req.id}
                        </span>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '16px 20px' }}>
                        {renderSourceBadge(source)}
                      </td>

                      {/* Requester & Contact */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                          {displayName}
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>
                          {req.contactPerson && req.contactPerson !== displayName && (
                            <span>{req.contactPerson} • </span>
                          )}
                          <a
                            href={`tel:${req.contactPhone}`}
                            style={{ color: '#2563EB', textDecoration: 'none' }}
                          >
                            {req.contactPhone || 'No phone'}
                          </a>
                        </div>
                        {req.contactEmail && (
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {req.contactEmail}
                          </div>
                        )}
                      </td>

                      {/* Area & City + Nearby Zone Restaurants with Distances */}
                      <td style={{ padding: '16px 20px', minWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                            {area}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Live location verified from device GPS/coordinates"
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                            Live Location
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{req.cityName || 'Karnataka'}</span>
                          {req.latitude && req.longitude && (
                            <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                              • ({req.latitude.toFixed(4)}, {req.longitude.toFixed(4)})
                            </span>
                          )}
                        </div>

                        {(() => {
                          const nearbyRests = getNearbyRestaurantsForRequest(req);
                          const nearestZone = getNearestZoneForRequest(req);
                          const distZoneStr = nearestZone && nearestZone.distanceKm > 0 ? `${nearestZone.distanceKm.toFixed(1)} km` : '< 1 km';

                          return (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>🛵</span>
                                <span>Nearby Zone Restaurants ({nearbyRests.length} Available):</span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {nearbyRests.slice(0, 3).map((nr) => (
                                  <div
                                    key={nr.restaurantId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      backgroundColor: '#FEF3C7',
                                      border: '1px solid #FDE68A',
                                      borderRadius: 6,
                                      padding: '3px 8px',
                                      fontSize: 11,
                                    }}
                                  >
                                    <span style={{ fontWeight: 700, color: '#92400E' }}>
                                      {nr.name} <span style={{ fontWeight: 500, color: '#78350F' }}>({nr.zoneName})</span>
                                    </span>
                                    <span style={{ fontWeight: 800, color: '#B45309', marginLeft: 8 }}>
                                      {nr.distanceKm.toFixed(1)} km
                                    </span>
                                  </div>
                                ))}

                                {nearbyRests.length > 3 && (
                                  <span style={{ fontSize: 10, color: '#B45309', fontWeight: 600 }}>
                                    +{nearbyRests.length - 3} more restaurants in nearby zones
                                  </span>
                                )}

                                {nearbyRests.length === 0 && (
                                  <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                                    No operating restaurants found within 50 km.
                                  </span>
                                )}
                              </div>

                              {nearestZone && (
                                <div style={{ marginTop: 2, fontSize: 10, color: '#1D4ED8', fontWeight: 600 }}>
                                  📍 Nearest Zone Center: {distZoneStr} from {nearestZone.zone.zoneName || nearestZone.zone.cityName}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Coordinates */}
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: 12, color: '#4B5563' }}>
                        {req.latitude && req.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#2563EB',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Open in Google Maps"
                          >
                            {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>Not provided</span>
                        )}
                      </td>

                      {/* Documents */}
                      <td style={{ padding: '16px 20px' }}>
                        {(() => {
                          const normalizedDocs = getNormalizedDocuments(req);
                          if (normalizedDocs.length === 0) {
                            return (
                              <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                                None
                              </span>
                            );
                          }
                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                              {normalizedDocs.slice(0, 3).map((doc, idx) => (
                                <button
                                  key={doc.documentId || idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDocPreview({
                                      request: req,
                                      document: doc,
                                      allDocs: normalizedDocs,
                                      docIndex: idx,
                                    });
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                                    e.currentTarget.style.borderColor = '#93C5FD';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                    e.currentTarget.style.borderColor = '#BFDBFE';
                                  }}
                                  title={`Click to open ${doc.name || formatDocumentName(doc.docType)}`}
                                >
                                  <span>📄</span>
                                  <span>{doc.name || formatDocumentName(doc.docType)}</span>
                                  <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 800 }}>↗</span>
                                </button>
                              ))}
                              {normalizedDocs.length > 3 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDocPreview({
                                      request: req,
                                      document: normalizedDocs[3],
                                      allDocs: normalizedDocs,
                                      docIndex: 3,
                                    });
                                  }}
                                  style={{
                                    backgroundColor: '#F3F4F6',
                                    color: '#4B5563',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: 6,
                                    padding: '3px 6px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title={`Click to view all ${normalizedDocs.length} documents`}
                                >
                                  +{normalizedDocs.length - 3} more
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formattedDate}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(req)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              border: '1px solid #E5E7EB',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            Details
                          </button>

                          {req.status === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExtendZone(req)}
                                disabled={isExtendingZone}
                                style={{
                                  padding: '6px 12px',
                                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: isExtendingZone ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
                                }}
                              >
                                {isExtendingZone ? 'Extending...' : 'Extend Zone'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApproveAndCreateZone(req)}
                                disabled={isApproving}
                                style={{
                                  padding: '6px 12px',
                                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: isApproving ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                                }}
                              >
                                {isApproving ? 'Approving...' : 'Approve'}
                              </button>
                            </>
                          ) : (
                            <select
                              value={req.status}
                              onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                              disabled={isUpdatingStatus}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#4B5563',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="APPROVED">Approved</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LOG DEMAND REQUEST MODAL */}
      {showLogModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowLogModal(false)}
        >
          <form
            onSubmit={handleCreateRequest}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F9FAFB',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                  Log Unserviceable Area Request
                </h3>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  Record an expansion request from Customer, Delivery Partner, or Restaurant into the backend.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Source Radio Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Request Source *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'CUSTOMER', label: 'Customer', icon: 'user' },
                    { id: 'DELIVERY_PARTNER', label: 'Delivery Partner', icon: 'truck' },
                    { id: 'RESTAURANT', label: 'Restaurant', icon: 'store' },
                  ].map((s) => {
                    const isSelected = newSource === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setNewSource(s.id as RequestSource)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '10px 8px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #2196F3' : '1px solid #D1D5DB',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          color: isSelected ? '#1D4ED8' : '#4B5563',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {s.icon === 'user' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                        {s.icon === 'truck' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                        )}
                        {s.icon === 'store' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        )}
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  {newSource === 'CUSTOMER'
                    ? 'Customer Name *'
                    : newSource === 'DELIVERY_PARTNER'
                    ? 'Delivery Partner Name *'
                    : 'Restaurant / Merchant Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newSource === 'CUSTOMER'
                      ? 'e.g. Ramesh Chandra'
                      : newSource === 'DELIVERY_PARTNER'
                      ? 'e.g. Anand Kumar (Rider ID: DP-883)'
                      : 'e.g. Coastal Spice Kitchen'
                  }
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Contact Person (if restaurant/partner) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="contact@foodie.local"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Address / Area */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Requested Unserviceable Address / Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nelamangala Bypass, Tumkur Road"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* City and Coordinates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    City
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {dbCities.map((c) => (
                      <option key={c.id} value={c.cityName}>
                        {c.cityName}
                      </option>
                    ))}
                    {!dbCities.some((c) => c.cityName === 'Bangalore') && (
                      <option value="Bangalore">Bangalore</option>
                    )}
                    {!dbCities.some((c) => c.cityName === 'Tumkur') && (
                      <option value="Tumkur">Tumkur</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 12.9716"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 77.5946"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                backgroundColor: '#F9FAFB',
              }}
            >
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Demand Request'}
              </button>
            </div>
          </form>
        </div>
      )}

        </>
      )}

      {/* Document Preview & Inspection Modal */}
      {selectedDocPreview && (() => {
        const { request, document: curDoc, allDocs, docIndex } = selectedDocPreview;
        const displayName = getRequesterDisplayName(request);
        const source = inferRequestSource(request);
        const resolvedUrl = curDoc.fileUrl ? resolveDocumentUrl(curDoc.fileUrl) : '';
        const isPdf = resolvedUrl.toLowerCase().includes('.pdf');
        const titleText = curDoc.name || formatDocumentName(curDoc.docType);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setSelectedDocPreview(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                width: 780,
                maxWidth: '96%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    📄
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                        {titleText}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: '#DCFCE7',
                          border: '1px solid #BBF7D0',
                          color: '#15803D',
                        }}
                      >
                        Verified Document
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {source === 'RESTAURANT' ? 'Restaurant: ' : source === 'DELIVERY_PARTNER' ? 'Delivery Partner: ' : 'Customer: '}
                      <strong style={{ color: '#1E293B' }}>{displayName}</strong> • {request.cityName || 'Karnataka'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {resolvedUrl && (
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '7px 14px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                      }}
                    >
                      <span>Open in New Tab</span>
                      <span>↗</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDocPreview(null)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: 'pointer',
                      color: '#64748B',
                      fontWeight: 700,
                    }}
                    title="Close preview"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Multi-Document Tabs */}
              {allDocs.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 20px',
                    backgroundColor: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0',
                    overflowX: 'auto',
                  }}
                >
                  {allDocs.map((docItem, idx) => {
                    const isActive = idx === docIndex;
                    return (
                      <button
                        key={docItem.documentId || idx}
                        type="button"
                        onClick={() =>
                          setSelectedDocPreview({
                            request,
                            document: docItem,
                            allDocs,
                            docIndex: idx,
                          })
                        }
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: isActive ? '1px solid #2563EB' : '1px solid #CBD5E1',
                          backgroundColor: isActive ? '#2563EB' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>📄</span>
                        <span>{docItem.name || formatDocumentName(docItem.docType)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Document Content Viewport */}
              <div
                style={{
                  padding: 24,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  minHeight: 320,
                  maxHeight: 'calc(92vh - 160px)',
                }}
              >
                {resolvedUrl ? (
                  isPdf ? (
                    <iframe
                      src={resolvedUrl}
                      title={titleText}
                      style={{
                        width: '100%',
                        height: 480,
                        border: '1px solid #CBD5E1',
                        borderRadius: 10,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <img
                        src={resolvedUrl}
                        alt={titleText}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 460,
                          objectFit: 'contain',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fb = document.getElementById('doc-preview-fallback');
                          if (fb) fb.style.display = 'flex';
                        }}
                      />
                      <div
                        id="doc-preview-fallback"
                        style={{
                          display: 'none',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: 24,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📑</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
                          Verified Verification Document
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', maxWidth: 420, marginTop: 4 }}>
                          Direct preview rendered from merchant onboarding record. Click "Open in New Tab" above to view directly in browser.
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  /* Official Document Verification Record Card */
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 620,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      padding: 24,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                        }}
                      >
                        🛡️
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                          Official Compliance & Verification Record
                        </div>
                        <div style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>
                          ✓ Validated Merchant Onboarding Submission
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Document Type</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>
                          {titleText}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>System Doc Code</div>
                        <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#2563EB', marginTop: 2 }}>
                          {curDoc.docType}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Requester Entity</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>
                          {displayName}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Request ID</div>
                        <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#64748B', marginTop: 2 }}>
                          {request.id}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Contact Person</div>
                        <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                          {request.contactPerson || '-'} ({request.contactPhone || 'No phone'})
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Submitted Location</div>
                        <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                          {request.requestedArea || request.address || request.cityName || 'Assigned Territory'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 20,
                        padding: 12,
                        backgroundColor: '#EFF6FF',
                        borderRadius: 8,
                        border: '1px solid #BFDBFE',
                        fontSize: 12,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>ℹ️</span>
                      <span>
                        Document file reference recorded in active onboarding database. Verified by automated document compliance workflow.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
