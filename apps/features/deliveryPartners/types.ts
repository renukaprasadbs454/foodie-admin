/**
 * P2-ADM-03 delivery partner KYC response — DeliveryProfileResponseDto.
 */

export interface DeliveryDocument {
  id?: string;
  documentId?: string;
  docType: string;
  type?: string;
  s3Key?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  remarks?: string | null;
  createdAt?: string | null;
  uploadedAt?: string | null;
}

export type DeliveryPartnerProfile = {
  partnerId: string;
  fullName?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  kycStatus?: string | null;
  isOnline?: boolean;
  profileImageUrl?: string | null;
  documents?: DeliveryDocument[];
};

export interface AdminDeliveryPartner {
  id: string;
  userCredentialId: string;
  fullName: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber?: string | null;
  profileImageUrl?: string | null;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isOnline: boolean;
  cashInHand: number;
  totalDeliveries: number;
  zone: string;
  documents: DeliveryDocument[];
  createdAt: string;
}

export type DeliverymanRecord = {
  id: string;
  name: string;
  phone: string;
  zone: string;
  vehicleType: string;
  onlineStatus: 'ONLINE' | 'OFFLINE';
  cashInHand: number;
  totalDeliveries: number;
  rating?: number;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  documentType?: string;
  documentNumber?: string;
  documentVerificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED';
  uploadedDocumentName?: string;
};

export interface AdminDeliveryPartnersResponse {
  items: AdminDeliveryPartner[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPartnerUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Validates that a delivery partner has selected a delivery zone
 * and successfully uploaded all required KYC documents (Identity, License, Vehicle RC).
 */
export function isDeliveryPartnerKycEligible(partner?: AdminDeliveryPartner | null): boolean {
  if (!partner) return false;

  // 1. Must have selected a delivery zone
  const hasZone = Boolean(
    partner.zone &&
      typeof partner.zone === 'string' &&
      partner.zone.trim() !== '' &&
      partner.zone.toLowerCase() !== 'unassigned' &&
      partner.zone.toLowerCase() !== 'null'
  );
  if (!hasZone) return false;

  // 2. Must have uploaded all 3 required documents (Identity, License, Vehicle RC)
  const docs = partner.documents || (partner as any).docs || [];
  if (!Array.isArray(docs) || docs.length < 3) return false;

  const hasDoc = (checker: (type: string) => boolean) =>
    docs.some((d: any) => {
      const type = (d.docType || d.type || '').toUpperCase();
      const hasFile = Boolean(d.fileKey || d.s3Key || d.fileUrl || d.downloadUrl);
      return hasFile && checker(type);
    });

  const hasIdentity = hasDoc((t) => t === 'IDENTITY' || t.includes('AADHAAR') || t.includes('PAN') || t.includes('PASSPORT'));
  const hasLicense = hasDoc((t) => t === 'LICENSE' || t === 'DRIVING_LICENSE' || t === 'DRIVING_LICENCE' || t.includes('LICENSE') || t.includes('LICENCE'));
  const hasVehicleRc = hasDoc((t) => t === 'VEHICLE_RC' || t.includes('RC') || t.includes('VEHICLE'));

  return hasIdentity && hasLicense && hasVehicleRc;
}

