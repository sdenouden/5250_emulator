export type Ok<T> = {
  ok: true;
  value: T;
};

export type Err = {
  ok: false;
  message: string;
  cause: Error | undefined;
};

export type Result<T> = Ok<T> | Err;

export function ok(): Ok<null>
export function ok<T>(value: T): Ok<T>
export function ok(value?: any): any {
  if (value === undefined) {
    return {
      ok: true,
      value: null
    }
  }
  return {
    ok: true,
    value: value
  }
}

export function err(message: string): Err
export function err(message: string, error: Error): Err
export function err(message: string, error: unknown): Err
export function err(message?: string, error?: unknown): Err {
  let finalMessage = "unknown error"
  let finalCause: Error | undefined = undefined

  if (message) {
    finalMessage = message
  } else if (error instanceof Error) {
    finalMessage = error.message
  }

  if (error instanceof Error) {
    finalCause = error
  } else if (error) {
    finalCause = new Error("unknown error", { cause: error })
  }

  return {
    ok: false,
    message: finalMessage,
    cause: finalCause
  }
}
