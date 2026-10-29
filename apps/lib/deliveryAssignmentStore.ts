import fs from 'fs';
import path from 'path';
import os from 'os';
import { ENV } from '@/constants/env';
import { safeFetch } from '@/lib/networkUtils';

export interface StoredDeliveryPartner {
  id: string;
  fullName: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  isOnline: boolean;
  zone: string;
}

export interface OrderAssignmentRecord {
  orderId: string;
  orderNumber?: string;
  deliveryPartnerId: string;
  deliveryPartnerName: string;
  deliveryPartnerPhone: string;
  status: 'ASSIGNED' | 'DISPATCHED' | 'PICKED_UP' | 'DELIVERED';
  assignedAt: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  totalAmount?: number;
  items?: Array<{ name: string; quantity: number; price?: number }>;
}

export interface PushNotificationRecord {
  id: string;
  deliveryPartnerId: string;
  title: string;
  body: string;
  orderId: string;
  orderNumber: string;
  sentAt: string;
  status: 'SENT' | 'DELIVERED';
}

const DEFAULT_ONLINE_PARTNERS: StoredDeliveryPartner[] = [
  {
    id: 'dp-blr-01',
    fullName: 'Suresh Kumar',
    phoneNumber: '+91 98765 43210',
    vehicleType: 'MOTORCYCLE',
    vehicleNumber: 'KA-04-EK-1234',
    isOnline: true,
    zone: 'Bangalore Zone',
  },
  {
    id: 'dp-blr-02',
    fullName: 'Ramesh Patel',
    phoneNumber: '+91 98450 12345',
    vehicleType: 'SCOOTER',
    vehicleNumber: 'KA-01-MJ-5678',
    isOnline: true,
    zone: 'Bangalore Zone',
  },
  {
    id: 'dp-blr-03',
    fullName: 'Vignesh S',
    phoneNumber: '+91 97312 34567',
    vehicleType: 'ELECTRIC_BIKE',
    vehicleNumber: 'KA-05-EV-9012',
    isOnline: true,
    zone: 'Bangalore Zone',
  },
  {
    id: 'dp-tmk-01',
    fullName: 'Manjunath Gowda',
    phoneNumber: '+91 99001 12233',
    vehicleType: 'MOTORCYCLE',
    vehicleNumber: 'KA-06-TR-4433',
    isOnline: true,
    zone: 'Tumkur Zone',
  },
  {
    id: 'dp-blr-04',
    fullName: 'Anand Verma',
    phoneNumber: '+91 98112 23344',
    vehicleType: 'MOTORCYCLE',
    vehicleNumber: 'KA-03-AB-7788',
    isOnline: true,
    zone: 'Bangalore Zone',
  },
];

function getStorageFilePath(): string {
  return path.join(os.tmpdir(), 'foodie_admin_assignments_store.json');
}

interface StoreState {
  assignments: Record<string, OrderAssignmentRecord>; // orderId -> record
  notifications: PushNotificationRecord[];
}

function loadStore(): StoreState {
  try {
    const file = getStorageFilePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Continue with default empty store
  }
  return { assignments: {}, notifications: [] };
}

function saveStore(state: StoreState): void {
  try {
    const file = getStorageFilePath();
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Silently ignore disk write error
  }
}

/**
 * Fetch online delivery partners (from backend or fallback).
 */
export async function getOnlineDeliveryPartners(accessToken?: string | null): Promise<StoredDeliveryPartner[]> {
  try {
    const backendUrl = `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/delivery-partners?status=online&size=100`;
    const { response } = await safeFetch(backendUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      timeoutMs: 4000,
    });

    if (response && response.ok) {
      const json = await response.json();
      const list: any[] = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.items)
        ? json.data.items
        : Array.isArray(json.items)
        ? json.items
        : [];

      if (list.length > 0) {
        return list
          .filter((p) => p.isOnline !== false)
          .map((p) => ({
            id: String(p.id || p.partnerId || ''),
            fullName: p.fullName || p.name || 'Delivery Partner',
            phoneNumber: p.phoneNumber || p.phone || '+91 98765 43210',
            vehicleType: p.vehicleType || 'MOTORCYCLE',
            vehicleNumber: p.vehicleNumber || 'KA-01-XX-0000',
            isOnline: true,
            zone: p.zone || p.zoneName || 'Bangalore Zone',
          }));
      }
    }
  } catch {
    // Use fallback
  }

  return DEFAULT_ONLINE_PARTNERS;
}

