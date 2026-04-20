export type Result<T, E = Error> = 
  | { isSuccess: true; getValue: () => T; getError: () => undefined }
  | { isSuccess: false; getValue: () => undefined; getError: () => E };

export class ResultFactory {
  public static ok<T>(value: T): Result<T, never> {
    return {
      isSuccess: true,
      getValue: () => value,
      getError: () => undefined,
    };
  }

  public static fail<E extends Error = Error>(error: E | string): Result<never, E | Error> {
    const err = typeof error === 'string' ? new Error(error) : error;
    return {
      isSuccess: false,
      getValue: () => undefined,
      getError: () => err,
    };
  }
}
