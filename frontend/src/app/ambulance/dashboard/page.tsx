/**
 * The old /ambulance/dashboard route is now canonicalised to /ambulance.
 * This redirect ensures any bookmarked or linked URLs still work.
 */
import { redirect } from 'next/navigation';

export default function AmbulanceDashboardRedirect() {
  redirect('/ambulance');
}
