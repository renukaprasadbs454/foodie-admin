'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  EmptyState,
  Text,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-web';
import {
  useApproveRestaurantMutation,
  useGetRestaurantQuery,
  useSuspendRestaurantMutation,
  useDeleteRestaurantMutation,
  useUpdateRestaurantCommissionMutation,
} from '@/api/endpoints/restaurantsApi';
import { selectAdminRole } from '@/features/auth/authSlice';
import { useAppSelector } from '@/store/hooks';
import { canManageRestaurants } from '@/lib/routeGuards';
import { PermissionDenied } from '@/features/analytics/components/PermissionDenied';
import { RestaurantDetailSkeleton } from '../components/RestaurantDetailSkeleton';
import { SuspendReasonModal } from '../components/SuspendReasonModal';
import {
  RestaurantCommissionModal,
  CommissionSettingsData,
  SelectedRestaurantTarget,
} from '../components/RestaurantCommissionModal';
import { toUnwrappedApiError } from '../lib/apiError';
import type { RestaurantDocumentItem } from '../types';

type Props = {
  restaurantId: string;
};

interface PreviewDocState {
  url: string;
  title: string;
  docType: string;
  isPdf: boolean;
  documentId?: string;
  status?: string;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

function formatReadableId(id: string): string {
  if (!id) return 'REST-0001';
  if (id.startsWith('REST-')) return id;
  const clean = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `REST-${clean}`;
}

function getFileFormat(url?: string | null): 'PDF' | 'JPG' | 'PNG' | 'IMAGE' {
  if (!url) return 'IMAGE';
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'PDF';
  if (clean.endsWith('.png')) return 'PNG';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'JPG';
  return 'IMAGE';
}

function isPdfFile(url?: string | null): boolean {
  return getFileFormat(url) === 'PDF';
}

export function RestaurantDetailsPage({ restaurantId }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const role = useAppSelector(selectAdminRole);
  const canManage = canManageRestaurants(role);
  const router = useRouter();

  const detailQuery = useGetRestaurantQuery(restaurantId, {
    skip: !restaurantId,
    refetchOnFocus: true,
  });

  const [approve, approveState] = useApproveRestaurantMutation();
  const [suspend, suspendState] = useSuspendRestaurantMutation();
  const [deleteRest, deleteState] = useDeleteRestaurantMutation();
  const [updateCommission, updateCommissionState] = useUpdateRestaurantCommissionMutation();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [customCommission, setCustomCommission] = useState<CommissionSettingsData | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) => setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) => setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) => setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('admin_restaurant_details_viewed', { restaurantId });
  }, [restaurantId]);

  const data = detailQuery.data;
  const address = data?.address;

  // Copy UUID helper
  const handleCopyUuid = () => {
    if (data?.restaurantId) {
      void navigator.clipboard.writeText(data.restaurantId);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
      setToast({ message: 'Restaurant UUID copied to clipboard.', variant: 'info' });
    }
  };

  // Restaurant Level Actions
  const onApprove = async () => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({ message: 'Connect to the internet to approve.', variant: 'warning' });
      return;
    }
    trackAnalyticsEvent('approve_tapped', { restaurantId });
    try {
      await approve(restaurantId).unwrap();
      trackAnalyticsEvent('restaurant_approved', { restaurantId });
      setToast({ message: 'Restaurant approved successfully.', variant: 'success' });
      void detailQuery.refetch();
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const onSuspend = async (reason: string) => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({ message: 'Connect to the internet to suspend.', variant: 'warning' });
      return;
    }
    trackAnalyticsEvent('suspend_tapped', { restaurantId });
    try {
      await suspend({ restaurantId, body: { reason } }).unwrap();
      trackAnalyticsEvent('restaurant_suspended', { restaurantId });
      setSuspendOpen(false);
      setToast({ message: 'Restaurant suspended successfully.', variant: 'success' });
      void detailQuery.refetch();
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const onDelete = async () => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({ message: 'Connect to the internet to delete.', variant: 'warning' });
      return;
    }
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this restaurant? This cannot be undone.'
    );
    if (!confirmed) return;

    trackAnalyticsEvent('delete_tapped', { restaurantId });
    try {
      await deleteRest(restaurantId).unwrap();
      trackAnalyticsEvent('restaurant_deleted', { restaurantId });
      router.push('/restaurants');
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const handleDownloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDocumentViewer = (doc: RestaurantDocumentItem, defaultTitle: string) => {
    const rawUrl = doc.documentUrl || doc.fileUrl || doc.downloadUrl || '';
    if (!rawUrl) {
      setToast({ message: 'Document URL is not available.', variant: 'error' });
      return;
    }
    setImageZoom(1);
    setImageRotation(0);
    setPreviewDoc({
      url: rawUrl,
      title: `${data?.name || 'Restaurant'} — ${defaultTitle}`,
      docType: doc.docType || defaultTitle,
      isPdf: isPdfFile(rawUrl),
      documentId: doc.documentId,
      status: doc.status || (doc.verifiedAt ? 'VERIFIED' : 'PENDING'),
      verifiedAt: doc.verifiedAt,
      rejectionReason: doc.rejectionReason,
    });
  };

  // Commission Settings Actions
  const onSaveCommission = async (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => {
    try {
      await updateCommission({
        restaurantId: target.id,
        commissionPct: settings.commissionPct,
        notes: `${settings.commissionModel} - ${settings.contractType}`,
      }).unwrap();
      setCustomCommission(settings);
      setCommissionOpen(false);
      setToast({
        message: `Commission settings updated for "${target.name}": ${settings.commissionPct}% food commission rate saved.`,
        variant: 'success',
      });
      void detailQuery.refetch();
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const activeCommissionPct =
    customCommission?.commissionPct ??
    (typeof data?.commissionPct === 'number' ? data.commissionPct : 18);
  const activeDeliveryCommissionPct = customCommission?.deliveryCommissionPct ?? 10;
  const activeStructure =
    customCommission?.commissionModel === 'FLAT_FEE'
      ? 'Flat ₹ Fee per Order'
      : customCommission?.commissionModel === 'HYBRID'
        ? 'Hybrid (Base % + Fixed Fee)'
        : 'Percentage Per Order (%)';
  const activePayout =
    customCommission?.payoutFrequency === 'BI_WEEKLY'
      ? 'Bi-Weekly (1st & 15th)'
      : customCommission?.payoutFrequency === 'MONTHLY'
        ? 'Monthly End'
        : customCommission?.payoutFrequency === 'INSTANT'
          ? 'Instant Daily Auto-Settlement'
          : 'Weekly (Every Monday)';
  const activeContract =
    customCommission?.contractType === 'STANDARD_PLATFORM'
      ? 'Standard Marketplace Agreement'
      : customCommission?.contractType === 'PROMOTIONAL'
        ? 'Promotional Early Onboarding Tier'
        : 'Custom Key Merchant Contract';

  // Process Compliance Documents List
  const standardDocCards = useMemo(() => {
    const docs = Array.isArray(data?.documents) ? data!.documents : [];

    // Helper to find document by type
    const findDoc = (typeKeyword: string): RestaurantDocumentItem | undefined => {
      return docs.find(
        (d) =>
          d.docType &&
          d.docType.toUpperCase().includes(typeKeyword.toUpperCase())
      );
    };

    const fssaiDoc = findDoc('FSSAI');
    const gstDoc = findDoc('GST');
    const panDoc = findDoc('PAN');

    // Find any additional custom documents
    const standardIds = new Set([fssaiDoc?.documentId, gstDoc?.documentId, panDoc?.documentId].filter(Boolean));
    const extraDocs = docs.filter((d) => d.documentId && !standardIds.has(d.documentId));

    return {
      fssai: {
        type: 'FSSAI',
        title: 'FSSAI Food License',
        description: 'Mandatory Food Safety and Standards Authority of India certificate',
        doc: fssaiDoc,
      },
      gst: {
        type: 'GST',
        title: 'GST Registration Certificate',
        description: 'Goods & Services Tax Identification certificate for tax compliance',
        doc: gstDoc,
      },
      pan: {
        type: 'PAN',
        title: 'Permanent Account Number (PAN)',
        description: 'Business or Proprietor Income Tax PAN card',
        doc: panDoc,
      },
      extraDocs,
    };
  }, [data?.documents]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48, maxWidth: 1280, margin: '0 auto' }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/restaurants"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#0284C7',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              transition: 'background-color 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Restaurants
          </Link>
          <span style={{ color: '#94A3B8' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>
            Store Details
          </span>
          {data?.name && (
            <>
              <span style={{ color: '#94A3B8' }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {data.name}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            disabled={detailQuery.isFetching}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              cursor: detailQuery.isFetching ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: detailQuery.isFetching ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {detailQuery.isFetching ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {!isConnected ? (
        <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <Text as="p" variant="caption" color={tokens.color.warning}>
            Offline Mode — displaying cached store data. Modifications are temporarily restricted.
          </Text>
        </div>
      ) : null}

      {!canManage ? (
        <PermissionDenied description="OPS or SUPER_ADMIN required to approve, suspend or edit commissions." />
      ) : null}

      {detailQuery.isLoading && !data ? (
        <RestaurantDetailSkeleton />
      ) : detailQuery.isError && !data ? (
        <EmptyState
          title="Restaurant record not found"
          description="Could not locate this restaurant in the database. Please verify the ID or retry."
          aria-label="Restaurant detail error"
          actionLabel="Retry"
          onAction={() => {
            void detailQuery.refetch();
          }}
        />
      ) : data ? (
        <>
          {/* ========================================================================= */}
          {/* SECTION 1: RESTAURANT OVERVIEW (Hero Header Card)                          */}
          {/* ========================================================================= */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Banner Cover / Gradient Backdrop */}
            <div
              style={{
                height: 140,
                width: '100%',
                position: 'relative',
                background: data.coverImageUrl
                  ? `linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.7)), url(${data.coverImageUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0369A1 100%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 16,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    color: '#0369A1',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '5px 14px',
                    borderRadius: 20,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  {activeCommissionPct}% Commission
                </span>
              </div>
            </div>

            {/* Profile Bar */}
            <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                  marginTop: -48,
                }}
              >
                {/* Logo & Core Info */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 16,
                      backgroundColor: '#FFFFFF',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {data.logoImageUrl ? (
                      <img
                        src={data.logoImageUrl}
                        alt={data.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div style="font-size: 28px; font-weight: 800; color: #0284C7; background: #E0F2FE; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${(
                              data.name?.slice(0, 2) || 'ST'
                            ).toUpperCase()}</div>`;
                          }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: '#0284C7',
                          backgroundColor: '#E0F2FE',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(data.name?.slice(0, 2) || 'ST').toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {data.name}
                      </h1>

                      {/* Readable ID Badge */}
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          letterSpacing: 0.5,
                        }}
                      >
                        {formatReadableId(data.restaurantId)}
                      </span>

                      {/* Status Badge */}
                      <span
                        style={{
                          backgroundColor:
                            data.status === 'APPROVED'
                              ? '#ECFDF5'
                              : data.status === 'PENDING'
                                ? '#FFFBEB'
                                : '#FEF2F2',
                          color:
                            data.status === 'APPROVED'
                              ? '#059669'
                              : data.status === 'PENDING'
                                ? '#D97706'
                                : '#DC2626',
                          border: `1px solid ${
                            data.status === 'APPROVED'
                              ? '#A7F3D0'
                              : data.status === 'PENDING'
                                ? '#FDE68A'
                                : '#FECACA'
                          }`,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                        }}
                      >
                        ● {data.status}
                      </span>

                      {/* Open/Closed indicator */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: data.isOpen ? '#16A34A' : '#64748B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: data.isOpen ? '#22C55E' : '#94A3B8',
                          }}
                        />
                        {data.isOpen ? 'Open For Orders' : 'Store Closed'}
                      </span>
                    </div>

                    {/* Monospace UUID with Copy Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        UUID: {data.restaurantId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUuid}
                        title="Copy UUID to clipboard"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedUuid ? '#16A34A' : '#0284C7',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {copiedUuid ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                {canManage && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setCommissionOpen(true)}
                      style={{
                        padding: '9px 16px',
                        background: '#FFFFFF',
                        color: '#0369A1',
                        border: '1px solid #BAE6FD',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      Commission Settings
                    </button>

                    {data.status === 'PENDING' && (
                      <Button
                        label="Approve Restaurant"
                        aria-label="Approve restaurant"
                        loading={approveState.isLoading}
                        disabled={!isConnected || approveState.isLoading}
                        onClick={() => {
                          void onApprove();
                        }}
                      />
                    )}

                    {data.status === 'APPROVED' && (
                      <Button
                        label="Suspend Restaurant"
                        aria-label="Suspend restaurant"
                        variant="danger"
                        disabled={!isConnected || suspendState.isLoading}
                        onClick={() => setSuspendOpen(true)}
                      />
                    )}

                    {data.status === 'SUSPENDED' && (
                      <Button
                        label="Delete Permanently"
                        aria-label="Delete restaurant"
                        variant="danger"
                        disabled={!isConnected || deleteState.isLoading}
                        onClick={() => {
                          void onDelete();
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2 & 3: RESTAURANT INFO + OWNER & CONTACT INFO                      */}
          {/* ========================================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
            }}
          >
            {/* CARD 2: Restaurant Information */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🏪</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Restaurant Information
                </h2>
              </div>

              {/* Description */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Description</span>
                <p style={{ fontSize: 13, color: '#1E293B', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {data.description || 'No store description provided.'}
                </p>
              </div>

              {/* Address */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Full Address</span>
                <p style={{ fontSize: 13, color: '#1E293B', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {[address?.line1, address?.line2, (address as any)?.landmark, address?.city, (address as any)?.state, address?.pincode]
                    .filter(Boolean)
                    .join(', ') || 'No registered street address.'}
                </p>
              </div>

              {/* Operating Zone */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assigned Zone</span>
                <div style={{ marginTop: 4 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    📍 {data.zoneName || data.zoneId || address?.city || 'Default Active Zone'}
                  </span>
                </div>
              </div>

              {/* Cuisine Categories */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Cuisine Categories</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {data.cuisineTypes && data.cuisineTypes.length > 0 ? (
                    data.cuisineTypes.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 16,
                          backgroundColor: '#F8FAFC',
                          color: '#334155',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>General Food</span>
                  )}
                </div>
              </div>

              {/* Metrics: Total Orders & Store Type (Rating removed as requested) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 6 }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Orders</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 3 }}>
                    {data.ordersCount ?? (data as any).totalOrders ?? 0}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Store Type</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0284C7', marginTop: 4 }}>
                    {data.restaurantType ?? 'BOTH'}
                  </div>
                </div>
              </div>

              {/* Operating Timings */}
              {(data.openTime || data.closeTime || data.openDays) && (
                <div style={{ fontSize: 12, color: '#475569', backgroundColor: '#F0F9FF', padding: 10, borderRadius: 8, border: '1px solid #BAE6FD' }}>
                  <strong>Operational Hours: </strong>
                  {data.openTime || '09:00'} - {data.closeTime || '22:00'}
                  {data.openDays && data.openDays.length > 0 && ` (${data.openDays.join(', ')})`}
                </div>
              )}
            </div>

            {/* CARD 3: Owner & Contact Information (Email, Legal Entity, Business Type, Regulatory Numbers removed) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Owner & Contact Information
                </h2>
              </div>

              {/* Owner Name */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Owner Name</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '6px 0 0 0' }}>
                  {data.legalDetails?.legalName ||
                    (data.ownerUserCredentialId ? `Merchant ID: ${data.ownerUserCredentialId.slice(0, 8)}` : 'Registered Merchant')}
                </p>
              </div>

              {/* Contact Phone */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Contact Number</span>
                <div style={{ marginTop: 6 }}>
                  {data.phone || data.contactPhone ? (
                    <a
                      href={`tel:${data.phone || data.contactPhone}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0284C7',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      📞 {data.phone || data.contactPhone}
                    </a>
                  ) : (
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>Not provided</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: DOCUMENTS & VERIFICATION                                       */}
          {/* ========================================================================= */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📑</span>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Documents & Verification
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  Review, view, and download mandatory regulatory compliance documents.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  ✓ Supports PDF, JPG, JPEG, PNG
                </span>
              </div>
            </div>

            {/* Grid of Mandatory Regulatory Documents */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 18,
              }}
            >
              {/* Document 1: FSSAI Food License */}
              {renderDocCard(
                standardDocCards.fssai.title,
                standardDocCards.fssai.type,
                standardDocCards.fssai.description,
                standardDocCards.fssai.doc
              )}

              {/* Document 2: GST Registration Certificate */}
              {renderDocCard(
                standardDocCards.gst.title,
                standardDocCards.gst.type,
                standardDocCards.gst.description,
                standardDocCards.gst.doc
              )}

              {/* Document 3: PAN Card */}
              {renderDocCard(
                standardDocCards.pan.title,
                standardDocCards.pan.type,
                standardDocCards.pan.description,
                standardDocCards.pan.doc
              )}

              {/* Any additional documents uploaded */}
              {standardDocCards.extraDocs.map((extraDoc, index) =>
                renderDocCard(
                  extraDoc.docType || `Document ${index + 1}`,
                  extraDoc.docType || 'ADDITIONAL_DOC',
                  'Uploaded compliance certificate',
                  extraDoc
                )
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 5: COMMISSION & SETTLEMENT SETTINGS                               */}
          {/* ========================================================================= */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>💰</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Commission & Settlement Settings
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  Store-specific marketplace commission rate, delivery split, payout schedule & tax deductions
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setCommissionOpen(true)}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Commission Settings
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Food Order Commission
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 4 }}>
                  {activeCommissionPct}%
                </div>
                <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Applied on gross food subtotal</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Delivery Fee Split
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369A1', marginTop: 4 }}>
                  {activeDeliveryCommissionPct}%
                </div>
                <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>Platform delivery commission</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Commission Structure
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0369A1', marginTop: 8 }}>
                  {activeStructure}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{activeContract}</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Payout Cycle
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0369A1', marginTop: 8 }}>
                  {activePayout}
                </div>
                <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, marginTop: 2 }}>
                  ✓ TCS & GST Deductions Active
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ========================================================================= */}
      {/* MODALS: Commission, Suspend, Document Viewer                              */}
      {/* ========================================================================= */}

      {/* Suspend Modal */}
      <SuspendReasonModal
        open={suspendOpen}
        loading={suspendState.isLoading}
        onClose={() => setSuspendOpen(false)}
        onConfirm={(reason) => {
          void onSuspend(reason);
        }}
      />

      {/* Commission Settings Modal */}
      {data && (
        <RestaurantCommissionModal
          open={commissionOpen}
          restaurantName={data.name}
          restaurantId={data.restaurantId}
          initialCommission={customCommission?.commissionPct ?? data.commissionPct ?? 18}
          showRestaurantSelector={false}
          onClose={() => setCommissionOpen(false)}
          onSave={onSaveCommission}
        />
      )}

      {/* Interactive In-App Document Viewer Modal */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{previewDoc.isPdf ? '📄' : '🖼️'}</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {previewDoc.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: previewDoc.isPdf ? '#FEE2E2' : '#E0F2FE',
                        color: previewDoc.isPdf ? '#DC2626' : '#0369A1',
                      }}
                    >
                      {previewDoc.isPdf ? 'PDF DOCUMENT' : 'IMAGE'}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      Status:{' '}
                      <strong
                        style={{
                          color:
                            previewDoc.status === 'VERIFIED'
                              ? '#16A34A'
                              : previewDoc.status === 'REJECTED'
                                ? '#DC2626'
                                : '#D97706',
                        }}
                      >
                        {previewDoc.status || 'PENDING'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Tools */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0284C7',
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    borderRadius: 6,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Open in New Tab
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadDocument(previewDoc.url, `${previewDoc.docType}_document`)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div
              style={{
                flex: 1,
                minHeight: 460,
                maxHeight: 'calc(90vh - 140px)',
                overflow: 'auto',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'relative',
              }}
            >
              {previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              ) : (
                <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '65vh',
                      objectFit: 'contain',
                      borderRadius: 6,
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer with Zoom Tools */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '12px 20px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                gap: 12,
              }}
            >
              {!previewDoc.isPdf ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => Math.min(z + 0.25, 3))}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Zoom +
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Zoom -
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageRotation((r) => (r + 90) % 360)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Rotate ↻
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageZoom(1);
                      setImageRotation(0);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      color: '#64748B',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Use the PDF toolbar above to navigate pages or print
                </div>
              )}

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        aria-label={toast?.message ?? 'Toast'}
        onClose={() => setToast(null)}
      />
    </div>
  );

  // Helper renderer for each document card (Approve and Reject buttons removed as requested)
  function renderDocCard(
    title: string,
    docType: string,
    description: string,
    doc?: RestaurantDocumentItem
  ) {
    const rawUrl = doc?.documentUrl || doc?.fileUrl || doc?.downloadUrl;
    const isUploaded = Boolean(doc && rawUrl);
    const format = getFileFormat(rawUrl);
    const isPdf = format === 'PDF';
    const isVerified = Boolean(doc?.verifiedAt || doc?.status === 'VERIFIED');
    const isRejected = doc?.status === 'REJECTED';

    return (
      <div
        key={`${docType}-${doc?.documentId || 'unuploaded'}`}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: isUploaded ? (isVerified ? '1.5px solid #A7F3D0' : isRejected ? '1.5px solid #FECACA' : '1px solid #CBD5E1') : '1.5px dashed #CBD5E1',
          padding: 16,
          boxShadow: isUploaded ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{isPdf ? '📄' : isUploaded ? '🖼️' : '📑'}</span>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {title}
                </h4>
              </div>
              <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0 0' }}>
                {description}
              </p>
            </div>

            {/* Status Indicator Badge */}
            {isUploaded ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 12,
                  backgroundColor: isVerified ? '#ECFDF5' : isRejected ? '#FEF2F2' : '#FFFBEB',
                  color: isVerified ? '#059669' : isRejected ? '#DC2626' : '#D97706',
                  border: `1px solid ${isVerified ? '#A7F3D0' : isRejected ? '#FECACA' : '#FDE68A'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {isVerified ? '✓ Verified' : isRejected ? '✕ Rejected' : '⏳ Pending'}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  whiteSpace: 'nowrap',
                }}
              >
                Document Not Uploaded
              </span>
            )}
          </div>

          {/* Uploaded Document Details */}
          {isUploaded ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Thumbnail / PDF Box */}
              <div
                onClick={() => doc && openDocumentViewer(doc, title)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 6,
                  backgroundColor: isPdf ? '#FEE2E2' : '#E2E8F0',
                  border: '1px solid #CBD5E1',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Click to preview document"
              >
                {isPdf ? (
                  <span style={{ fontSize: 24 }}>📄</span>
                ) : (
                  <img
                    src={rawUrl || ''}
                    alt={title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: isPdf ? '#EF4444' : '#0284C7',
                      color: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {format}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    {doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Uploaded'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0284C7',
                    marginTop: 2,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => doc && openDocumentViewer(doc, title)}
                >
                  Click to inspect file
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                padding: '12px 10px',
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#94A3B8' }}>
                No file uploaded by the merchant for this compliance requirement.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons Row: View Document and Download (Approve & Reject removed as requested) */}
        {isUploaded ? (
          <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={() => doc && openDocumentViewer(doc, title)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#0369A1',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Document
            </button>

            <button
              type="button"
              onClick={() => handleDownloadDocument(rawUrl!, `${docType}_document`)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
              title="Download file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
          </div>
        ) : null}
      </div>
    );
  }
}
