import { UnserviceableAreasPage } from '@/features/location/pages/UnserviceableAreasPage';

export const metadata = {
  title: 'Unserviceable Areas Request | Foodie Admin',
  description: 'Manage unserviceable area expansion requests submitted by Customers, Delivery Partners, and Restaurants.',
};

export default function UnserviceableAreasRoute() {
  return <UnserviceableAreasPage />;
}
