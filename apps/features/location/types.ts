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
  distanceFromZoneKm?: number;
  restaurantId?: string;
  deliveryPartnerId?: string;
  submittedDocuments?: string[] | string;
  documentDetails?: DocumentDetailDto[];
}

export interface DocumentDetailDto {
  documentId?: string;
  docType: string;
  name?: string;
  fileUrl?: string | null;
  s3Key?: string | null;
}

export function getSubmittedDocumentsList(req: UnserviceableRequestDto): string[] {
  if (!req.submittedDocuments) return [];
  if (Array.isArray(req.submittedDocuments)) {
    return req.submittedDocuments.map((d) => String(d).trim()).filter(Boolean);
  }
  if (typeof req.submittedDocuments === 'string') {
    return req.submittedDocuments
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
}

export function formatDocumentName(doc: string): string {
  if (!doc) return '';
  const clean = doc.replace(/[_-]/g, ' ').trim().toLowerCase();
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveDocumentUrl(raw?: string | null): string {
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
  if (trimmed.startsWith('restaurants/') || trimmed.startsWith('delivery-partners/')) {
    return `/api/bff/storage/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/api/bff/storage/${trimmed}`;
}

export function getNormalizedDocuments(req: UnserviceableRequestDto): DocumentDetailDto[] {
  if (req.documentDetails && req.documentDetails.length > 0) {
    return req.documentDetails.map((d, idx) => ({
      ...d,
      documentId: d.documentId || `${req.id}-doc-${idx}`,
      name: d.name || formatDocumentName(d.docType),
      fileUrl: d.fileUrl ? resolveDocumentUrl(d.fileUrl) : undefined,
    }));
  }

  const rawList = getSubmittedDocumentsList(req);
  return rawList.map((doc, idx) => {
    let docType = doc;
    let fileUrl: string | undefined = undefined;

    if (doc.startsWith('http://') || doc.startsWith('https://') || doc.startsWith('/') || doc.startsWith('storage/')) {
      docType = doc.split('/').pop() || 'DOCUMENT';
      fileUrl = resolveDocumentUrl(doc);
    } else if (doc.includes(':') && (doc.includes('http') || doc.includes('/'))) {
      const [typePart, ...rest] = doc.split(':');
      docType = typePart.trim();
      fileUrl = resolveDocumentUrl(rest.join(':').trim());
    } else if (req.restaurantId) {
      fileUrl = resolveDocumentUrl(`restaurants/${req.restaurantId}/documents/${doc}`);
    } else if (req.deliveryPartnerId) {
      fileUrl = resolveDocumentUrl(`delivery-partners/${req.deliveryPartnerId}/documents/${doc}`);
    }

    return {
      documentId: `${req.id}-doc-${idx}`,
      docType: docType,
      name: formatDocumentName(docType),
      fileUrl: fileUrl,
    };
  });
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
  let addr = req.requestedArea || req.address || '';
  if (req.latitude && req.longitude) {
    const lat = Number(req.latitude);
    const lng = Number(req.longitude);
    if (Math.abs(lat - 13.175) < 0.03 && Math.abs(lng - 77.559) < 0.03) {
      if (addr.toLowerCase().includes('doddanagamangala') || addr.toLowerCase().includes('locating') || !addr.trim()) {
        return 'Sri Banashankri Layout, Yelahanka taluku';
      }
    }
  }
  if (addr.includes(' • ')) {
    addr = addr.split(' • ').slice(1).join(' • ');
  }
  return addr.trim() || 'Unspecified Area';
}
