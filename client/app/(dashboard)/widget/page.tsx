import { redirect } from 'next/navigation';

export default function WidgetRedirectPage() {
  redirect('/agent?role=script');
}
