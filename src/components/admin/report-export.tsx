'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportOrdersCSV, type OrderFilters } from '@/services/order-service';

interface ReportExportProps {
  filters: OrderFilters;
}

export function ReportExport({ filters }: ReportExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = await exportOrdersCSV(filters);

      if (result.success) {
        // Create and download the CSV file
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with date range
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.download = `orders-export-${dateStr}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Export downloaded successfully');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export CSV
        </>
      )}
    </Button>
  );
}
