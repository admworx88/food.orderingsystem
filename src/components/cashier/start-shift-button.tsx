'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { startShift } from '@/services/payment-service';

export function StartShiftButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleStart = () => {
    startTransition(async () => {
      const result = await startShift();
      if (result.success) {
        toast.success('Shift started! You can now process payments.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleStart}
      disabled={pending}
      className="pos-collection-submit-btn"
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <PlayCircle className="w-5 h-5" />
      )}
      {pending ? 'Starting shift…' : 'Start Shift'}
    </button>
  );
}
