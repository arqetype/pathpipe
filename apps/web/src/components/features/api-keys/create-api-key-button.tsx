'use client';

import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { RiAddLine } from '@remixicon/react';
import { CreateApiKeyDialog } from './create-api-key-dialog';

export function CreateApiKeyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <RiAddLine />
        Create API Key
      </Button>
      <CreateApiKeyDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
