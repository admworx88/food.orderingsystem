import { getAllSettings, getBirConfig, getKioskPin } from '@/services/settings-service';
import { SettingsClient } from '@/components/admin/settings-client';
import { PageHeader } from '@/components/admin/page-header';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settingsResult, birResult, kioskPinResult] = await Promise.all([
    getAllSettings(),
    getBirConfig(),
    getKioskPin(),
  ]);

  if (!settingsResult.success) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Configure restaurant operations and compliance"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Failed to load settings</h2>
          <p className="text-slate-500">{settingsResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure restaurant operations and compliance"
      />
      <SettingsClient
        settings={settingsResult.data}
        birConfig={birResult.success ? birResult.data : null}
        kioskPin={kioskPinResult.success ? kioskPinResult.data : '1234'}
      />
    </div>
  );
}
