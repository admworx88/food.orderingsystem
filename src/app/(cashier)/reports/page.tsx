import { getShiftSummary } from '@/services/payment-service';
import { ShiftSummaryView } from '@/components/cashier/shift-summary-view';

export default async function ReportsPage() {
  const result = await getShiftSummary();
  const summary = result.success ? result.data : null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-2xl font-bold">Shift Report</h2>
      {summary ? (
        <ShiftSummaryView summary={summary} />
      ) : (
        <div className="text-center text-muted-foreground">
          Failed to load shift summary
        </div>
      )}
    </div>
  );
}
