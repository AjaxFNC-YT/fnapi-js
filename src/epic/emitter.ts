export type Listener<T> = (payload: T) => void;

export class TypedEmitter<M extends { error: Error }> {
  private readonly listeners = new Map<keyof M, Set<Listener<unknown>>>();

  on<K extends keyof M>(event: K, listener: Listener<M[K]>): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return this;
  }

  once<K extends keyof M>(event: K, listener: Listener<M[K]>): this {
    const wrapper: Listener<M[K]> = (payload) => {
      this.off(event, wrapper);
      listener(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof M>(event: K, listener: Listener<M[K]>): this {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
    return this;
  }

  removeAllListeners(event?: keyof M): this {
    if (event === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  protected emit<K extends keyof M>(event: K, payload: M[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        (listener as Listener<M[K]>)(payload);
      } catch (error) {
        if (event !== ('error' as K)) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          this.emit('error' as K, normalized as M[K]);
        }
      }
    }
  }
}
