export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  totalOrders: number;
  totalSpend: number;
  savedAddressesCount: number;
  accountStatus: AccountStatus;
  joinedDate: string;
  lastOrderDate: string;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export type TicketCategory = 'MISSING_ITEM' | 'COLD_FOOD' | 'REFUND_REQUEST' | 'DELIVERY_DELAY' | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  agentNotes?: string;
}

export function calculateCustomerLtvBadge(totalSpend: number): { tier: string; color: string; bg: string } {
  if (totalSpend >= 1000) return { tier: 'PLATINUM VIP', color: '#FFFFFF', bg: '#0284C7' };
  if (totalSpend >= 500) return { tier: 'GOLD', color: '#0284C7', bg: '#E0F2FE' };
  if (totalSpend >= 200) return { tier: 'SILVER', color: '#0369A1', bg: '#F0F9FF' };
  return { tier: 'BRONZE', color: '#64748B', bg: '#F1F5F9' };
}
