'use client';

import React from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import { RiRefreshLine } from '@remixicon/react';
import { triggerDiscoveryAction } from '@/actions/discover/trigger';

export function TriggerDiscovery() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ status: string; time: string } | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await triggerDiscoveryAction();
      setResult({ status: data.status, time: new Date().toLocaleTimeString() });
    } catch {
      setResult({ status: 'error', time: new Date().toLocaleTimeString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Trigger Job Discovery</CardTitle>
        <CardDescription>
          The ATS worker will scrape careers pages of all watched companies and check for new job postings.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button onClick={handleTrigger} disabled={loading} className="w-fit">
          <RiRefreshLine className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Triggering...' : 'Run Discovery Now'}
        </Button>
        {result && (
          <p className={`text-sm ${result.status === 'triggered' ? 'text-green-600' : 'text-red-600'}`}>
            {result.status === 'triggered'
              ? `Discovery triggered successfully at ${result.time}`
              : `Failed to trigger discovery at ${result.time}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}