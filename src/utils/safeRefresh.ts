import { NotReadyError, refresh, Refreshable } from "solid-js";

export function safeRefresh<T>(fn: (() => T) | Refreshable<T>): T {
  let result: T;
  try {
    result = refresh(fn);
  } catch (e) {
    // solid 2.0beta10 refresh does not properly catch NotReadyError
    if (e instanceof NotReadyError) {
      return result!;
    }

    throw e;
  }

  return result;
}
