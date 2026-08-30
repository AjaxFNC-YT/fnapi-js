import { describe, expect, it, vi } from 'vitest';
import { TypedEmitter } from '../../src/epic/emitter.js';

interface Events {
  error: Error;
  ping: number;
  pong: string;
}

class Bus extends TypedEmitter<Events> {
  send<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.emit(event, payload);
  }
}

describe('TypedEmitter', () => {
  it('delivers payloads to every listener for an event', () => {
    const bus = new Bus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a).on('ping', b);

    bus.send('ping', 7);

    expect(a).toHaveBeenCalledWith(7);
    expect(b).toHaveBeenCalledWith(7);
  });

  it('once fires a listener a single time', () => {
    const bus = new Bus();
    const listener = vi.fn();
    bus.once('ping', listener);

    bus.send('ping', 1);
    bus.send('ping', 2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('off removes a specific listener', () => {
    const bus = new Bus();
    const listener = vi.fn();
    bus.on('ping', listener);
    bus.off('ping', listener);

    bus.send('ping', 3);

    expect(listener).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears one event or every event', () => {
    const bus = new Bus();
    const ping = vi.fn();
    const pong = vi.fn();
    bus.on('ping', ping).on('pong', pong);

    bus.removeAllListeners('ping');
    bus.send('ping', 1);
    bus.send('pong', 'hi');
    expect(ping).not.toHaveBeenCalled();
    expect(pong).toHaveBeenCalledWith('hi');

    bus.removeAllListeners();
    bus.send('pong', 'again');
    expect(pong).toHaveBeenCalledTimes(1);
  });

  it('routes a throwing listener into the error event', () => {
    const bus = new Bus();
    const boom = new Error('boom');
    const onError = vi.fn();
    bus.on('error', onError);
    bus.on('ping', () => {
      throw boom;
    });

    bus.send('ping', 1);

    expect(onError).toHaveBeenCalledWith(boom);
  });

  it('does not recurse when an error listener itself throws', () => {
    const bus = new Bus();
    bus.on('error', () => {
      throw new Error('secondary');
    });

    expect(() => bus.send('error', new Error('primary'))).not.toThrow();
  });
});