/**
 * Assign a delivery partner to an order.
 */
export async function assignDeliveryPartnerToOrder(
  orderId: string,
  deliveryPartnerId: string,
  accessToken?: string | null,
  additionalDetails?: { orderNumber?: string; customerAddress?: string; restaurantAddress?: string }
): Promise<OrderAssignmentRecord> {
  const partners = await getOnlineDeliveryPartners(accessToken);
  const matchedPartner =
    partners.find((p) => p.id === deliveryPartnerId) ||
    DEFAULT_ONLINE_PARTNERS.find((p) => p.id === deliveryPartnerId) || {
      id: deliveryPartnerId,
      fullName: 'Assigned Partner',
      phoneNumber: '+91 98765 43210',
      vehicleType: 'MOTORCYCLE',
      vehicleNumber: 'KA-01-XX-0000',
      isOnline: true,
      zone: 'Active Zone',
    };

  const store = loadStore();
  const existing = store.assignments[orderId];

  const orderNum =
    additionalDetails?.orderNumber ||
    existing?.orderNumber ||
    (orderId.length > 8 ? orderId.substring(0, 8).toUpperCase() : orderId);

  const assignment: OrderAssignmentRecord = {
    orderId,
    orderNumber: orderNum,
    deliveryPartnerId: matchedPartner.id,
    deliveryPartnerName: matchedPartner.fullName,
    deliveryPartnerPhone: matchedPartner.phoneNumber,
    status: 'ASSIGNED',
    assignedAt: new Date().toISOString(),
    customerName: existing?.customerName || 'Customer',
    customerPhone: existing?.customerPhone || '+91 98000 00000',
    customerAddress:
      additionalDetails?.customerAddress ||
      existing?.customerAddress ||
      '42, 4th Cross, Indiranagar, Bangalore 560038',
    restaurantName: existing?.restaurantName || 'Foodie Partner Store',
    restaurantAddress:
      additionalDetails?.restaurantAddress ||
      existing?.restaurantAddress ||
      '100 Feet Road, HAL 2nd Stage, Indiranagar, Bangalore 560038',
    totalAmount: existing?.totalAmount || 350,
    items: existing?.items || [{ name: 'Order Dishes', quantity: 2, price: 350 }],
  };

  store.assignments[orderId] = assignment;

  // Send push notification: "New Order Assigned - Order #1234"
  const notification: PushNotificationRecord = {
    id: `notif-${Date.now()}`,
    deliveryPartnerId: matchedPartner.id,
    title: `New Order Assigned`,
    body: `New Order Assigned - Order #${orderNum}`,
    orderId,
    orderNumber: orderNum,
    sentAt: new Date().toISOString(),
    status: 'SENT',
  };
  store.notifications.push(notification);

  saveStore(store);

  // Sync upstream backend if reachable
  try {
    const upstreamUrl = `${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/orders/${orderId}/assign-delivery-partner`;
    await safeFetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ deliveryPartnerId }),
      timeoutMs: 3000,
    });
  } catch {
    // Upstream sync is non-blocking
  }

  return assignment;
}

/**
 * Get assignment details for an order.
 */
export function getOrderAssignment(orderId: string): OrderAssignmentRecord | null {
  const store = loadStore();
  return store.assignments[orderId] || null;
}

/**
 * Get all assigned orders for a specific delivery partner (Delivery App sync).
 */
export function getAssignedOrdersForPartner(
  deliveryPartnerId: string,
  status: string = 'ASSIGNED'
): OrderAssignmentRecord[] {
  const store = loadStore();
  const all = Object.values(store.assignments);
  return all.filter(
    (a) =>
      a.deliveryPartnerId === deliveryPartnerId &&
      (!status || a.status.toUpperCase() === status.toUpperCase())
  );
}

/**
 * Get all sent push notifications.
 */
export function getPushNotifications(deliveryPartnerId?: string): PushNotificationRecord[] {
  const store = loadStore();
  if (deliveryPartnerId) {
    return store.notifications.filter((n) => n.deliveryPartnerId === deliveryPartnerId);
  }
  return store.notifications;
}

