'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Smartphone, CreditCard, XCircle, Clock, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { submitShiftCollection, getOpenShift } from '@/services/payment-service';
import type { ShiftSummary } from '@/types/payment';

interface ShiftSummaryViewProps {
  summary: ShiftSummary;
  /** When undefined, the submit/status section is hidden (e.g. kiosk POS overlay context) */
  isSubmitted?: boolean;
  submittedAt?: string | null;
}

/**
 * F-C09: Shift summary - Terminal Command Center theme
 */
export function ShiftSummaryView({ summary, isSubmitted, submittedAt }: ShiftSummaryViewProps) {
  const router = useRouter();
  const showCollectionSection = isSubmitted !== undefined;
  const [submitted, setSubmitted] = useState(isSubmitted ?? false);
  const [submittedTime, setSubmittedTime] = useState(submittedAt ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const shiftResult = await getOpenShift();
    if (!shiftResult.success || !shiftResult.data) {
      setSubmitting(false);
      setError('No open shift found. Start a shift from the Payments tab first.');
      return;
    }
    const result = await submitShiftCollection(shiftResult.data.id);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      setSubmittedTime(result.data.submittedAt);
      router.refresh();
    } else {
      setError(result.error);
    }
  };
  return (
    <div className="pos-report-grid">
      {/* Header info */}
      <div className="pos-report-card pos-report-header-card">
        <div className="pos-report-header-row">
          <div>
            <div className="pos-report-label">Date</div>
            <div className="pos-report-value">{summary.date}</div>
          </div>
          <div className="text-right">
            <div className="pos-report-label">Cashier</div>
            <div className="pos-report-value">{summary.cashierName}</div>
          </div>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="pos-report-stats">
        <div className="pos-report-stat-card">
          <div className="pos-report-label">Total Orders</div>
          <div className="pos-report-stat-value">{summary.totalOrders}</div>
        </div>
        <div className="pos-report-stat-card pos-report-stat-highlight">
          <div className="pos-report-label">Total Revenue</div>
          <div className="pos-report-stat-value pos-report-revenue">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </div>
      </div>

      {/* Payment method breakdown */}
      <div className="pos-report-card">
        <h3 className="pos-report-section-title">Payment Breakdown</h3>
        <div className="pos-report-breakdown">
          <div className="pos-report-breakdown-row">
            <div className="pos-report-breakdown-info">
              <div className="pos-report-breakdown-icon">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="pos-report-breakdown-name">Cash</div>
                <div className="pos-report-breakdown-count">
                  {summary.cashPayments.count} transaction{summary.cashPayments.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="pos-report-breakdown-amount">
              {formatCurrency(summary.cashPayments.total)}
            </div>
          </div>

          <div className="pos-report-divider" />

          <div className="pos-report-breakdown-row">
            <div className="pos-report-breakdown-info">
              <div className="pos-report-breakdown-icon pos-report-icon-gcash">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="pos-report-breakdown-name">GCash</div>
                <div className="pos-report-breakdown-count">
                  {summary.gcashPayments.count} transaction{summary.gcashPayments.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="pos-report-breakdown-amount">
              {formatCurrency(summary.gcashPayments.total)}
            </div>
          </div>

          <div className="pos-report-divider" />

          <div className="pos-report-breakdown-row">
            <div className="pos-report-breakdown-info">
              <div className="pos-report-breakdown-icon pos-report-icon-gcash">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="pos-report-breakdown-name">eWallet</div>
                <div className="pos-report-breakdown-count">
                  {summary.ewalletPayments.count} transaction{summary.ewalletPayments.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="pos-report-breakdown-amount">
              {formatCurrency(summary.ewalletPayments.total)}
            </div>
          </div>

          <div className="pos-report-divider" />

          <div className="pos-report-breakdown-row">
            <div className="pos-report-breakdown-info">
              <div className="pos-report-breakdown-icon pos-report-icon-card">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="pos-report-breakdown-name">Card</div>
                <div className="pos-report-breakdown-count">
                  {summary.cardPayments.count} transaction{summary.cardPayments.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="pos-report-breakdown-amount">
              {formatCurrency(summary.cardPayments.total)}
            </div>
          </div>
        </div>
      </div>

      {/* Refunds & Cancellations */}
      <div className="pos-report-footer-stats">
        <div className="pos-report-footer-card pos-report-refund">
          <RotateCcw className="pos-report-footer-icon" />
          <div className="pos-report-label">Refunds</div>
          <div className="pos-report-footer-value">
            {summary.refunds.count > 0
              ? `-${formatCurrency(summary.refunds.total)}`
              : formatCurrency(0)}
          </div>
          <div className="pos-report-footer-count">
            {summary.refunds.count} refund{summary.refunds.count !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="pos-report-footer-card">
          <XCircle className="pos-report-footer-icon" />
          <div className="pos-report-label">Cancelled</div>
          <div className="pos-report-footer-value">{summary.cancelledOrders}</div>
          <div className="pos-report-footer-count">orders</div>
        </div>
        <div className="pos-report-footer-card">
          <Clock className="pos-report-footer-icon" />
          <div className="pos-report-label">Expired</div>
          <div className="pos-report-footer-value">{summary.expiredOrders}</div>
          <div className="pos-report-footer-count">orders</div>
        </div>
      </div>

      {/* Submit Collection — only shown on the standalone Reports page */}
      {showCollectionSection && (
      <div className="pos-collection-submit-area">
        {submitted ? (
          <div className="pos-collection-submitted">
            <CheckCircle2 className="w-5 h-5 text-[var(--pos-mint)]" />
            <div>
              <p className="pos-collection-submitted-label">Collection Submitted</p>
              {submittedTime && (
                <p className="pos-collection-submitted-time">
                  {new Date(submittedTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="pos-collection-submit-group">
            <div>
              <p className="pos-collection-submit-label">End of Shift</p>
              <p className="pos-collection-submit-desc">
                Submit your collection report to close the shift and enable sign-out.
              </p>
            </div>
            {error && <p className="pos-collection-error">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="pos-collection-submit-btn"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {submitting ? 'Submitting…' : 'Submit & Close Shift'}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
