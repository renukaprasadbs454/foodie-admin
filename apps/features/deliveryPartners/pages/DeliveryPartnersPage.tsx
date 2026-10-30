'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text, trackAnalyticsEvent, useTheme } from 'foodie-shared-web';
import { GAP_API_15_PARTNER_LIST } from '@/constants/gaps';
import { DeliveryPricingSettingsCard } from '../components/DeliveryPricingSettingsCard';
import {
  useGetAdminDeliveryPartnersQuery,
  useApproveDeliveryPartnerKycMutation,
  useRejectDeliveryPartnerKycMutation,
  useSuspendDeliveryPartnerMutation,
  useGetAdminShiftsQuery,
  useCreateDeliveryShiftMutation,
  useUpdateDeliveryShiftMutation,
  useDeleteDeliveryShiftMutation,
  type DeliveryShift,
} from '@/api/endpoints/deliveryPartnersApi';
import { useGetZonesQuery } from '@/api/endpoints/locationApi';
import { usePermissions } from '@/context/PermissionContext';
import {
  isDeliveryPartnerKycEligible,
  type AdminDeliveryPartner,
  type DeliveryDocument,
  type DeliverymanRecord,
} from '../types';
export type { DeliverymanRecord };

function resolveDocumentUrl(doc?: DeliveryDocument | any): string {
  if (!doc) return '';
  const raw = doc.fileUrl || doc.downloadUrl || doc.fileKey || doc.s3Key || '';
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api/v1/storage/')) {
    return trimmed.replace('/api/v1/storage/', '/api/bff/storage/');
  }
  if (trimmed.startsWith('/api/bff/storage/')) {
    return trimmed;
  }
  if (trimmed.startsWith('storage/')) {
    return `/api/bff/${trimmed}`;
  }
  if (trimmed.startsWith('delivery-partners/')) {
    return `/api/bff/storage/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/api/bff/storage/${trimmed}`;
}

function formatDocType(type?: string): { label: string } {
  const t = (type || 'DOCUMENT').toUpperCase();
  if (t === 'IDENTITY' || t.includes('AADHAAR') || t.includes('PAN') || t.includes('PASSPORT')) {
    return { label: 'Identity Proof (Aadhaar / PAN)' };
  }
  if (t === 'LICENSE' || t === 'DRIVING_LICENCE' || t === 'DRIVING_LICENSE' || t.includes('LICENCE') || t.includes('LICENSE')) {
    return { label: 'Driving Licence' };
  }
  if (t === 'VEHICLE_RC' || t.includes('RC') || t.includes('VEHICLE')) {
    return { label: 'Vehicle Registration (RC)' };
  }
  return { label: t.replace(/_/g, ' ') };
}

function isPdfDocument(url: string, doc?: DeliveryDocument | any): boolean {
  const u = (url || '').toLowerCase();
  const k = (doc?.fileKey || doc?.s3Key || doc?.downloadUrl || doc?.fileUrl || '').toLowerCase();
  return u.includes('.pdf') || k.includes('.pdf');
}

