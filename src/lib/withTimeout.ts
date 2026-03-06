export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const guardedPromise = promise
    .then((value) => ({ kind: 'value' as const, value }))
    .catch((error) => ({ kind: 'error' as const, error }));

  const timeoutPromise = new Promise<{ kind: 'timeout' }>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] ${label} exceeded ${timeoutMs}ms; using fallback value`);
      resolve({ kind: 'timeout' });
    }, timeoutMs);
  });

  const result = await Promise.race([guardedPromise, timeoutPromise]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (result.kind === 'error') {
    throw result.error;
  }

  if (result.kind === 'timeout') {
    return fallbackValue;
  }

  return result.value;
}
