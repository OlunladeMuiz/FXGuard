import { redirect } from 'next/navigation';

/**
 * Home Page
 * Redirects to the dashboard
 */
export default function Home() {
  redirect('/dashboard');
}
