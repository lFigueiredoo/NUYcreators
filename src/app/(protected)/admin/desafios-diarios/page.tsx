import { revalidatePath } from 'next/cache';
import { DailyActivitiesScreen } from '@/features/admin/components/daily-activities-screen';
import { loadDailyActivities, commandSaveDailyActivity } from '@/features/admin/services/console';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Desafios diários' };

async function save(form: FormData) {
  'use server';
  await requireStaff('manage-catalog');
  await commandSaveDailyActivity({
    activityId: String(form.get('activityId') || ''),
    name: String(form.get('name') || ''),
    platform: String(form.get('platform') || ''),
    format: String(form.get('format') || ''),
    points: Number(form.get('points') || 0),
    dailyLimit: Number(form.get('dailyLimit') || 1),
    active: form.get('active') === 'on',
    rules: String(form.get('rules') || ''),
  });
  revalidatePath('/admin/desafios-diarios');
  revalidatePath('/app/desafios');
}

export default async function DailyActivitiesPage() {
  await requireStaff('manage-catalog');
  const result = await loadDailyActivities();
  return <DailyActivitiesScreen result={result} save={save} />;
}
