import { getAllSettings, getBirConfig, getKioskPin } from '@/services/settings-service';
import { SettingsClient } from '@/components/admin/settings-client';
import { AlertCircle, Settings } from 'lucide-react';

export default async function SettingsPage() {
  const [settingsResult, birResult, kioskPinResult] = await Promise.all([
    getAllSettings(),
    getBirConfig(),
    getKioskPin(),
  ]);

  if (!settingsResult.success) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-600 mt-1">Restaurant configuration</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load settings</h2>
          <p className="text-gray-500">{settingsResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-600 mt-0.5">Configure restaurant operations and compliance</p>
        </div>
      </div>

      <SettingsClient
        settings={settingsResult.data}
        birConfig={birResult.success ? birResult.data : null}
        kioskPin={kioskPinResult.success ? kioskPinResult.data : '1234'}
      />
    </div>
  );
}
