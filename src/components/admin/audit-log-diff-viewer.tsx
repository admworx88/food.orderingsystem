'use client';

import { cn } from '@/lib/utils';

interface AuditLogDiffViewerProps {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  action: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getChangedKeys(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): Set<string> {
  const changed = new Set<string>();
  if (!oldData || !newData) return changed;

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.add(key);
    }
  }
  return changed;
}

export function AuditLogDiffViewer({
  oldData,
  newData,
  action,
}: AuditLogDiffViewerProps) {
  if (action === 'created' && newData) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          New Record
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 overflow-x-auto">
          <table className="text-sm w-full">
            <tbody>
              {Object.entries(newData).map(([key, value]) => (
                <tr key={key} className="border-b border-emerald-100 last:border-0">
                  <td className="py-1.5 pr-4 font-medium text-slate-700 whitespace-nowrap align-top">
                    {key}
                  </td>
                  <td className="py-1.5 text-emerald-800 break-all">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {formatValue(value)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (action === 'deleted' && oldData) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Deleted Record
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 overflow-x-auto">
          <table className="text-sm w-full">
            <tbody>
              {Object.entries(oldData).map(([key, value]) => (
                <tr key={key} className="border-b border-red-100 last:border-0">
                  <td className="py-1.5 pr-4 font-medium text-slate-700 whitespace-nowrap align-top">
                    {key}
                  </td>
                  <td className="py-1.5 text-red-800 break-all">
                    <pre className="text-xs whitespace-pre-wrap font-mono line-through">
                      {formatValue(value)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (action === 'updated' && oldData && newData) {
    const changedKeys = getChangedKeys(oldData, newData);
    const allKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Changes ({changedKeys.size} field{changedKeys.size !== 1 ? 's' : ''} modified)
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="text-sm w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Field
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Before
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500 uppercase">
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key) => {
                const isChanged = changedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b last:border-0',
                      isChanged ? 'bg-amber-50/50' : 'opacity-50'
                    )}
                  >
                    <td className="py-1.5 px-3 font-medium text-slate-700 whitespace-nowrap align-top">
                      {isChanged && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 relative top-[-1px]" />
                      )}
                      {key}
                    </td>
                    <td className="py-1.5 px-3 break-all">
                      <pre
                        className={cn(
                          'text-xs whitespace-pre-wrap font-mono',
                          isChanged ? 'text-red-700 bg-red-50 px-1 rounded' : 'text-slate-500'
                        )}
                      >
                        {formatValue(oldData[key])}
                      </pre>
                    </td>
                    <td className="py-1.5 px-3 break-all">
                      <pre
                        className={cn(
                          'text-xs whitespace-pre-wrap font-mono',
                          isChanged ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-500'
                        )}
                      >
                        {formatValue(newData[key])}
                      </pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-400 italic">No data available for this entry.</p>
  );
}
