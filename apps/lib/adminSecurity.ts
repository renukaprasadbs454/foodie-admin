import crypto from 'crypto';

/**
 * Admin Password Security and Cryptographic Hashing Utilities
 * Ensures passwords are never stored in plain text and enforces strict password strength validation.
 */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length === 3 && parts[0] === 'pbkdf2') {
    const salt = parts[1];
    const originalHash = parts[2];
    try {
      const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(testHash, 'hex'));
    } catch {
      return false;
    }
  }
  return false;
}

export function isStrongPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

export function getDefaultAdminUsers() {
  return [
    {
      id: 'USR-1001',
      fullName: 'Admin Operator',
      email: 'admin@foodie.local',
      phone: '+91 98000 00001',
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      joinedDate: '2025-01-10',
      lastActive: 'Just now',
      department: 'Executive Operations',
      assignedZoneId: null,
      assignedZoneName: 'All Zones (Global Access)',
      passwordHash: hashPassword('ChangeMe@123'),
    },
    {
      id: 'USR-1002',
      fullName: 'Operations Admin',
      email: 'ops@foodie.local',
      phone: '+91 98000 00002',
      role: 'OPS',
      accountStatus: 'ACTIVE',
      joinedDate: '2025-03-15',
      lastActive: '12 mins ago',
      department: 'Logistics & Merchant Ops',
      assignedZoneId: 'dz-bangalore',
      assignedZoneName: 'Bangalore Zone',
      passwordHash: hashPassword('ChangeMe@123'),
    },
    {
      id: 'USR-1003',
      fullName: 'Finance Admin',
      email: 'finance@foodie.local',
      phone: '+91 98000 00003',
      role: 'FINANCE',
      accountStatus: 'ACTIVE',
      joinedDate: '2025-06-20',
      lastActive: '1 hour ago',
      department: 'Corporate Finance & Payouts',
      assignedZoneId: 'dz-tumkur',
      assignedZoneName: 'Tumkur Zone',
      passwordHash: hashPassword('ChangeMe@123'),
    },
    {
      id: 'USR-1004',
      fullName: 'Support Agent',
      email: 'support@foodie.local',
      phone: '+91 98000 00004',
      role: 'SUPPORT',
      accountStatus: 'ACTIVE',
      joinedDate: '2025-09-01',
      lastActive: '25 mins ago',
      department: 'Customer Escalations Desk',
      assignedZoneId: 'dz-bangalore',
      assignedZoneName: 'Bangalore Zone',
      passwordHash: hashPassword('ChangeMe@123'),
    },
    {
      id: 'USR-1005',
      fullName: 'Compliance Auditor',
      email: 'auditor@foodie.local',
      phone: '+91 98000 00005',
      role: 'AUDITOR',
      accountStatus: 'ACTIVE',
      joinedDate: '2026-01-15',
      lastActive: '2 hours ago',
      department: 'Compliance & Risk Audit',
      assignedZoneId: null,
      assignedZoneName: 'All Zones (Global Access)',
      passwordHash: hashPassword('ChangeMe@123'),
    },
    {
      id: 'USR-1006',
      fullName: 'Bangalore Zone Manager',
      email: 'blr.admin@foodie.local',
      phone: '+91 98888 12345',
      role: 'OPS',
      accountStatus: 'ACTIVE',
      joinedDate: '2026-02-01',
      lastActive: 'Active',
      department: 'Regional Operations',
      assignedZoneId: 'dz-bangalore',
      assignedZoneName: 'Bangalore Zone',
      passwordHash: hashPassword('BlrSecure@2026'),
    },
    {
      id: 'USR-1007',
      fullName: 'Tumkur Zone Manager',
      email: 'tmk.admin@foodie.local',
      phone: '+91 98888 12345',
      role: 'OPS',
      accountStatus: 'ACTIVE',
      joinedDate: '2026-02-01',
      lastActive: 'Active',
      department: 'Regional Operations',
      assignedZoneId: 'dz-tumkur',
      assignedZoneName: 'Tumkur Zone',
      passwordHash: hashPassword('TmkSecure@2026'),
    },
  ];
}

