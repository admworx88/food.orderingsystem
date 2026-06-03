import { ClipboardList } from 'lucide-react';
import { StartShiftButton } from './start-shift-button';

export function StartShiftGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] gap-6 px-6">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--pos-amber)]/10 flex items-center justify-center">
          <ClipboardList className="w-8 h-8 text-[var(--pos-amber)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--pos-text)]">No Open Shift</h2>
        <p className="text-[var(--pos-text-muted)] text-sm leading-relaxed">
          You must start a shift before processing payments. Click below to begin your shift and enable the payment queue.
        </p>
        <StartShiftButton />
      </div>
    </div>
  );
}
