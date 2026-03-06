export async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    ),
  ]);
}

export function timeout(ms = 8000) {
  let id: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = new Promise<never>((_, reject) => {
    id = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, ms);
  });
  return { signal, timer, clear: () => id && clearTimeout(id) };
}

export function isTimeoutError(err: unknown): boolean {
  const anyErr = err as { name?: string; message?: string } | null;
  const name = anyErr?.name || '';
  const message = anyErr?.message || '';
  return name === 'AbortError' || /timeout/i.test(message);
}
