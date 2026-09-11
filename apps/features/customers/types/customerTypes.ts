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
  if (totalSpend >= 1000) return { tier: 'PLATINUM VIP', color: '#FFFFFF', bg: '#000000' };
  if (totalSpend >= 500) return { tier: 'GOLD', color: '#09090B', bg: '#F4F4F5' };
  if (totalSpend >= 200) return { tier: 'SILVER', color: '#09090B', bg: '#F4F4F5' };
  return { tier: 'BRONZE', color: '#71717A', bg: '#F4F4F5' };
}
