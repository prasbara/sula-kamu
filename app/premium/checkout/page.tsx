import { redirect } from 'next/navigation';

export default function PremiumCheckoutPage() {
  // Redirect to official checkout anchor on /premium
  redirect('/premium#checkout');
}
