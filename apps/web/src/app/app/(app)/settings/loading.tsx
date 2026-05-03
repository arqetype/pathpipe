import { RiLoader5Line } from '@remixicon/react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-4 space-y-8">
      <div className="flex flex-col items-center space-y-4">
        <RiLoader5Line className="h-10 w-10 animate-spin text-primary" />
      </div>
    </div>
  );
}
