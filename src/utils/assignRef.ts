import { Ref } from "solid-js";

export function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (ref) {
    if (typeof ref === "function") {
      (ref as (val: T) => void)(value);
    } else {
      ref = value;
    }
  }
}
