export function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
