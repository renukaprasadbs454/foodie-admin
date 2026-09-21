'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  DataTableShell,
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
  useGetRestaurantReviewsQuery,
  useSuspendRestaurantMutation,
  useDeleteRestaurantMutation,
} from '@/api/endpoints/restaurantsApi';
import { selectAdminRole } from '@/features/auth/authSlice';
import { useAppSelector } from '@/store/hooks';
import { canManageRestaurants } from '@/lib/routeGuards';
import { PermissionDenied } from '@/features/analytics/components/PermissionDenied';
import { RestaurantDetailSkeleton } from '../components/RestaurantDetailSkeleton';
import { SuspendReasonModal } from '../components/SuspendReasonModal';
import { RestaurantCommissionModal, CommissionSettingsData, SelectedRestaurantTarget } from '../components/RestaurantCommissionModal';
import { formatCommissionPct } from '../types';
import { toUnwrappedApiError } from '../lib/apiError';

type Props = {
  restaurantId: string;
};

/**
 * P2-ADM-03 AdminRestaurantDetails — GET detail + reviews + approve/suspend + commission settings.
 */
export function RestaurantDetailsPage({ restaurantId }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const role = useAppSelector(selectAdminRole);
  const canManage = canManageRestaurants(role);

  const detailQuery = useGetRestaurantQuery(restaurantId, {
    skip: !restaurantId,
    refetchOnFocus: true,
  });
  const reviewsQuery = useGetRestaurantReviewsQuery(
    { restaurantId, page: 0, size: 20 },
    { skip: !restaurantId, refetchOnFocus: true },
  );
  const [approve, approveState] = useApproveRestaurantMutation();
  const [suspend, suspendState] = useSuspendRestaurantMutation();
  const [deleteRest, deleteState] = useDeleteRestaurantMutation();

  const router = useRouter();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [customCommission, setCustomCommission] = useState<CommissionSettingsData | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('admin_restaurant_details_viewed', { restaurantId });
  }, [restaurantId]);

  const onApprove = async () => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to approve.',
        variant: 'warning',
      });
      return;
    }
    trackAnalyticsEvent('approve_tapped', { restaurantId });
    try {
      await approve(restaurantId).unwrap();
      trackAnalyticsEvent('restaurant_approved', { restaurantId });
      setToast({ message: 'Restaurant approved.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const onSuspend = async (reason: string) => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to suspend.',
        variant: 'warning',
      });
      return;
    }
    trackAnalyticsEvent('suspend_tapped', { restaurantId });
    try {
      await suspend({ restaurantId, body: { reason } }).unwrap();
      trackAnalyticsEvent('restaurant_suspended', { restaurantId });
      setSuspendOpen(false);
      setToast({ message: 'Restaurant suspended.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const onDelete = async () => {
    if (!canManage) return;
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to delete.',
        variant: 'warning',
      });
      return;
    }
    const confirmed = window.confirm("Are you sure you want to permanently delete this restaurant? This cannot be undone.");
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

  const data = detailQuery.data;
  const address = data?.address;

  const onSaveCommission = (settings: CommissionSettingsData, target: SelectedRestaurantTarget) => {
    if (target.id === restaurantId || target.isAllStores) {
      setCustomCommission(settings);
    }
    setCommissionOpen(false);
    trackAnalyticsEvent('restaurant_commission_updated', {
      restaurantId: target.id,
      commissionPct: settings.commissionPct,
    });
    setToast({
      message: `Commission settings updated for "${target.name}": ${settings.commissionPct}% food commission rate applied.`,
      variant: 'success',
    });
  };

  const activeCommissionPct = customCommission?.commissionPct ?? (typeof data?.commissionPct === 'number' ? data.commissionPct : 15);
  const activeDeliveryCommissionPct = customCommission?.deliveryCommissionPct ?? 10;
  const activeStructure = customCommission?.commissionModel === 'FLAT_FEE' ? 'Flat ₹ Fee per Order' : customCommission?.commissionModel === 'HYBRID' ? 'Hybrid (Base % + Fixed Fee)' : 'Percentage Per Order (%)';
  const activePayout = customCommission?.payoutFrequency === 'BI_WEEKLY' ? 'Bi-Weekly (1st & 15th)' : customCommission?.payoutFrequency === 'MONTHLY' ? 'Monthly End' : customCommission?.payoutFrequency === 'INSTANT' ? 'Instant Daily Auto-Settlement' : 'Weekly (Every Monday)';
  const activeContract = customCommission?.contractType === 'STANDARD_PLATFORM' ? 'Standard Marketplace Agreement' : customCommission?.contractType === 'PROMOTIONAL' ? 'Promotional Early Onboarding Tier' : 'Custom Key Merchant Contract';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Text as="h1" variant="heading1">
            Restaurant details
          </Text>
          <Text as="p" variant="caption" color={tokens.color.textSecondary}>
            Manage store profiles, commission settings, approvals & merchant operations
          </Text>
        </div>
      </div>

      {!isConnected ? (
        <Text as="p" variant="caption" color={tokens.color.warning}>
          Offline — showing cached detail when available. Mutations blocked.
        </Text>
      ) : null}

      {!canManage ? (
        <PermissionDenied description="OPS or SUPER_ADMIN required to approve, suspend or edit commissions." />
      ) : null}

      {detailQuery.isLoading && !data ? (
        <RestaurantDetailSkeleton />
      ) : detailQuery.isError && !data ? (
        <EmptyState
          title="Restaurant not found"
          description="Check the UUID or retry."
          aria-label="Restaurant detail error"
          actionLabel="Retry"
          onAction={() => {
            void detailQuery.refetch();
          }}
        />
      ) : data ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.sm,
              padding: tokens.spacing.md,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: tokens.radius.md,
              background: tokens.color.surface,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <Text as="h2" variant="heading2">
                  {data.name}
                </Text>
                <Text as="p" variant="body" color={tokens.color.textSecondary}>
                  Status: {data.status ?? '—'} · Rating: {data.avgRating ?? '—'}
                </Text>
              </div>
              <span
                style={{
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 20,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                }}
              >
                {activeCommissionPct}% Commission
              </span>
            </div>

            <Text as="p" variant="caption" color={tokens.color.textSecondary}>
              ID {data.restaurantId}
            </Text>
            {data.description ? (
              <Text as="p" variant="body">
                {data.description}
              </Text>
            ) : null}
            {address ? (
              <Text as="p" variant="caption" color={tokens.color.textSecondary}>
                {[address.line1, address.line2, address.city, address.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            ) : null}
            {data.cuisineTypes?.length ? (
              <Text as="p" variant="caption" color={tokens.color.textSecondary}>
                Cuisines: {data.cuisineTypes.join(', ')}
              </Text>
            ) : null}
            {data.legalDetails && (
              <div style={{ marginTop: tokens.spacing.sm, padding: tokens.spacing.sm, backgroundColor: tokens.color.background, borderRadius: tokens.radius.sm }}>
                <Text as="h3" variant="heading3" style={{ marginBottom: tokens.spacing.xs }}>Legal Details</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: tokens.spacing.xs }}>
                  <Text as="span" variant="caption" color={tokens.color.textSecondary}>Legal Name</Text>
                  <Text as="span" variant="body">{data.legalDetails.legalName ?? '—'}</Text>

                  <Text as="span" variant="caption" color={tokens.color.textSecondary}>FSSAI</Text>
                  <Text as="span" variant="body">{data.legalDetails.fssaiLicenseNumber ?? '—'}</Text>

                  <Text as="span" variant="caption" color={tokens.color.textSecondary}>PAN</Text>
                  <Text as="span" variant="body">{data.legalDetails.pan ?? '—'}</Text>

                  <Text as="span" variant="caption" color={tokens.color.textSecondary}>GSTIN</Text>
                  <Text as="span" variant="body">{data.legalDetails.gstin ?? '—'}</Text>

                  <Text as="span" variant="caption" color={tokens.color.textSecondary}>Business Type</Text>
                  <Text as="span" variant="body">{data.legalDetails.businessType ?? '—'}</Text>
                </div>
              </div>
            )}

            {data.documents && data.documents.length > 0 && (
              <div style={{ marginTop: tokens.spacing.sm, padding: tokens.spacing.sm, backgroundColor: tokens.color.background, borderRadius: tokens.radius.sm }}>
                <Text as="h3" variant="heading3" style={{ marginBottom: tokens.spacing.xs }}>Documents</Text>
                <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                  {data.documents.map((doc, docIdx) => (
                    <div key={doc.id ? `doc-${doc.id}` : `doc-${doc.docType || 'doc'}-${docIdx}`} style={{ padding: tokens.spacing.sm, border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.sm, background: tokens.color.surface }}>
                      <Text as="p" variant="body">{doc.docType}</Text>
                      <Text as="p" variant="caption" color={doc.verifiedAt ? tokens.color.success : tokens.color.textSecondary}>
                        {doc.verifiedAt ? 'Verified' : 'Pending Verification'}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data.logoImageUrl || data.coverImageUrl) && (
              <div style={{ display: 'flex', gap: tokens.spacing.md, marginTop: tokens.spacing.sm }}>
                {data.logoImageUrl && (
                  <div>
                    <Text as="p" variant="caption" color={tokens.color.textSecondary} style={{ marginBottom: tokens.spacing.xs }}>Logo</Text>
                    <img src={data.logoImageUrl} alt="Logo" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }} />
                  </div>
                )}
                {data.coverImageUrl && (
                  <div>
                    <Text as="p" variant="caption" color={tokens.color.textSecondary} style={{ marginBottom: tokens.spacing.xs }}>Cover Image</Text>
                    <img src={data.coverImageUrl} alt="Cover" style={{ width: 200, height: 100, objectFit: 'cover', borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Commission Settings Action & Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.sm,
              padding: tokens.spacing.md,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: tokens.radius.md,
              background: tokens.color.surface,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text as="h3" variant="heading3" style={{ margin: 0 }}>
                  Commission & Settlement Settings
                </Text>
                <Text as="p" variant="caption" color={tokens.color.textSecondary} style={{ marginTop: 2 }}>
                  Store-specific marketplace commission rate, delivery split, payout schedule & tax deductions
                </Text>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setCommissionOpen(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0284C7',
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
                  Edit Commission Settings
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
              <div style={{ backgroundColor: tokens.color.background, padding: 14, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }}>
                <Text as="p" variant="caption" color={tokens.color.textSecondary}>Food Order Commission</Text>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0C4A6E', marginTop: 4 }}>
                  {activeCommissionPct}%
                </div>
                <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>Applied on gross food subtotal</div>
              </div>

              <div style={{ backgroundColor: tokens.color.background, padding: 14, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }}>
                <Text as="p" variant="caption" color={tokens.color.textSecondary}>Delivery Fee Split</Text>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0C4A6E', marginTop: 4 }}>
                  {activeDeliveryCommissionPct}%
                </div>
                <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>Platform delivery commission</div>
              </div>

              <div style={{ backgroundColor: tokens.color.background, padding: 14, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }}>
                <Text as="p" variant="caption" color={tokens.color.textSecondary}>Commission Structure</Text>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0C4A6E', marginTop: 6 }}>
                  {activeStructure}
                </div>
                <div style={{ fontSize: 11, color: '#0369A1', marginTop: 2 }}>{activeContract}</div>
              </div>

              <div style={{ backgroundColor: tokens.color.background, padding: 14, borderRadius: tokens.radius.sm, border: `1px solid ${tokens.color.border}` }}>
                <Text as="p" variant="caption" color={tokens.color.textSecondary}>Payout Cycle</Text>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0C4A6E', marginTop: 6 }}>
                  {activePayout}
                </div>
                <div style={{ fontSize: 11, color: tokens.color.success, marginTop: 2 }}>TCS & GST Deductions Active</div>
              </div>
            </div>
          </div>

          {canManage ? (
            <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCommissionOpen(true)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                }}
              >
                Commission Settings
              </button>

              {data.status === 'PENDING' && (
                <Button
                  label="Approve"
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
                  label="Suspend"
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
          ) : null}

          <div>
            {reviewsQuery.isLoading && !reviewsQuery.data ? (
              <RestaurantDetailSkeleton />
            ) : (
              <DataTableShell
                caption="Reviews"
                headers={['Restaurant', 'Delivery', 'Comment', 'Created']}
              >
                {(reviewsQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: tokens.spacing.md }}
                    >
                      <Text as="span" variant="caption" color={tokens.color.textSecondary}>
                        No reviews yet.
                      </Text>
                    </td>
                  </tr>
                ) : (
                  (reviewsQuery.data ?? []).map((row, index) => (
                    <tr key={`${row.createdAt ?? 'r'}-${index}`}>
                      <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
                        {row.restaurantRating}
                      </td>
                      <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
                        {row.deliveryRating ?? '—'}
                      </td>
                      <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
                        {row.comment ?? '—'}
                      </td>
                      <td style={{ padding: tokens.spacing.md, borderBottom: `1px solid ${tokens.color.border}` }}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </DataTableShell>
            )}
          </div>
        </>
      ) : null}

      <SuspendReasonModal
        open={suspendOpen}
        loading={suspendState.isLoading}
        onClose={() => setSuspendOpen(false)}
        onConfirm={(reason) => {
          void onSuspend(reason);
        }}
      />

      {data && (
        <RestaurantCommissionModal
          open={commissionOpen}
          restaurantName={data.name}
          restaurantId={data.restaurantId}
          initialCommission={customCommission?.commissionPct ?? data.commissionPct ?? 15}
          showRestaurantSelector={false}
          onClose={() => setCommissionOpen(false)}
          onSave={onSaveCommission}
        />
      )}

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        aria-label={toast?.message ?? 'Toast'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

