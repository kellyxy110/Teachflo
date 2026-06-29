type EventPayload = Record<string, unknown>;
type Handler = (payload: EventPayload) => void | Promise<void>;

const registry = new Map<string, Handler[]>();

export function on(event: string, handler: Handler): void {
  const list = registry.get(event) ?? [];
  list.push(handler);
  registry.set(event, list);
}

export function emit(event: string, payload: EventPayload = {}): void {
  // Fire-and-forget: schedule on next microtask, never throws to caller
  void Promise.resolve().then(() => {
    for (const handler of registry.get(event) ?? []) {
      void Promise.resolve(handler({ event, ts: Date.now(), ...payload })).catch((err) => {
        console.error(`[events] handler error for "${event}":`, err);
      });
    }
  });
}
