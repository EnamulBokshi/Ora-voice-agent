import { redirect } from 'next/navigation';

export default function EmbedRedirectPage() {
  redirect('/agent?role=script');
}
