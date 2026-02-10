import { getShiftSummary } from '@/services/payment-service';
import { ShiftSummaryView } from '@/components/cashier/shift-summary-view';

export default async function ReportsPage() {
  const result = await getShiftSummary();
  const summary = result.success ? result.data : null;

  return (
    <div className="pos-reports-container">
      <h2 className="pos-reports-title">Shift Report</h2>
      {summary ? (
        <ShiftSummaryView summary={summary} />
      ) : (
        <div className="pos-reports-error">
          Failed to load shift summary
        </div>
      )}
    </div>
  );
}
