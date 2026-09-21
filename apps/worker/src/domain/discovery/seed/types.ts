import type { BoardHit, VendorProbe } from '../vendors';

export type ConfirmedBoard = BoardHit & { label: string };

export interface SeedBoardsOptions {
  file?: string;
  yc?: boolean;
  feeds?: boolean;
  companies?: boolean;
  vendors?: VendorProbe[];
  limit?: number;
  concurrency?: number;
  out?: string;
  dryRun?: boolean;
  log?: (msg: string) => void;
}
