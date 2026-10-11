import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

export interface AsyncActionSuccess<T> {
  ok: true;
  value: T;
}

export interface AsyncActionFailure {
  ok: false;
  error: ApiError;
}

export type AsyncActionResult<T> = AsyncActionSuccess<T> | AsyncActionFailure;

export interface AsyncAction<Args extends unknown[], T> {
  /**
   * Runs the action and never throws. Returns a result object instead, so a screen's error path
   * is reachable without wrapping every call site in try/catch.
   */
  run: (...args: Args) => Promise<AsyncActionResult<T>>;
  /**
   * Cleared in a `finally` and nowhere else, so a rejection can never leave a spinner running.
   */
  isLoading: boolean;
  /** `ApiError.message`, or a generic fallback. Never a stack trace or a raw body. */
  error: string | null;
  /** Clears the error, for a retry button. */
  reset: () => void;
}

/**
 * Runs an async action with a loading flag that cannot get stuck and an error message that is
 * always safe to show a user.
 */
export function useAsyncAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<T>,
): AsyncAction<Args, T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `action` is usually an inline arrow that changes identity on every render. Reading it through
  // a ref keeps `run` stable while still calling the latest closure.
  const actionRef = useRef(action);
  const mountedRef = useRef(true);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args): Promise<AsyncActionResult<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      return { ok: true, value: await actionRef.current(...args) };
    } catch (caught) {
      const apiError =
        caught instanceof ApiError
          ? caught
          : new ApiError(GENERIC_ERROR_MESSAGE, {
              status: 0,
              code: "unexpected_response",
              cause: caught,
            });

      // A run can land after the screen has gone away; setting state then is a no-op warning in
      // React 19 and a leak of the rejection's context.
      if (mountedRef.current) {
        setError(apiError.message);
      }

      return { ok: false, error: apiError };
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { run, isLoading, error, reset };
}
