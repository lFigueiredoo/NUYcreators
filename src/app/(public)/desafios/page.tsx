import { redirect } from 'next/navigation';
export const metadata = { title: 'Desafios' };
export default function Challenges() {
  redirect('/app/desafios');
}
