export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 4,
): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const retryable = err.status === 503 || err.status === 429
      if (!retryable || i === tries - 1) throw err
      const delay = 2 ** i * 1500 + Math.random() * 500
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error("unreachable")
}
