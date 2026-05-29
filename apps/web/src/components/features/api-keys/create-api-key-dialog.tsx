'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { RiLoader5Line, RiAddLine, RiKeyLine } from '@remixicon/react';
import { toast } from 'sonner';
import { createApiKeyAction } from '@/actions/api-key/create';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  function handleClose() {
    setName('');
    setNewKey(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await createApiKeyAction(name.trim());

      if (!result.success) {
        toast.error(result.error || 'Failed to create API key');
        return;
      }

      if (result.data) {
        setNewKey(result.data.key);
        toast.success('API key created successfully');
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiKeyLine className="size-5" />
            Create API Key
          </DialogTitle>
        </DialogHeader>

        {!newKey ? (
          <form onSubmit={handleSubmit}>
            <div className="py-4">
              <Input
                placeholder="Enter a name for this key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-2">
                Give your API key a descriptive name to identify its purpose.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? (
                  <>
                    <RiLoader5Line className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <RiAddLine />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Your new API key</p>
                <code className="block text-sm bg-background p-2 rounded border font-mono break-all">
                  {newKey}
                </code>
              </div>
              <p className="text-sm text-destructive">
                Make sure to copy your API key now. You won&apos;t be able to
                see it again!
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  toast.success('Copied to clipboard');
                }}
              >
                Copy to clipboard
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
