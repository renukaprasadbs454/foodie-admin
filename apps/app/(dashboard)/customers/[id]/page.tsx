import { CustomerDetailsPage } from '@/features/customers/pages/CustomerDetailsPage';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: 'Customer Profile & Operations | Foodie Admin',
  description: 'View detailed customer profile, order history, transactions, complaints, addresses, reviews, and configure account security and COD controls',
};

export default async function AdminCustomerDetailsRoute({ params }: Props) {
  const { id } = await params;
  return <CustomerDetailsPage customerId={id} />;
}
