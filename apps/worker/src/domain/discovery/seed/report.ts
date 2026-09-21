import { writeFileSync } from 'node:fs';
import type { ConfirmedBoard } from './types';

export const reportConfirmed = (
  confirmed: ConfirmedBoard[],
  log: (msg: string) => void,
  out: string | undefined,
): void => {
  const byPlatform = new Map<string, number>();
  for (const hit of confirmed) {
    byPlatform.set(hit.platform, (byPlatform.get(hit.platform) ?? 0) + 1);
  }

  log(`\n${confirmed.length} confirmed boards:`);
  for (const hit of confirmed.slice(0, 60)) {
    log(
      `  ${hit.platform.padEnd(16)} ${hit.token.padEnd(28)} ${String(hit.jobCount).padStart(5)} offers`,
    );
  }
  if (confirmed.length > 60) log(`  … and ${confirmed.length - 60} more`);
  log(
    `\nBy platform: ${[...byPlatform.entries()]
      .map(([platform, count]) => `${platform} ${count}`)
      .join(', ')}`,
  );
  log(
    `Total open roles behind them: ${confirmed.reduce((sum, hit) => sum + hit.jobCount, 0)}`,
  );

  if (out && confirmed.length) {
    // Round-trips through --file.
    writeFileSync(
      out,
      `${[
        '# Board names confirmed against the vendor API.',
        '# Regenerate or extend with:',
        `#   pnpm --filter worker seed:boards -- --file ${out}`,
        '',
        ...confirmed.map((hit) =>
          hit.careersUrl.includes('myworkdayjobs.com')
            ? hit.careersUrl
            : hit.token,
        ),
      ].join('\n')}\n`,
      'utf8',
    );
    log(`\nWrote ${confirmed.length} board names to ${out}`);
  }
};
