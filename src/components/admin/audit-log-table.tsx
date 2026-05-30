'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AuditLogDiffViewer } from './audit-log-diff-viewer';
import { EmptyState } from './empty-state';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuditLogEntry } from '@/services/analytics-service';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

function ActionBadge({ action }: { action: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    created: { label: 'Created', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
    updated: { label: 'Updated', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
    deleted: { label: 'Deleted', className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  };
  const { label, className } = cfg[action] ?? {
    label: action,
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', className)}>
      {label}
    </span>
  );
}

const rowBorderColor: Record<string, string> = {
  created: 'border-l-emerald-400',
  updated: 'border-l-amber-400',
  deleted: 'border-l-red-400',
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No audit log entries found"
        description="Try adjusting your filter criteria"
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-10 pl-4" />
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timestamp</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">User</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Table</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Record ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasData = log.old_data || log.new_data;
            const borderColor = rowBorderColor[log.action] ?? 'border-l-slate-200';

            return (
              <React.Fragment key={log.id}>
                <TableRow
                  className={cn(
                    'group cursor-pointer border-l-2 transition-colors',
                    borderColor,
                    isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  )}
                  onClick={() => {
                    if (hasData) setExpandedId(isExpanded ? null : log.id);
                  }}
                >
                  <TableCell className="w-10 pl-4">
                    {hasData && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.created_at ? (
                      <div className="text-sm">
                        <div className="font-medium text-slate-800">
                          {format(new Date(log.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {format(new Date(log.created_at), 'h:mm:ss a')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700">
                        {log.user_name || <span className="text-slate-400 italic">System</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                      {log.table_name}
                    </code>
                  </TableCell>
                  <TableCell>
                    {log.record_id ? (
                      <code className="text-xs text-slate-500 font-mono">
                        {log.record_id.substring(0, 8)}…
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className={cn('border-l-2', borderColor)}>
                    <TableCell colSpan={6} className="bg-slate-50/80 px-6 py-4">
                      <AuditLogDiffViewer
                        oldData={log.old_data}
                        newData={log.new_data}
                        action={log.action}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
