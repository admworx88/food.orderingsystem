'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateSettings, updateBirConfig, updateKioskPin } from '@/services/settings-service';
import type { Database } from '@/lib/supabase/types';

type BirConfig = Database['public']['Tables']['bir_receipt_config']['Row'];

interface SettingsClientProps {
  settings: Record<string, unknown>;
  birConfig: BirConfig | null;
  kioskPin: string;
}

function SettingsSection({ title, description, children, onSave, isSaving }: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-6 space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
      <div className="flex justify-end pt-2 border-t">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-amber-500 hover:bg-amber-600 text-white px-6"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
      <div>
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export function SettingsClient({ settings, birConfig, kioskPin }: SettingsClientProps) {
  // Business & Ordering
  const [restaurantName, setRestaurantName] = useState(
    String(settings.restaurant_name ?? 'Hotel Restaurant')
  );
  const [openTime, setOpenTime] = useState(
    (settings.operating_hours as { open: string; close: string } | null)?.open ?? '06:00'
  );
  const [closeTime, setCloseTime] = useState(
    (settings.operating_hours as { open: string; close: string } | null)?.close ?? '23:00'
  );
  const [orderPrefix, setOrderPrefix] = useState(
    String(settings.order_number_prefix ?? 'A')
  );
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Tax & Charges
  const [taxRate, setTaxRate] = useState(
    String(Number(settings.tax_rate ?? 0.12) * 100)
  );
  const [serviceCharge, setServiceCharge] = useState(
    String(Number(settings.service_charge ?? 0.10) * 100)
  );
  const [pwdScRate, setPwdScRate] = useState(
    String(Number(settings.pwd_sc_discount_rate ?? 0.20) * 100)
  );
  const [savingTax, setSavingTax] = useState(false);

  // Ordering & Timers
  const [orderTimeout, setOrderTimeout] = useState(
    String(settings.unpaid_order_timeout_minutes ?? 15)
  );
  const [graceperiod, setGracePeriod] = useState(
    String(settings.order_grace_period_minutes ?? 5)
  );
  const [idleTimeout, setIdleTimeout] = useState(
    String(settings.idle_timeout_seconds ?? 120)
  );
  const [kdsAutoHide, setKdsAutoHide] = useState(
    String(settings.kds_auto_hide_seconds ?? 30)
  );
  const [savingOrdering, setSavingOrdering] = useState(false);

  // BIR Config
  const [bir, setBir] = useState({
    tin: birConfig?.tin ?? '',
    business_name: birConfig?.business_name ?? '',
    business_address: birConfig?.business_address ?? '',
    permit_number: birConfig?.permit_number ?? '',
    permit_date_issued: birConfig?.permit_date_issued ?? '',
    accreditation_number: birConfig?.accreditation_number ?? '',
    accreditation_date: birConfig?.accreditation_date ?? '',
    pos_machine_id: birConfig?.pos_machine_id ?? '',
    terminal_id: birConfig?.terminal_id ?? '',
  });
  const [savingBir, setSavingBir] = useState(false);

  // Kiosk PIN
  const [kioskPinValue, setKioskPinValue] = useState(kioskPin);
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    const result = await updateSettings({
      restaurant_name: restaurantName,
      operating_hours: { open: openTime, close: closeTime },
      order_number_prefix: orderPrefix,
    });
    setSavingBusiness(false);
    if (result.success) toast.success('Business settings saved');
    else toast.error(result.error);
  };

  const handleSaveTax = async () => {
    const taxDecimal = parseFloat(taxRate) / 100;
    const serviceDecimal = parseFloat(serviceCharge) / 100;
    const pwdDecimal = parseFloat(pwdScRate) / 100;
    if (isNaN(taxDecimal) || isNaN(serviceDecimal) || isNaN(pwdDecimal)) {
      toast.error('Enter valid numbers for all rates');
      return;
    }
    if (pwdDecimal < 0 || pwdDecimal > 1) {
      toast.error('PWD/SC discount must be between 0% and 100%');
      return;
    }
    setSavingTax(true);
    const result = await updateSettings({
      tax_rate: taxDecimal,
      service_charge: serviceDecimal,
      pwd_sc_discount_rate: pwdDecimal,
    });
    setSavingTax(false);
    if (result.success) toast.success('Tax & charges saved');
    else toast.error(result.error);
  };

  const handleSaveOrdering = async () => {
    const timeout = parseInt(orderTimeout);
    const grace = parseInt(graceperiod);
    const idle = parseInt(idleTimeout);
    const kds = parseInt(kdsAutoHide);
    if ([timeout, grace, idle, kds].some(isNaN)) {
      toast.error('All timer values must be whole numbers');
      return;
    }
    setSavingOrdering(true);
    const result = await updateSettings({
      unpaid_order_timeout_minutes: timeout,
      order_grace_period_minutes: grace,
      idle_timeout_seconds: idle,
      kds_auto_hide_seconds: kds,
    });
    setSavingOrdering(false);
    if (result.success) toast.success('Ordering settings saved');
    else toast.error(result.error);
  };

  const handleSaveBir = async () => {
    if (!birConfig?.id) {
      toast.error('No BIR config record found');
      return;
    }
    setSavingBir(true);
    const result = await updateBirConfig(birConfig.id, bir);
    setSavingBir(false);
    if (result.success) toast.success('BIR / receipt config saved');
    else toast.error(result.error);
  };

  const handleSaveKioskPin = async () => {
    if (!/^\d{4}$/.test(kioskPinValue)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    setIsSavingKioskPin(true);
    const result = await updateKioskPin(kioskPinValue);
    setIsSavingKioskPin(false);
    if (result.success) toast.success('Kiosk PIN updated');
    else toast.error(result.error);
  };

  return (
    <Tabs defaultValue="business">
      <TabsList className="mb-6 bg-white border">
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="tax">Tax & Charges</TabsTrigger>
        <TabsTrigger value="ordering">Ordering & Timers</TabsTrigger>
        <TabsTrigger value="bir">BIR / Receipts</TabsTrigger>
        <TabsTrigger value="kiosk">Kiosk</TabsTrigger>
      </TabsList>

      {/* Business */}
      <TabsContent value="business">
        <SettingsSection
          title="Business Information"
          description="Restaurant name, operating hours, and order numbering."
          onSave={handleSaveBusiness}
          isSaving={savingBusiness}
        >
          <FormRow label="Restaurant Name">
            <Input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} maxLength={100} />
          </FormRow>
          <FormRow label="Opening Time" hint="Kiosk display hours">
            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-40" />
          </FormRow>
          <FormRow label="Closing Time">
            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-40" />
          </FormRow>
          <FormRow label="Order Number Prefix" hint="Prepended to order numbers (e.g. A → A-0001)">
            <Input
              value={orderPrefix}
              onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-24 uppercase"
            />
          </FormRow>
        </SettingsSection>
      </TabsContent>

      {/* Tax & Charges */}
      <TabsContent value="tax">
        <SettingsSection
          title="Tax & Service Charge"
          description="Rates applied to all orders. Enter as percentages (e.g. 12 for 12%)."
          onSave={handleSaveTax}
          isSaving={savingTax}
        >
          <FormRow label="VAT Rate (%)" hint="Applied to taxable amount after discount">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-32"
              />
              <span className="text-slate-500 text-sm">%</span>
            </div>
          </FormRow>
          <FormRow label="Service Charge (%)" hint="Applied to taxable amount after discount">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="w-32"
              />
              <span className="text-slate-500 text-sm">%</span>
            </div>
          </FormRow>
          <FormRow label="PWD / Senior Citizen Discount (%)" hint="Pre-tax discount per RA 9994/10754 (default 20%)">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={pwdScRate}
                onChange={(e) => setPwdScRate(e.target.value)}
                className="w-32"
              />
              <span className="text-slate-500 text-sm">%</span>
            </div>
          </FormRow>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <strong>Note:</strong> Changing these rates affects all new orders. Existing orders are not recalculated.
          </div>
        </SettingsSection>
      </TabsContent>

      {/* Ordering & Timers */}
      <TabsContent value="ordering">
        <SettingsSection
          title="Ordering & Timers"
          description="Timeouts and display durations across kiosk and kitchen."
          onSave={handleSaveOrdering}
          isSaving={savingOrdering}
        >
          <FormRow label="Order Timeout (min)" hint="Pay-at-counter orders auto-cancel after this">
            <Input
              type="number"
              min="1"
              max="60"
              value={orderTimeout}
              onChange={(e) => setOrderTimeout(e.target.value)}
              className="w-28"
            />
          </FormRow>
          <FormRow label="Grace Period (min)" hint="Extra time before cancellation triggers">
            <Input
              type="number"
              min="0"
              max="30"
              value={graceperiod}
              onChange={(e) => setGracePeriod(e.target.value)}
              className="w-28"
            />
          </FormRow>
          <FormRow label="Kiosk Idle Timeout (sec)" hint="Kiosk resets to welcome screen after inactivity">
            <Input
              type="number"
              min="30"
              max="600"
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(e.target.value)}
              className="w-28"
            />
          </FormRow>
          <FormRow label="KDS Auto-hide (sec)" hint="Kitchen: completed orders hide after this delay">
            <Input
              type="number"
              min="5"
              max="300"
              value={kdsAutoHide}
              onChange={(e) => setKdsAutoHide(e.target.value)}
              className="w-28"
            />
          </FormRow>
        </SettingsSection>
      </TabsContent>

      {/* BIR Config */}
      <TabsContent value="bir">
        <SettingsSection
          title="BIR / Receipt Configuration"
          description="Philippine BIR compliance details printed on official receipts."
          onSave={handleSaveBir}
          isSaving={savingBir}
        >
          <FormRow label="TIN" hint="Tax Identification Number">
            <Input
              value={bir.tin}
              onChange={(e) => setBir((p) => ({ ...p, tin: e.target.value }))}
              placeholder="000-000-000-000"
              className="font-mono"
            />
          </FormRow>
          <FormRow label="Business Name">
            <Input
              value={bir.business_name}
              onChange={(e) => setBir((p) => ({ ...p, business_name: e.target.value }))}
              maxLength={100}
            />
          </FormRow>
          <FormRow label="Business Address">
            <Input
              value={bir.business_address}
              onChange={(e) => setBir((p) => ({ ...p, business_address: e.target.value }))}
              maxLength={200}
            />
          </FormRow>
          <FormRow label="Permit Number">
            <Input
              value={bir.permit_number}
              onChange={(e) => setBir((p) => ({ ...p, permit_number: e.target.value }))}
              className="font-mono"
            />
          </FormRow>
          <FormRow label="Permit Date Issued">
            <Input
              type="date"
              value={bir.permit_date_issued}
              onChange={(e) => setBir((p) => ({ ...p, permit_date_issued: e.target.value }))}
              className="w-44"
            />
          </FormRow>
          <FormRow label="Accreditation Number">
            <Input
              value={bir.accreditation_number}
              onChange={(e) => setBir((p) => ({ ...p, accreditation_number: e.target.value }))}
              className="font-mono"
            />
          </FormRow>
          <FormRow label="Accreditation Date">
            <Input
              type="date"
              value={bir.accreditation_date}
              onChange={(e) => setBir((p) => ({ ...p, accreditation_date: e.target.value }))}
              className="w-44"
            />
          </FormRow>
          <FormRow label="POS Machine ID">
            <Input
              value={bir.pos_machine_id}
              onChange={(e) => setBir((p) => ({ ...p, pos_machine_id: e.target.value }))}
              className="font-mono w-40"
            />
          </FormRow>
          <FormRow label="Terminal ID">
            <Input
              value={bir.terminal_id}
              onChange={(e) => setBir((p) => ({ ...p, terminal_id: e.target.value }))}
              className="font-mono w-40"
            />
          </FormRow>
        </SettingsSection>
      </TabsContent>

      {/* Kiosk */}
      <TabsContent value="kiosk">
        <SettingsSection
          title="Kiosk Device PIN"
          description="4-digit PIN required to access kiosk configuration"
          onSave={handleSaveKioskPin}
          isSaving={isSavingKioskPin}
        >
          <FormRow label="Kiosk PIN" hint="Must be exactly 4 digits">
            <Input
              type="text"
              value={kioskPinValue}
              onChange={(e) => setKioskPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="1234"
              className="w-28 font-mono tracking-widest"
            />
          </FormRow>
        </SettingsSection>
      </TabsContent>
    </Tabs>
  );
}
