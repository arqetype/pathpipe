'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ApiKey, ApiKey as ApiKeyType } from '@repo/db/entities/api-key';
import { Button } from '@repo/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Badge } from '@repo/ui/components/badge';
import {
  RiDeleteBinLine,
  RiLoader5Line,
  RiKeyLine,
  RiTimeLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import { revokeApiKeyAction } from '@/actions/api-key/revoke';

interface ApiKeysListProps {
  apiKeys: ApiKey[];
}

export function ApiKeysList({ apiKeys }: ApiKeysListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [revokeKey, setRevokeKey] = useState<ApiKeyType | null>(null);

  function handleRevoke() {
    if (!revokeKey) return;

    startTransition(async () => {
      const result = await revokeApiKeyAction({ id: revokeKey.id });

      if (!result.success) {
        toast.error(result.message || 'Failed to revoke API key');
        return;
      }

      toast.success('API key revoked');
      router.refresh();
      setRevokeKey(null);
    });
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (apiKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <RiKeyLine className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No API keys yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first API key to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className="font-medium truncate max-w-30">
                {apiKey.name}
              </TableCell>
              <TableCell className="font-mono max-w-14">{apiKey.key}</TableCell>
              <TableCell className="max-w-10">
                <Badge
                  variant={apiKey.isActive ? 'default' : 'secondary'}
                  className={apiKey.isActive ? '' : 'text-muted-foreground'}
                >
                  {apiKey.isActive ? 'Active' : 'Revoked'}
                </Badge>
              </TableCell>
              <TableCell className="max-w-10">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <RiTimeLine className="size-4" />
                  {formatDate(apiKey.createdAt)}
                </div>
              </TableCell>
              <TableCell className="max-w-20 truncate">
                {apiKey.user?.name || 'Unknown'}
              </TableCell>
              <TableCell className="text-right">
                {apiKey.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRevokeKey(apiKey)}
                    disabled={isPending}
                  >
                    <RiDeleteBinLine />
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!revokeKey}
        onOpenChange={(open) => !open && setRevokeKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke &quot;{revokeKey?.name}&quot;?
              This action cannot be undone and any applications using this key
              will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} variant="destructive">
              {isPending ? <RiLoader5Line className=" animate-spin" /> : null}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
