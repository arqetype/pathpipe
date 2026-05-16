import { RiKeyLine } from '@remixicon/react';
import { ApiKeysList } from '@/components/features/api-keys/api-keys-list';
import { CreateApiKeyButton } from '@/components/features/api-keys/create-api-key-button';
import { fetchApiKeysAction } from '@/actions/api-key/fetch';

export default async function APIKeysPage() {
  const apiKeys = (await fetchApiKeysAction()).data || [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <RiKeyLine className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">API Keys</h1>
            <p className="text-sm text-muted-foreground">
              Manage your API keys for external access
            </p>
          </div>
        </div>
        <CreateApiKeyButton />
      </div>

      <ApiKeysList apiKeys={apiKeys} />
    </div>
  );
}
