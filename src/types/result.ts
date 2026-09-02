/**
 * Represents the outcome of an operation following the Go/Rust-style discriminated union pattern.
 *
 * It guarantees that callers always receive an object containing either `data` or `error`,
 * preventing unhandled promise rejections and enforcing explicit error handling.
 *
 * @typeParam T - The type of data returned upon success.
 * @typeParam E - The type of error returned upon failure (defaults to `Error`).
 *
 * @example
 * ```typescript
 * const result: Result<User> = await api.send(getUserCommand);
 * if (result.error) {
 *   console.error('Failed:', result.error.message);
 *   return;
 * }
 * console.log('User:', result.data.name);
 * ```
 */
export type Result<T, E = Error> = { data: T; error: null } | { data: null; error: E };

/**
 * Creates a successful {@link Result} wrapping the provided data.
 *
 * @typeParam T - Type of the payload.
 * @param data - The successful value to wrap.
 * @returns A {@link Result} with `error` set to `null` and `data` populated.
 *
 * @example
 * ```typescript
 * const res = ok({ id: 1, name: 'Alice' });
 * assert(res.error === null);
 * ```
 */
export const ok = <T>(data: T): Result<T, never> => ({
  data,
  error: null,
});

/**
 * Creates a failed {@link Result} wrapping the provided error.
 *
 * @typeParam E - Type of the error (defaults to `Error`).
 * @param error - The error instance or reason for failure.
 * @returns A {@link Result} with `data` set to `null` and `error` populated.
 *
 * @example
 * ```typescript
 * const res = err(new Error('Resource not found'));
 * assert(res.data === null);
 * ```
 */
export const err = <E = Error>(error: E): Result<never, E> => ({
  data: null,
  error,
});

/**
 * Type guard to verify whether a {@link Result} is successful.
 *
 * Narrowing with this function allows TypeScript to know that `result.data` is defined and non-null.
 *
 * @typeParam T - Success payload type.
 * @typeParam E - Error type.
 * @param result - The {@link Result} to inspect.
 * @returns `true` if `error` is `null`, otherwise `false`.
 */
export const isOk = <T, E>(result: Result<T, E>): result is { data: T; error: null } =>
  result.error === null;

/**
 * Type guard to verify whether a {@link Result} has failed.
 *
 * Narrowing with this function allows TypeScript to know that `result.error` is defined and non-null.
 *
 * @typeParam T - Success payload type.
 * @typeParam E - Error type.
 * @param result - The {@link Result} to inspect.
 * @returns `true` if `error` is not `null`, otherwise `false`.
 */
export const isErr = <T, E>(result: Result<T, E>): result is { data: null; error: E } =>
  result.error !== null;
