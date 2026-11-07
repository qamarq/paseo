export interface TrailingThrottle<T> {
  call(value: T): void;
  flush(): void;
  cancel(): void;
}

/** Runs at most once per interval while calls keep coming, always ending on the latest value. */
export function createTrailingThrottle<T>(
  run: (value: T) => void,
  intervalMs: number,
): TrailingThrottle<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;

  function fire(): void {
    timer = null;
    if (pending === null) return;
    const { value } = pending;
    pending = null;
    run(value);
    timer = setTimeout(fire, intervalMs);
  }

  return {
    call(value) {
      pending = { value };
      if (timer === null) fire();
    },
    flush() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (pending === null) return;
      const { value } = pending;
      pending = null;
      run(value);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
