import { Suspense } from 'react';
import {
  ReportsScreen,
  parseReportPeriod,
  reportDays,
  type ReportPeriod,
} from '@/features/admin/components/reports-screen';
import { loadReport } from '@/features/admin/services/console';
import { LoadingBlock } from '@/features/workspace/components/ui/state';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatórios' };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff('view-audit');
  const period = parseReportPeriod((await searchParams).periodo);
  return (
    <Suspense fallback={<LoadingBlock lines={6} />}>
      <ReportsBody period={period} />
    </Suspense>
  );
}

async function ReportsBody({ period }: { period: ReportPeriod }) {
  const report = await loadReport(reportDays(period));
  return <ReportsScreen period={period} report={report} />;
}
