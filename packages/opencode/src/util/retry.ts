/**
 * Retry utility with exponential backoff.
 */
export namespace Retry {
  export interface Options {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: any) => boolean
  }

  /**
   * Execute a function with exponential backoff retry logic.
   */
  export async function withRetry<T>(fn: () => Promise<T>, options: Options = {}): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3
    const baseDelayMs = options.baseDelayMs ?? 500
    const maxDelayMs = options.maxDelayMs ?? 10000
    const shouldRetry = options.shouldRetry ?? (() => true)

    let attempt = 0
    let lastError: any

    while (attempt < maxAttempts) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        if (!shouldRetry(error)) {
          throw error
        }

        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
        await sleep(delay)
        attempt++
      }
    }

    throw lastError
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Retry decorator for class methods.
   */
  export function retryable(options: Options = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value
      descriptor.value = function (...args: any[]) {
        return withRetry(() => originalMethod.apply(this, args), options)
      }
      return descriptor
    }
  }
}
