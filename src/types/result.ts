export type Result<T, E = Error> = { data: T; error: null } | { data: null; error: E };

export const ok = <T>(data: T): Result<T, never> => ({
  data,
  error: null,
});

export const err = <E = Error>(error: E): Result<never, E> => ({
  data: null,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is { data: T; error: null } =>
  result.error === null;

export const isErr = <T, E>(result: Result<T, E>): result is { data: null; error: E } =>
  result.error !== null;
