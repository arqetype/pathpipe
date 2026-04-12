import ThemeSwitcher from '@/components/theme-switcher';
import { Label } from '@repo/ui/components/label';

export default function AccountSettingsPage() {
  return (
    <>
      <h1 className="scroll-m-20 text-left text-4xl font-extrabold tracking-tight text-balance mb-4">
        Account Settings
      </h1>

      <div className="flex flex-row gap-3 items-center justify-between">
        <div className="space-y-1">
          <Label>Appearance</Label>
          <p className="text-sm text-muted-foreground">
            Choose how Weaver looks on your device.
          </p>
        </div>
        <ThemeSwitcher />
      </div>
    </>
  );
}
