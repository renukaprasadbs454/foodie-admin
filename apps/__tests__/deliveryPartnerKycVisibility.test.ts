import { isDeliveryPartnerKycEligible, type AdminDeliveryPartner } from '../features/deliveryPartners/types';

describe('Delivery Partner KYC Visibility Rules', () => {
  const completePartner: AdminDeliveryPartner = {
    id: 'dp-100',
    userCredentialId: 'uc-100',
    fullName: 'Ramesh Patel',
    phoneNumber: '+919876543210',
    vehicleType: 'BIKE',
    vehicleNumber: 'KA-04-AB-1234',
    profileImageUrl: null,
    kycStatus: 'PENDING',
    isOnline: false,
    cashInHand: 0,
    totalDeliveries: 0,
    zone: 'Tumkur Central',
    documents: [
      {
        documentId: 'doc-1',
        docType: 'IDENTITY',
        verificationStatus: 'PENDING',
        fileKey: 'docs/identity.png',
      },
      {
        documentId: 'doc-2',
        docType: 'LICENSE',
        verificationStatus: 'PENDING',
        fileKey: 'docs/license.png',
      },
      {
        documentId: 'doc-3',
        docType: 'VEHICLE_RC',
        verificationStatus: 'PENDING',
        fileKey: 'docs/rc.png',
      },
    ],
    createdAt: '2026-10-13T10:00:00Z',
  };

  it('allows partner with selected zone and all 3 uploaded documents (Identity, License, Vehicle RC)', () => {
    expect(isDeliveryPartnerKycEligible(completePartner)).toBe(true);
  });

  it('rejects partner who has not selected a delivery zone', () => {
    const noZonePartner = { ...completePartner, zone: '' };
    expect(isDeliveryPartnerKycEligible(noZonePartner)).toBe(false);

    const unassignedZonePartner = { ...completePartner, zone: 'Unassigned' };
    expect(isDeliveryPartnerKycEligible(unassignedZonePartner)).toBe(false);
  });

  it('rejects partner who has no uploaded documents', () => {
    const noDocsPartner = { ...completePartner, documents: [] };
    expect(isDeliveryPartnerKycEligible(noDocsPartner)).toBe(false);
  });

  it('rejects partner missing Vehicle RC document', () => {
    const missingRcPartner = {
      ...completePartner,
      documents: completePartner.documents.filter((d) => d.docType !== 'VEHICLE_RC'),
    };
    expect(isDeliveryPartnerKycEligible(missingRcPartner)).toBe(false);
  });

  it('rejects partner missing Driving License document', () => {
    const missingLicPartner = {
      ...completePartner,
      documents: completePartner.documents.filter((d) => d.docType !== 'LICENSE'),
    };
    expect(isDeliveryPartnerKycEligible(missingLicPartner)).toBe(false);
  });

  it('rejects partner missing Identity document', () => {
    const missingIdPartner = {
      ...completePartner,
      documents: completePartner.documents.filter((d) => d.docType !== 'IDENTITY'),
    };
    expect(isDeliveryPartnerKycEligible(missingIdPartner)).toBe(false);
  });

  it('rejects partner with documents that have no file keys or URLs', () => {
    const emptyFilesPartner = {
      ...completePartner,
      documents: [
        { documentId: 'doc-1', docType: 'IDENTITY', verificationStatus: 'PENDING' as const },
        { documentId: 'doc-2', docType: 'LICENSE', verificationStatus: 'PENDING' as const },
        { documentId: 'doc-3', docType: 'VEHICLE_RC', verificationStatus: 'PENDING' as const },
      ],
    };
    expect(isDeliveryPartnerKycEligible(emptyFilesPartner)).toBe(false);
  });
});
