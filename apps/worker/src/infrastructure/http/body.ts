const MAX_BODY_BYTES = 48 * 1024 * 1024;

// Discarded whole, never truncated.
export const readCapped = async (
  response: Response,
  log: (data: Record<string, unknown>, msg: string) => void,
): Promise<string> => {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    log(
      { url: response.url, bytes: declared, cap: MAX_BODY_BYTES },
      'Response exceeds size cap, discarded',
    );
    return '';
  }
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      log(
        { url: response.url, cap: MAX_BODY_BYTES },
        'Response exceeds size cap, discarded',
      );
      return '';
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
};
