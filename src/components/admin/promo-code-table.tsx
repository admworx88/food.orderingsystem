'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Tag, Plus, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { togglePromoCodeStatus, deletePromoCode } from '@/services/promo-service';
import { formatCurrency } from '@/lib/utils/currency';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import { PromoCodeFilters } from './promo-code-filters';
import { PromoCodeFormDialog } from './promo-code-form-dialog';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

interface PromoCodeTableProps {
  promoCodes: PromoCode[];
}

function getPromoStatus(promo: PromoCode): 'active' | 'expired' | 'depleted' | 'inactive' {
  const now = new Date();
  const validUntil = new Date(promo.valid_until);
  const validFrom = new Date(promo.valid_from);
  if (validUntil < now) return 'expired';
  if (promo.max_usage_count !== null && (promo.current_usage_count ?? 0) >= promo.max_usage_count) return 'depleted';
  if (!promo.is_active || validFrom > now) return 'inactive';
  return 'active';
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  expired: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  depleted: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  inactive: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};
const statusLabels: Record<string, string> = {
  active: 'Active', expired: 'Expired', depleted: 'Depleted', inactive: 'Inactive',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-0.5 rounded text-slate-300 hover:text-slate-600 transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function PromoCodeTable({ promoCodes }: PromoCodeTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    let result = promoCodes;
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) => p.code.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term))
      );
    }
    if (statusFilter !== 'all') result = result.filter((p) => getPromoStatus(p) === statusFilter);
    return result;
  }, [promoCodes, search, statusFilter]);

  const handleToggle = async (id: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: true }));
    try {
      const result = await togglePromoCodeStatus(id);
      if (result.success) toast.success(`Promo code ${result.data.is_active ? 'activated' : 'deactivated'}`);
      else toast.error(result.error);
    } catch { toast.error('Failed to toggle status'); }
    finally { setLoadingStates((prev) => ({ ...prev, [id]: false })); }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return;
    setLoadingStates((prev) => ({ ...prev, [id]: true }));
    try {
      const result = await deletePromoCode(id);
      if (result.success) toast.success('Promo code deleted');
      else toast.error(result.error);
    } catch { toast.error('Failed to delete promo code'); }
    finally { setLoadingStates((prev) => ({ ...prev, [id]: false })); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <PromoCodeFilters
          search={search}
          status={statusFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
        />
        <PromoCodeFormDialog
          trigger={
            <Button className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              New Promo
            </Button>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <DataCard padding="none">
          <EmptyState
            icon={Tag}
            title={promoCodes.length === 0 ? 'No promo codes yet' : 'No matching promo codes'}
            description={promoCodes.length === 0 ? 'Create your first promo code to start offering discounts.' : 'Try adjusting your search or status filter.'}
            className="py-14"
          />
        </DataCard>
      ) : (
        <DataCard padding="none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 pl-6">Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Value</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">Valid Period</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Usage</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center w-[80px]">Active</TableHead>
                  <TableHead className="w-[60px] pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((promo) => {
                  const status = getPromoStatus(promo);
                  const usageCount = promo.current_usage_count ?? 0;
                  const maxUsage = promo.max_usage_count;
                  const usagePct = maxUsage ? Math.min((usageCount / maxUsage) * 100, 100) : 0;
                  return (
                    <TableRow
                      key={promo.id}
                      className={cn('hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0', status === 'expired' || status === 'depleted' ? 'opacity-60' : '')}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center">
                          <span className="font-mono font-semibold text-sm text-slate-800">{promo.code}</span>
                          <CopyButton code={promo.code} />
                        </div>
                        {promo.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{promo.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {promo.discount_type === 'percentage' ? 'Percent' : 'Fixed'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm text-slate-900 tabular-nums">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-600">
                          <p>{formatDate(promo.valid_from)}</p>
                          <p className="text-slate-400">to {formatDate(promo.valid_until)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm tabular-nums text-slate-700">
                          {usageCount}{maxUsage !== null ? ` / ${maxUsage}` : ' / ∞'}
                        </span>
                        {maxUsage !== null && (
                          <div className="mt-1 h-1 w-16 mx-auto rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', usagePct >= 100 ? 'bg-red-400' : 'bg-amber-400')}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', statusStyles[status])}>
                          {statusLabels[status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={promo.is_active ?? false}
                          disabled={loadingStates[promo.id]}
                          onCheckedChange={() => handleToggle(promo.id)}
                        />
                      </TableCell>
                      <TableCell className="pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PromoCodeFormDialog
                              promoCode={promo}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              onSelect={() => handleDelete(promo.id, promo.code)}
                              className="text-rose-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DataCard>
      )}
    </div>
  );
}
