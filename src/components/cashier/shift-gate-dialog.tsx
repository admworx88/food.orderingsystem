'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, FileText, X } from 'lucide-react';

interface ShiftGateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShiftGateDialog({ open, onClose }: ShiftGateDialogProps) {
  const router = useRouter();

  if (!open) return null;

  const handleGoToReports = () => {
    onClose();
    router.push('/collections');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
      <div className="pos-gate-dialog">
        <button
          onClick={onClose}
          className="pos-gate-close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pos-gate-icon-wrap">
          <AlertTriangle className="w-7 h-7 text-[var(--pos-amber)]" />
        </div>

        <h2 className="pos-gate-title">Collection Not Submitted</h2>
        <p className="pos-gate-desc">
          You must submit your end-of-shift collection report before signing out.
          Go to the Collections tab, review your totals, and click{' '}
          <strong>Submit &amp; Close Shift</strong>.
        </p>

        <div className="pos-gate-actions">
          <button onClick={handleGoToReports} className="pos-gate-primary-btn">
            <FileText className="w-4 h-4" />
            Go to Collections
          </button>
          <button onClick={onClose} className="pos-gate-secondary-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
