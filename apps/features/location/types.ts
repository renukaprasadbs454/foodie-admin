export type RequestSource = 'CUSTOMER' | 'DELIVERY_PARTNER' | 'RESTAURANT';

export interface UnserviceableRequestDto {
  id: string;
  restaurantName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  cityName: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  requestSource?: RequestSource;
  requesterName?: string;
  requestedArea?: string;
  zoneId?: string;
  zoneName?: string;
}

export function inferRequestSource(req: UnserviceableRequestDto): RequestSource {
  if (req.requestSource) return req.requestSource;
  const name = (req.restaurantName || '').toLowerCase();
  const contact = (req.contactPerson || '').toLowerCase();
  if (name.includes('[customer]') || name.startsWith('customer:') || contact.includes('customer')) {
    return 'CUSTOMER';
  }
  if (
    name.includes('[delivery partner]') ||
    name.includes('[delivery_partner]') ||
    name.includes('[driver]') ||
    name.startsWith('delivery partner:') ||
    contact.includes('delivery') ||
    contact.includes('driver')
  ) {
    return 'DELIVERY_PARTNER';
  }
  return 'RESTAURANT';
}

export function getRequesterDisplayName(req: UnserviceableRequestDto): string {
  const raw = req.requesterName || req.restaurantName || 'Unknown Requester';
  return raw
    .replace(/^\[(Customer|Delivery Partner|Restaurant)\]\s*/i, '')
    .replace(/^(Customer|Delivery Partner|Restaurant):\s*/i, '');
}

export function getRequestedArea(req: UnserviceableRequestDto): string {
  const addr = req.requestedArea || req.address || '';
  if (req.latitude && req.longitude) {
    const lat = Number(req.latitude);
    const lng = Number(req.longitude);
    if (Math.abs(lat - 13.175) < 0.03 && Math.abs(lng - 77.559) < 0.03) {
      if (addr.toLowerCase().includes('doddanagamangala')) {
        return 'Sri Banashankri Layout, Yelahanka taluku';
      }
    }
  }
  return addr || 'Unspecified Area';
}
