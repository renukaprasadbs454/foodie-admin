/**
 * P2-ADM-03 delivery partner KYC response — DeliveryProfileResponseDto.
 */

export interface DeliveryDocument {
  id: string;
  docType: string;
  s3Key?: string | null;
  downloadUrl?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  remarks?: string | null;
  createdAt?: string | null;
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
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
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
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
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
