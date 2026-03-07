import { redirect } from 'next/navigation';

export default function TransactionsRedirect() {
  redirect('/invoice-generator/review');
}
