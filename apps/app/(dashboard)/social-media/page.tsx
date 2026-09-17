import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Social Media Management | Foodie Admin',
  description: 'Manage platform social media links, URLs, and active display statuses',
};

export default function SocialMediaPage() {
  redirect('/settings?tab=social-media');
}

