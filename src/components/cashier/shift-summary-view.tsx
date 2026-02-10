'use client';

import { Banknote, Smartphone, CreditCard, XCircle, Clock, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { ShiftSummary } from '@/types/payment';

interface ShiftSummaryViewProps {
  summary: ShiftSummary;
}

/**
 * F-C09: Shift summary - Terminal Command Center theme
 */
export function ShiftSummaryView({ summary }: ShiftSummaryViewProps) {
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
    </div>
  );
}