function convert24to12(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function isShiftZoneMatch(shiftZoneId?: string | null, targetZoneId?: string | null): boolean {
  if (!shiftZoneId || !targetZoneId) return false;
  const a = shiftZoneId.trim().toLowerCase();
  const b = targetZoneId.trim().toLowerCase();
  if (a === b) return true;
  const normA = a.startsWith('dz-') ? a.substring(3) : a;
  const normB = b.startsWith('dz-') ? b.substring(3) : b;
  if (normA === normB) return true;
  return a.includes(b) || b.includes(a) || normA.includes(normB) || normB.includes(normA);
}

export function DeliveryPartnersPage() {
  const { tokens } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED'>('ALL');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModalPartner, setRejectModalPartner] = useState<AdminDeliveryPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('Documents incomplete or unreadable');
  const [suspendModalPartner, setSuspendModalPartner] = useState<AdminDeliveryPartner | null>(null);
  const [suspendReason, setSuspendReason] = useState('Account suspended by Admin. Verification review in progress.');

  // Document Preview Modal State
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    partner: AdminDeliveryPartner;
    document: DeliveryDocument;
    docIndex: number;
  } | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [docLoadError, setDocLoadError] = useState(false);

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shiftFormError, setShiftFormError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    trackAnalyticsEvent('admin_delivery_partners_viewed', {
      gapId: GAP_API_15_PARTNER_LIST,
    });
  }, []);

  // Fetch partners with status and search filter from database (polls every 4s for live registrations)
  const {
    data: partnersData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetAdminDeliveryPartnersQuery(
    {
      status: statusFilter,
      search: debouncedSearch,
      page: 0,
      size: 100,
    },
    { pollingInterval: 4000 }
  );

  // Fetch full overview stats (all partners) to keep KPI cards accurate across tabs
  const { data: allPartnersData } = useGetAdminDeliveryPartnersQuery(
    {
      page: 0,
      size: 500,
    },
    { pollingInterval: 4000 }
  );

  const [approveKyc, { isLoading: isApproving }] = useApproveDeliveryPartnerKycMutation();
  const [rejectKyc, { isLoading: isRejecting }] = useRejectDeliveryPartnerKycMutation();
  const [suspendPartner, { isLoading: isSuspending }] = useSuspendDeliveryPartnerMutation();

  // Session & Zone Territory Management (Permission Context + localStorage persistence)
  const { profile } = usePermissions();
  const userStoredRole = typeof window !== 'undefined' ? localStorage.getItem('foodie_admin_role') : null;
  const isSuperAdmin = Boolean(
    (profile?.role && profile.role.toUpperCase() === 'SUPER_ADMIN') ||
    (userStoredRole && userStoredRole.toUpperCase() === 'SUPER_ADMIN')
  );
  const userAssignedZone =
    profile?.assignedZoneId ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('foodie_user_assigned_zone') ||
         sessionStorage.getItem('foodie_user_assigned_zone') ||
         (typeof document !== 'undefined' ? document.cookie.match(/foodie_user_assigned_zone=([^;]+)/)?.[1] : null))
      : null);
  const activeZoneId =
    !isSuperAdmin && userAssignedZone
      ? userAssignedZone
      : (typeof window !== 'undefined'
          ? (localStorage.getItem('foodie_active_zone_id') ||
             sessionStorage.getItem('foodie_active_zone_id') ||
             (typeof document !== 'undefined' ? document.cookie.match(/foodie_active_zone_id=([^;]+)/)?.[1] : null))
          : null);

  const { data: dbZones = [] } = useGetZonesQuery();
  const availableZones = React.useMemo(() => {
    const rawList = Array.isArray(dbZones)
      ? dbZones
      : ((dbZones as any)?.data || (dbZones as any)?.items || []);
    const list: Array<{ id: string; name: string }> = [];
    rawList.forEach((z: any) => {
      if (z && z.id && !list.some((item) => item.id.toLowerCase() === z.id.toLowerCase())) {
        list.push({ id: z.id, name: z.zoneName || z.cityName || z.name || z.id });
      }
    });
    return list;
  }, [dbZones]);

  const activeZoneName = React.useMemo(() => {
    if (profile?.assignedZoneName) return profile.assignedZoneName;
    if (activeZoneId) {
      const found = availableZones.find((z) => z.id.toLowerCase() === activeZoneId.toLowerCase());
      if (found) return found.name;
    }
    return (
      (typeof window !== 'undefined'
        ? (localStorage.getItem('foodie_active_zone_name') || sessionStorage.getItem('foodie_active_zone_name'))
        : null) ||
      activeZoneId ||
      'Assigned Zone'
    );
  }, [profile, activeZoneId, availableZones]);

  const [selectedShiftZone, setSelectedShiftZone] = useState<string>(
    !isSuperAdmin && activeZoneId ? activeZoneId : (activeZoneId || 'ALL')
  );

  useEffect(() => {
    if (!isSuperAdmin && activeZoneId) {
      setSelectedShiftZone(activeZoneId);
    }
  }, [isSuperAdmin, activeZoneId]);

  const [modalShiftZoneId, setModalShiftZoneId] = useState<string>(
    !isSuperAdmin && activeZoneId ? activeZoneId : (availableZones[0]?.id || 'dz-bangalore')
  );

  useEffect(() => {
    if (!isSuperAdmin && activeZoneId) {
      setModalShiftZoneId(activeZoneId);
    } else if (selectedShiftZone && selectedShiftZone !== 'ALL') {
      setModalShiftZoneId(selectedShiftZone);
    } else if (availableZones.length > 0 && !modalShiftZoneId) {
      setModalShiftZoneId(availableZones[0].id);
    }
  }, [isSuperAdmin, activeZoneId, selectedShiftZone, availableZones]);

  // Dynamic Shift Management from Backend Database using actual zone ID
  const shiftQueryParam = React.useMemo(() => {
    if (!isSuperAdmin && activeZoneId) {
      return { zoneId: activeZoneId };
    }
    if (isSuperAdmin && selectedShiftZone && selectedShiftZone !== 'ALL') {
      return { zoneId: selectedShiftZone };
    }
    return undefined;
  }, [isSuperAdmin, activeZoneId, selectedShiftZone]);

  const {
    data: rawShifts = [],
    isLoading: isLoadingShifts,
    isFetching: isFetchingShifts,
    refetch: refetchShifts,
  } = useGetAdminShiftsQuery(shiftQueryParam);

  const shifts: DeliveryShift[] = React.useMemo(() => {
    const targetZone = !isSuperAdmin
      ? activeZoneId
      : (selectedShiftZone && selectedShiftZone !== 'ALL' ? selectedShiftZone : null);

    if (!targetZone) {
      return rawShifts;
    }

    const cleanTarget = targetZone.trim().toLowerCase();
    const activeNameClean = (activeZoneName || '').trim().toLowerCase();

    return rawShifts.filter((s: DeliveryShift) => {
      const idMatch = isShiftZoneMatch(s.zoneId, cleanTarget);
      const sName = (s.zoneName || '').trim().toLowerCase();
      const nameMatch = Boolean(
        sName &&
          activeNameClean &&
          (sName === activeNameClean ||
            sName.includes(activeNameClean) ||
            activeNameClean.includes(sName))
      );
      return idMatch || nameMatch;
    });
  }, [rawShifts, isSuperAdmin, selectedShiftZone, activeZoneId, activeZoneName]);

  const [createShiftMutation, { isLoading: isSavingShift }] = useCreateDeliveryShiftMutation();
  const [updateShiftMutation, { isLoading: isUpdatingShift }] = useUpdateDeliveryShiftMutation();
  const [deleteShiftMutation, { isLoading: isDeletingShift }] = useDeleteDeliveryShiftMutation();
  const [shiftToDelete, setShiftToDelete] = useState<DeliveryShift | null>(null);
  const [editingShift, setEditingShift] = useState<DeliveryShift | null>(null);
  const [shiftStatus, setShiftStatus] = useState<string>('ACTIVE');

  const [localSuspendedPartnerIds, setLocalSuspendedPartnerIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('foodie_suspended_partners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const updateLocalSuspended = (partnerId: string, isSuspended: boolean) => {
    setLocalSuspendedPartnerIds((prev) => {
      const set = new Set(prev.map((id) => id.toLowerCase()));
      if (isSuspended) {
        set.add(partnerId.toLowerCase());
      } else {
        set.delete(partnerId.toLowerCase());
      }
      const updated = Array.from(set);
      try {
        localStorage.setItem('foodie_suspended_partners', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const rawPartners: AdminDeliveryPartner[] =
    (partnersData as any)?.items ??
    (partnersData as any)?.data?.items ??
    (Array.isArray(partnersData) ? partnersData : []);

  const rawAllPartners: AdminDeliveryPartner[] =
    (allPartnersData as any)?.items ??
    (allPartnersData as any)?.data?.items ??
    (Array.isArray(allPartnersData) ? allPartnersData : rawPartners);

  const applySuspensionToPartner = (p: AdminDeliveryPartner): AdminDeliveryPartner => {
    if (!p) return p;
    const isSuspendedLocally = localSuspendedPartnerIds.some(
      (id) => id.toLowerCase() === (p.id || '').toLowerCase()
    );
    if (isSuspendedLocally || p.kycStatus === 'SUSPENDED') {
      return {
        ...p,
        kycStatus: 'SUSPENDED',
        isOnline: false,
      };
    }
    return p;
  };

  const processedRawPartners = rawPartners.map(applySuspensionToPartner);
  const processedRawAllPartners = rawAllPartners.map(applySuspensionToPartner);

  // Enforce KYC visibility rule: must have zone selected & all 3 documents uploaded
  let partners: AdminDeliveryPartner[] = processedRawPartners.filter(isDeliveryPartnerKycEligible);
  const allPartners: AdminDeliveryPartner[] = processedRawAllPartners.filter(isDeliveryPartnerKycEligible);

  if (statusFilter === 'SUSPENDED') {
    partners = allPartners.filter((p) => p.kycStatus === 'SUSPENDED');
  } else if (statusFilter === 'VERIFIED') {
    partners = partners.filter((p) => p.kycStatus === 'VERIFIED');
  } else if (statusFilter === 'PENDING') {
    partners = partners.filter((p) => p.kycStatus === 'PENDING');
  } else if (statusFilter === 'REJECTED') {
    partners = partners.filter((p) => p.kycStatus === 'REJECTED');
  }

  // Dynamic Dashboard Counts
  const totalFleetCount = allPartners.length;
  const currentlyOnlineCount = allPartners.filter((p) => p.isOnline).length;
  const pendingKycCount = allPartners.filter((p) => p.kycStatus === 'PENDING').length;
  const suspendedCount = allPartners.filter((p) => p.kycStatus === 'SUSPENDED').length;
  const verifiedCount = allPartners.filter((p) => p.kycStatus === 'VERIFIED').length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenEditShift = (shift: DeliveryShift) => {
    setShiftFormError(null);
    setEditingShift(shift);
    setShiftName(shift.shiftName || '');
    setStartTime(shift.startTime || '');
    setEndTime(shift.endTime || '');
    setShiftStatus(shift.status || 'ACTIVE');
    setModalShiftZoneId(
      shift.zoneId ||
        (!isSuperAdmin && activeZoneId
          ? activeZoneId
          : selectedShiftZone !== 'ALL'
          ? selectedShiftZone
          : availableZones[0]?.id || 'dz-bangalore')
    );
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShiftFormError(null);

    const name = shiftName.trim();
    const start = startTime.trim();
    const end = endTime.trim();

    if (!name) {
      setShiftFormError('Please enter a Shift Name.');
      return;
    }
    if (!start) {
      setShiftFormError('Please specify a Start Time.');
      return;
    }
    if (!end) {
      setShiftFormError('Please specify an End Time.');
      return;
    }
    if (start.toLowerCase() === end.toLowerCase()) {
      setShiftFormError('Start Time and End Time cannot be equal.');
      return;
    }

    const finalZoneId = !isSuperAdmin && activeZoneId
      ? activeZoneId
      : (modalShiftZoneId || (availableZones[0]?.id || 'dz-bangalore'));
    const matchedZone = availableZones.find((z) => isShiftZoneMatch(z.id, finalZoneId));
    const finalZoneName = !isSuperAdmin && activeZoneName
      ? activeZoneName
      : (matchedZone
          ? matchedZone.name
          : (finalZoneId.startsWith('dz-') ? `${finalZoneId.substring(3).charAt(0).toUpperCase() + finalZoneId.substring(4)} Zone` : finalZoneId));

    try {
      if (editingShift && editingShift.shiftId) {
        await updateShiftMutation({
          shiftId: editingShift.shiftId,
          data: {
            shiftName: name,
            startTime: start,
            endTime: end,
            status: shiftStatus,
            zoneId: finalZoneId,
            zoneName: finalZoneName,
          },
        }).unwrap();
        showToast('success', `Delivery shift "${name}" updated for ${finalZoneName} successfully.`);
      } else {
        await createShiftMutation({
          shiftName: name,
          startTime: start,
          endTime: end,
          zoneId: finalZoneId,
          zoneName: finalZoneName,
        }).unwrap();
        showToast('success', `Delivery shift "${name}" saved for ${finalZoneName} successfully.`);
      }

      setIsShiftModalOpen(false);
      setEditingShift(null);
      setShiftName('');
      setStartTime('');
      setEndTime('');
      setShiftFormError(null);
      refetchShifts();
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.error ||
        'Failed to save shift to database. Please check your inputs and try again.';
      setShiftFormError(msg);
    }
  };

  const handleConfirmDeleteShift = async () => {
    if (!shiftToDelete || !shiftToDelete.shiftId) return;
    const name = shiftToDelete.shiftName;
    try {
      await deleteShiftMutation(shiftToDelete.shiftId).unwrap();
      showToast('success', `Delivery shift "${name}" deleted from database successfully.`);
      setShiftToDelete(null);
      refetchShifts();
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.error ||
        'Failed to delete shift from database.';
      showToast('error', msg);
    }
  };

  const handleApproveKyc = async (partner: AdminDeliveryPartner) => {
    try {
      updateLocalSuspended(partner.id, false);
      await approveKyc(partner.id).unwrap();
      showToast('success', `KYC for "${partner.fullName}" approved successfully.`);
      if (selectedDocPreview && selectedDocPreview.partner.id === partner.id) {
        setSelectedDocPreview({
          ...selectedDocPreview,
          partner: { ...selectedDocPreview.partner, kycStatus: 'VERIFIED' },
          document: { ...selectedDocPreview.document, verificationStatus: 'VERIFIED' },
        });
      }
      refetch();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message ?? 'Failed to approve KYC.');
    }
  };

  const handleConfirmRejectKyc = async () => {
    if (!rejectModalPartner) return;
    try {
      updateLocalSuspended(rejectModalPartner.id, false);
      await rejectKyc({
        partnerId: rejectModalPartner.id,
        reason: rejectReason.trim() || 'Documents invalid or incomplete',
      }).unwrap();
      showToast('success', `KYC for "${rejectModalPartner.fullName}" marked as REJECTED.`);
      if (selectedDocPreview && selectedDocPreview.partner.id === rejectModalPartner.id) {
        setSelectedDocPreview({
          ...selectedDocPreview,
          partner: { ...selectedDocPreview.partner, kycStatus: 'REJECTED' },
          document: { ...selectedDocPreview.document, verificationStatus: 'REJECTED' },
        });
      }
      setRejectModalPartner(null);
      setRejectReason('Documents incomplete or unreadable');
      refetch();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message ?? 'Failed to reject KYC.');
    }
  };

  const handleConfirmSuspendPartner = async () => {
    if (!suspendModalPartner) return;
    const partnerId = suspendModalPartner.id;
    updateLocalSuspended(partnerId, true);
    try {
      await suspendPartner({
        partnerId,
        reason: suspendReason.trim() || 'Account suspended by Admin. Verification review in progress.',
      }).unwrap();
      showToast('success', `Delivery partner "${suspendModalPartner.fullName}" suspended. Status set to SUSPENDED.`);
      if (selectedDocPreview && selectedDocPreview.partner.id === partnerId) {
        setSelectedDocPreview({
          ...selectedDocPreview,
          partner: { ...selectedDocPreview.partner, kycStatus: 'SUSPENDED', isOnline: false },
          document: { ...selectedDocPreview.document, verificationStatus: 'PENDING' },
        });
      }
      setSuspendModalPartner(null);
      setSuspendReason('Account suspended by Admin. Verification review in progress.');
      refetch();
    } catch (err: any) {
      showToast('error', err?.data?.error?.message ?? err?.data?.message ?? 'Failed to suspend delivery partner.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text as="h1" variant="heading1" color="#111827" style={{ fontWeight: 800 }}>
            Delivery Fleet Management
          </Text>
          <Text as="p" variant="caption" color="#6B7280" style={{ marginTop: 4 }}>
            Real-time delivery fleet monitoring, live database partner records, KYC approvals & cash tracking
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              refetch();
              refetchShifts();
            }}
            disabled={isFetching || isFetchingShifts}
            style={{
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: isFetching || isFetchingShifts ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            {isFetching || isFetchingShifts ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            type="button"
            id="create-shift-button"
            onClick={() => {
              setShiftFormError(null);
              setEditingShift(null);
              setShiftName('');
              setStartTime('');
              setEndTime('');
              setShiftStatus('ACTIVE');
              setModalShiftZoneId(!isSuperAdmin && activeZoneId ? activeZoneId : (selectedShiftZone !== 'ALL' ? selectedShiftZone : (availableZones[0]?.id || 'dz-bangalore')));
              setIsShiftModalOpen(true);
            }}
            style={{
              padding: '10px 18px',
              backgroundColor: '#EA580C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C2410C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EA580C')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Shift
          </button>
        </div>
      </div>

      {/* 1. Delivery Partner List (First Section) */}
{/* Dynamic Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Total Registered Fleet
          </Text>
          <Text as="h2" variant="heading1" color="#111827" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : totalFleetCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Currently Online
          </Text>
          <Text as="h2" variant="heading1" color="#22C55E" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : currentlyOnlineCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Pending KYC Reviews
          </Text>
          <Text as="h2" variant="heading1" color="#F59E0B" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : pendingKycCount}
          </Text>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '22px 24px',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Text as="span" variant="caption" color="#6B7280" style={{ fontWeight: 600, fontSize: 13 }}>
            Verified Drivers
          </Text>
          <Text as="h2" variant="heading1" color="#2196F3" style={{ marginTop: 8, fontWeight: 800 }}>
            {isLoading ? '...' : verifiedCount}
          </Text>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'ALL', label: `All Fleet (${totalFleetCount})` },
              { key: 'VERIFIED', label: `Verified (${verifiedCount})` },
              { key: 'PENDING', label: `Pending KYC (${pendingKycCount})` },
              { key: 'SUSPENDED', label: `Suspended (${suspendedCount})` },
              { key: 'REJECTED', label: 'Rejected' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: isActive ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                  background: isActive ? '#E3F2FD' : '#FFFFFF',
                  color: isActive ? '#2196F3' : '#6B7280',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Search by Name, Phone, Vehicle No..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '9px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            width: 320,
            maxWidth: '100%',
            fontSize: 13,
            outline: 'none',
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {/* Dynamic Delivery Partners Table */}
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
              <th style={{ padding: '14px 20px' }}>Deliveryman Name</th>
              <th style={{ padding: '14px 20px' }}>Contact Phone</th>
              <th style={{ padding: '14px 20px' }}>Vehicle & Zone</th>
              <th style={{ padding: '14px 20px' }}>Documents & KYC</th>
              <th style={{ padding: '14px 20px' }}>Live Availability</th>
              <th style={{ padding: '14px 20px' }}>Cash in Hand</th>
              <th style={{ padding: '14px 20px' }}>KYC Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                  Loading dynamic delivery partner database records...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#EF4444' }}>
                  Unable to fetch delivery partners from server. Please verify backend is running.
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                    No delivery partners found
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    {searchQuery
                      ? `No partners matching "${searchQuery}" in ${statusFilter} tab`
                      : 'Delivery partners will appear here automatically when employees register'}
                  </div>
                </td>
              </tr>
            ) : (
              partners.map((p) => {
                const docs = p.documents || (p as any).docs || [];
                const docCount = docs.length;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{p.fullName || 'Unnamed Partner'}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                        ID: {p.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#374151' }}>
                      {p.phoneNumber || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {p.vehicleType || 'BIKE'} {p.vehicleNumber ? `• ${p.vehicleNumber}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{p.zone || 'Downtown Central'}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {docCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {docs.map((d: any, dIdx: number) => {
                            const status = d.verificationStatus || d.status || 'PENDING';
                            const docUrl = resolveDocumentUrl(d);
                            const key = d.documentId || d.id || `${p.id}-doc-${d.docType || dIdx}`;
                            const isVerified = status === 'VERIFIED';
                            const isRejected = status === 'REJECTED';

                            const statusBg = isVerified ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#E3F2FD';
                            const statusBorder = isVerified ? '#BBF7D0' : isRejected ? '#FECACA' : '#BFDBFE';
                            const statusColor = isVerified ? '#15803D' : isRejected ? '#B91C1C' : '#2196F3';

                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  backgroundColor: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: 8,
                                  padding: '4px 8px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDocLoading(true);
                                    setDocLoadError(false);
                                    setSelectedDocPreview({ partner: p, document: d, docIndex: dIdx });
                                  }}
                                  title="Click to preview document in modal"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: '#2196F3',
                                    fontWeight: 600,
                                    fontSize: 12,
                                  }}
                                >
                                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                                    {d.docType || 'DOCUMENT'}
                                  </span>
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDocLoading(true);
                                      setDocLoadError(false);
                                      setSelectedDocPreview({ partner: p, document: d, docIndex: dIdx });
                                    }}
                                    title="Click to view document"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      backgroundColor: statusBg,
                                      border: `1px solid ${statusBorder}`,
                                      color: statusColor,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {status}
                                  </button>

                                  {docUrl && (
                                    <a
                                      href={docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open original file in new browser tab"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 20,
                                        height: 20,
                                        borderRadius: 4,
                                        backgroundColor: '#E3F2FD',
                                        border: '1px solid #BFDBFE',
                                        color: '#2196F3',
                                        fontSize: 11,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                          No documents uploaded
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 20,
                          backgroundColor: p.isOnline ? '#DCFCE7' : '#F3F4F6',
                          color: p.isOnline ? '#15803D' : '#6B7280',
                          border: `1px solid ${p.isOnline ? '#BBF7D0' : '#E5E7EB'}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: p.isOnline ? '#22C55E' : '#9CA3AF',
                          }}
                        />
                        {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#111827' }}>
                      ₹{p.cashInHand ?? 0}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          backgroundColor:
                            p.kycStatus === 'VERIFIED'
                              ? '#DCFCE7'
                              : p.kycStatus === 'REJECTED'
                                ? '#FEE2E2'
                                : p.kycStatus === 'SUSPENDED'
                                  ? '#FEF3C7'
                                  : '#FEF3C7',
                          color:
                            p.kycStatus === 'VERIFIED'
                              ? '#15803D'
                              : p.kycStatus === 'REJECTED'
                                ? '#B91C1C'
                                : p.kycStatus === 'SUSPENDED'
                                  ? '#B45309'
                                  : '#B45309',
                          border:
                            p.kycStatus === 'VERIFIED'
                              ? '1px solid #BBF7D0'
                              : p.kycStatus === 'REJECTED'
                                ? '1px solid #FECACA'
                                : p.kycStatus === 'SUSPENDED'
                                  ? '1px solid #FDE68A'
                                  : '1px solid #FDE68A',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 20,
                          display: 'inline-block',
                        }}
                      >
                        {p.kycStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {p.kycStatus !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleApproveKyc(p)}
                            disabled={isApproving}
                            style={{
                              padding: '6px 14px',
                              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isApproving ? 'wait' : 'pointer',
                              boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                            }}
                          >
                            Approve KYC
                          </button>
                        )}
                        {p.kycStatus === 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSuspendReason('Account suspended by Admin. Verification review in progress.');
                              setSuspendModalPartner(p);
                            }}
                            disabled={isSuspending}
                            title="Suspend account and set verification status to SUSPENDED"
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isSuspending ? 'wait' : 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDE68A')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF3C7')}
                          >
                            Suspend
                          </button>
                        )}
                        {p.kycStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => setRejectModalPartner(p)}
                            disabled={isRejecting}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              border: '1px solid #FECACA',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isRejecting ? 'wait' : 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Delivery Fleet Management – My Shifts (Second Section) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          padding: '20px 24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text as="h3" variant="heading2" color="#111827" style={{ fontWeight: 700, fontSize: 16 }}>
                  Delivery Fleet Management – My Shifts
                </Text>
                <span
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Configured operating shifts saved permanently in backend database for fleet allocation
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              id="create-shift-section-button"
              onClick={() => {
                setShiftFormError(null);
                setEditingShift(null);
                setShiftName('');
                setStartTime('');
                setEndTime('');
                setShiftStatus('ACTIVE');
                setModalShiftZoneId(
                  !isSuperAdmin && activeZoneId
                    ? activeZoneId
                    : selectedShiftZone !== 'ALL'
                    ? selectedShiftZone
                    : availableZones[0]?.id || 'dz-bangalore'
                );
                setIsShiftModalOpen(true);
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: '#EA580C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(234, 88, 12, 0.25)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create Shift</span>
            </button>
            <button
            type="button"
            id="add-another-shift-button"
            onClick={() => {
              setShiftFormError(null);
              setEditingShift(null);
              setShiftName('');
              setStartTime('');
              setEndTime('');
              setShiftStatus('ACTIVE');
              setModalShiftZoneId(
                !isSuperAdmin && activeZoneId
                  ? activeZoneId
                  : selectedShiftZone !== 'ALL'
                  ? selectedShiftZone
                  : availableZones[0]?.id || 'dz-bangalore'
              );
              setIsShiftModalOpen(true);
            }}
            style={{
              padding: '6px 14px',
              backgroundColor: '#FFF7ED',
              color: '#EA580C',
              border: '1px solid #FFEDD5',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>+ Add Another Shift</span>
          </button>
          </div>
        </div>

        {/* Territory Scoped Banner for Zone Admin */}
        {!isSuperAdmin && (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 14,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E' }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#14532D' }}>
                  Delivery Shifts Territory: {activeZoneName}
                </span>
                <span style={{ fontSize: 12, color: '#166534', marginLeft: 8 }}>
                  (Showing operating shifts configured specifically for your zone)
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid #86EFAC',
              }}
            >
              Zone Scoped
            </span>
          </div>
        )}

        {/* Territory Selector Filter for Super Admin */}
        {isSuperAdmin && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6' }} />
              <div>
                <span id="shift-territory-filter-label" style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  Delivery Shifts Territory Filter: {selectedShiftZone === 'ALL' ? 'All Delivery Zones (Global View)' : (availableZones.find(z => z.id === selectedShiftZone)?.name || selectedShiftZone)}
                </span>
                <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
                  ({selectedShiftZone === 'ALL' ? 'Manage and isolate shifts across all distinct operating delivery zones' : `Filtered specifically to ${availableZones.find(z => z.id === selectedShiftZone)?.name || selectedShiftZone}`})
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="shift-zone-filter-select" style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                Active Zone Filter:
              </label>
              <select
                id="shift-zone-filter-select"
                value={selectedShiftZone}
                onChange={(e) => setSelectedShiftZone(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Delivery Zones (Global View)</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              {selectedShiftZone !== 'ALL' && (
                <button
                  type="button"
                  id="reset-shift-zone-filter-button"
                  onClick={() => setSelectedShiftZone('ALL')}
                  style={{
                    fontSize: 11,
                    padding: '5px 10px',
                    borderRadius: 6,
                    backgroundColor: '#E2E8F0',
                    border: 'none',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Shift List Cards */}
        {isLoadingShifts ? (
          <div style={{ fontSize: 13, color: '#9CA3AF', padding: '12px 0' }}>Loading saved shifts from backend database...</div>
        ) : shifts.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px dashed #E5E7EB',
              borderRadius: 12,
              backgroundColor: '#F9FAFB',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
              No Delivery Shifts Found {selectedShiftZone !== 'ALL' ? `for ${availableZones.find(z => z.id === selectedShiftZone)?.name || selectedShiftZone}` : ''}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              Click <strong>+ Add Another Shift</strong> above to configure operating shifts for delivery partners in this zone.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {shifts.map((s) => (
              <div
                key={s.shiftId || `${s.shiftName}-${s.startTime}`}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '14px 16px',
                  backgroundColor: '#FAFAFA',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.shiftName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: s.status === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6',
                        color: s.status === 'ACTIVE' ? '#15803D' : '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      {s.status}
                    </span>
                    <button
                      type="button"
                      id={`edit-shift-${s.shiftId}`}
                      onClick={() => handleOpenEditShift(s)}
                      title={`Edit "${s.shiftName}" shift`}
                      aria-label={`Edit "${s.shiftName}" shift`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: 6,
                        color: '#6B7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.color = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6B7280';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      id={`delete-shift-${s.shiftId}`}
                      onClick={() => setShiftToDelete(s)}
                      title={`Delete "${s.shiftName}" shift`}
                      aria-label={`Delete "${s.shiftName}" shift`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: 6,
                        color: '#9CA3AF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                        e.currentTarget.style.color = '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#9CA3AF';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5563' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>
                    <strong>{s.startTime}</strong> – <strong>{s.endTime}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {s.durationHours ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Duration:</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#EA580C',
                          backgroundColor: '#FFEDD5',
                          padding: '1px 6px',
                          borderRadius: 6,
                        }}
                      >
                        {s.durationHours}
                      </span>
                    </div>
                  ) : <div />}
                  <span
                    id={`shift-zone-tag-${s.shiftId}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    📍 {s.zoneName || (availableZones.find(z => isShiftZoneMatch(z.id, s.zoneId))?.name) || (s.zoneId ? (s.zoneId.startsWith('dz-') ? `${s.zoneId.substring(3).charAt(0).toUpperCase() + s.zoneId.substring(4)} Zone` : s.zoneId) : 'All Zones')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Delivery Partner Payout Structure & Incentives & 4. Formula & Interactive Payout Simulator */}
      <DeliveryPricingSettingsCard />

{/* Document Preview Modal */}
      {selectedDocPreview && (() => {
        const partner = selectedDocPreview.partner;
        const docs = partner.documents || (partner as any).docs || [];
        const currentDoc = selectedDocPreview.document;
        const currentUrl = resolveDocumentUrl(currentDoc);
        const docInfo = formatDocType(currentDoc.docType || currentDoc.type);
        const isPdf = isPdfDocument(currentUrl, currentDoc);
        const isPending = currentDoc.verificationStatus === 'PENDING';
        const isVerified = currentDoc.verificationStatus === 'VERIFIED';
        const isRejected = currentDoc.verificationStatus === 'REJECTED';

        const statusBg = isVerified ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#E3F2FD';
        const statusBorder = isVerified ? '#BBF7D0' : isRejected ? '#FECACA' : '#BFDBFE';
        const statusColor = isVerified ? '#15803D' : isRejected ? '#B91C1C' : '#2196F3';

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
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
                borderRadius: 20,
                width: 780,
                maxWidth: '96%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text as="h2" variant="heading2" color="#111827" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                      {docInfo.label}
                    </Text>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: statusBg,
                        border: `1px solid ${statusBorder}`,
                        color: statusColor,
                      }}
                    >
                      {currentDoc.verificationStatus || 'PENDING'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Partner: <strong style={{ color: '#111827' }}>{partner.fullName}</strong> ({partner.phoneNumber || 'No phone'})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentUrl && (
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        color: '#2196F3',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ↗ Open in New Tab
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocPreview(null)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      color: '#6B7280',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Multi-Document Switcher Tabs */}
              {docs.length > 1 && (
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                  }}
                >
                  {docs.map((docItem: any, idx: number) => {
                    const itemType = formatDocType(docItem.docType || docItem.type);
                    const isActive = selectedDocPreview.docIndex === idx;
                    const itemStatus = docItem.verificationStatus || docItem.status || 'PENDING';
                    return (
                      <button
                        key={docItem.documentId || docItem.id || `tab-${idx}`}
                        type="button"
                        onClick={() => {
                          setIsDocLoading(true);
                          setDocLoadError(false);
                          setSelectedDocPreview({
                            partner,
                            document: docItem,
                            docIndex: idx,
                          });
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: isActive ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                          backgroundColor: isActive ? '#E3F2FD' : '#FFFFFF',
                          color: isActive ? '#2196F3' : '#6B7280',
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{docItem.docType || 'Doc'}</span>
                        <span style={{ fontSize: 10, opacity: 0.85 }}>
                          ({itemStatus})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Document Preview Content Viewport */}
              <div
                style={{
                  flex: 1,
                  minHeight: 380,
                  maxHeight: '62vh',
                  padding: 20,
                  overflowY: 'auto',
                  backgroundColor: '#0F172A',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Loading indicator */}
                {isDocLoading && !docLoadError && currentUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      gap: 12,
                      color: '#E3F2FD',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Loading document preview...</span>
                  </div>
                )}

                {/* Main Media Preview */}
                {!currentUrl ? (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
                      Document File Not Found
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      No file URL or storage key was provided for this document record.
                    </div>
                  </div>
                ) : docLoadError ? (
                  <div style={{ textAlign: 'center', color: '#F87171', padding: 40, maxWidth: 440 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F87171' }}>
                      Unable to Render Inline Preview
                    </div>
                    <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 8, lineHeight: 1.5 }}>
                      The file format or network policy prevented direct preview rendering. You can still open and view the raw file directly:
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '10px 18px',
                          background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          textDecoration: 'none',
                        }}
                      >
                        ↗ Open File in Browser
                      </a>
                    </div>
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={currentUrl}
                    title={docInfo.label}
                    onLoad={() => setIsDocLoading(false)}
                    onError={() => {
                      setIsDocLoading(false);
                      setDocLoadError(true);
                    }}
                    style={{
                      width: '100%',
                      height: '520px',
                      border: 'none',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                ) : (
                  <img
                    src={currentUrl}
                    alt={docInfo.label}
                    onLoad={() => setIsDocLoading(false)}
                    onError={() => {
                      setIsDocLoading(false);
                      setDocLoadError(true);
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '520px',
                      objectFit: 'contain',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                )}
              </div>

              {/* Modal Footer with KYC Approval / Rejection Actions */}
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {currentDoc.uploadedAt ? (
                    <span>Uploaded: {new Date(currentDoc.uploadedAt).toLocaleString()}</span>
                  ) : (
                    <span>Format: {isPdf ? 'PDF Document' : 'Image / Scanned File'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {partner.kycStatus !== 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => handleApproveKyc(partner)}
                      disabled={isApproving}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isApproving ? 'wait' : 'pointer',
                        boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
                      }}
                    >
                      Approve Partner KYC
                    </button>
                  )}
                  {partner.kycStatus === 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuspendReason('Account suspended by Admin. Verification review in progress.');
                        setSuspendModalPartner(partner);
                      }}
                      disabled={isSuspending}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        border: '1px solid #FDE68A',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isSuspending ? 'wait' : 'pointer',
                      }}
                    >
                      Suspend Partner
                    </button>
                  )}
                  {partner.kycStatus !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => setRejectModalPartner(partner)}
                      disabled={isRejecting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FEE2E2',
                        color: '#B91C1C',
                        border: '1px solid #FECACA',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isRejecting ? 'wait' : 'pointer',
                      }}
                    >
                      Reject KYC
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocPreview(null)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject KYC Confirmation Modal */}
      {rejectModalPartner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
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
              width: 440,
              maxWidth: '92%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <Text as="h2" variant="heading2" color="#111827" style={{ fontWeight: 700 }}>
                Reject Delivery Partner KYC
              </Text>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Rejecting KYC for <strong style={{ color: '#111827' }}>{rejectModalPartner.fullName}</strong>. Please provide a reason:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setRejectModalPartner(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKyc}
                disabled={isRejecting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isRejecting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                }}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Delivery Partner Confirmation Modal */}
      {suspendModalPartner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
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
              width: 460,
              maxWidth: '92%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    fontSize: 16,
                  }}
                >
                  ⚠️
                </span>
                <Text as="h2" variant="heading2" color="#111827" style={{ fontWeight: 700 }}>
                  Suspend Delivery Partner
                </Text>
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
                Suspending account for <strong style={{ color: '#111827' }}>{suspendModalPartner.fullName}</strong>. Their verification status will be set to <strong style={{ color: '#B45309' }}>SUSPENDED</strong> and they will be taken offline until reviewed and re-approved by Admin.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="Specify reason for suspension..."
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSuspendModalPartner(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspendPartner}
                disabled={isSuspending}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isSuspending ? 'wait' : 'pointer',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)',
                }}
              >
                {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {isShiftModalOpen && (
        <div
          id="create-shift-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsShiftModalOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              width: 480,
              maxWidth: '94%',
              padding: 26,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.16)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <Text as="h2" variant="heading2" color="#111827" style={{ fontWeight: 800, fontSize: 18 }}>
                  {editingShift ? 'Edit Delivery Shift' : 'Create Delivery Shift'}
                </Text>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  {editingShift
                    ? 'Update shift schedule and status. Changes will persist directly in the backend database.'
                    : 'Enter actual shift schedule to permanently persist in the backend database.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: 4,
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Error Notification */}
            {shiftFormError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{shiftFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Target Operating Zone (Zone-Scoped Territory) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="shift-zone-select" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  Target Delivery Zone <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {!isSuperAdmin ? (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #BBF7D0',
                      backgroundColor: '#F0FDF4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                        {activeZoneName} ({activeZoneId || 'dz-bangalore'})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #86EFAC',
                      }}
                    >
                      Locked to Session Zone
                    </span>
                  </div>
                ) : (
                  <select
                    id="shift-zone-select"
                    value={modalShiftZoneId}
                    onChange={(e) => setModalShiftZoneId(e.target.value)}
                    required
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #D1D5DB',
                      fontSize: 14,
                      outline: 'none',
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {availableZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.id})
                      </option>
                    ))}
                  </select>
                )}
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  This shift will only affect and display to delivery partners registered in this specific territory.
                </span>
              </div>

              {/* Shift Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="shift-name-input" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                  Shift Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="shift-name-input"
                  type="text"
                  placeholder="e.g. Morning Rush, Dinner Peak, Night Slot"
                  value={shiftName}
                  onChange={(e) => {
                    setShiftName(e.target.value);
                    if (shiftFormError) setShiftFormError(null);
                  }}
                  required
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #D1D5DB',
                    fontSize: 14,
                    outline: 'none',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                />
              </div>

              {/* Shift Status (When Editing) */}
              {editingShift && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="shift-status-select" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Shift Status <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="shift-status-select"
                    value={shiftStatus}
                    onChange={(e) => setShiftStatus(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #D1D5DB',
                      fontSize: 14,
                      outline: 'none',
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              {/* Start Time & End Time Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Start Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="start-time-input" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Start Time <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="start-time-input"
                      type="text"
                      placeholder="e.g. 06:00 AM or 06:00"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (shiftFormError) setShiftFormError(null);
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 12px',
                        borderRadius: 10,
                        border: '1px solid #D1D5DB',
                        fontSize: 13,
                        outline: 'none',
                        color: '#111827',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    />
                    <input
                      type="time"
                      aria-label="Pick start time"
                      onChange={(e) => {
                        if (e.target.value) {
                          setStartTime(convert24to12(e.target.value));
                          if (shiftFormError) setShiftFormError(null);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        opacity: 0.6,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent',
                      }}
                    />
                  </div>
                </div>

                {/* End Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="end-time-input" style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    End Time <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="end-time-input"
                      type="text"
                      placeholder="e.g. 12:00 PM or 12:00"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        if (shiftFormError) setShiftFormError(null);
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 12px',
                        borderRadius: 10,
                        border: '1px solid #D1D5DB',
                        fontSize: 13,
                        outline: 'none',
                        color: '#111827',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    />
                    <input
                      type="time"
                      aria-label="Pick end time"
                      onChange={(e) => {
                        if (e.target.value) {
                          setEndTime(convert24to12(e.target.value));
                          if (shiftFormError) setShiftFormError(null);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        opacity: 0.6,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Time Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Common Shift Slots (1-Click Fill):</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Morning (6 AM – 12 PM)', start: '06:00 AM', end: '12:00 PM' },
                    { label: 'Afternoon (12 PM – 5 PM)', start: '12:00 PM', end: '05:00 PM' },
                    { label: 'Evening Peak (5 PM – 11 PM)', start: '05:00 PM', end: '11:00 PM' },
                    { label: 'Late Night (11 PM – 3 AM)', start: '11:00 PM', end: '03:00 AM' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setStartTime(preset.start);
                        setEndTime(preset.end);
                        if (!shiftName) {
                          setShiftName(preset.label.split(' (')[0]);
                        }
                        if (shiftFormError) setShiftFormError(null);
                      }}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #E5E7EB',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  id="cancel-shift-button"
                  onClick={() => setIsShiftModalOpen(false)}
                  disabled={isSavingShift || isUpdatingShift}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-shift-button"
                  disabled={isSavingShift || isUpdatingShift}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: isSavingShift || isUpdatingShift ? '#9CA3AF' : '#EA580C',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isSavingShift || isUpdatingShift ? 'wait' : 'pointer',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isSavingShift || isUpdatingShift ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"></circle>
                      </svg>
                      {editingShift ? 'Updating Shift...' : 'Saving Shift...'}
                    </>
                  ) : editingShift ? (
                    'Update Shift'
                  ) : (
                    'Save Shift'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Shift Confirmation Modal */}
      {shiftToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => !isDeletingShift && setShiftToDelete(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              width: 420,
              maxWidth: '92%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Delete Delivery Shift</span>
                <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>
                  Are you sure you want to permanently delete shift <strong>&quot;{shiftToDelete.shiftName}&quot;</strong> ({shiftToDelete.startTime} – {shiftToDelete.endTime}) from the backend database?
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                id="cancel-delete-shift-button"
                onClick={() => setShiftToDelete(null)}
                disabled={isDeletingShift}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-shift-button"
                onClick={handleConfirmDeleteShift}
                disabled={isDeletingShift}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isDeletingShift ? '#9CA3AF' : '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isDeletingShift ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDeletingShift ? 'Deleting Shift...' : 'Delete Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toastMsg.message}
        </div>
      )}
    </div>
  );
}

