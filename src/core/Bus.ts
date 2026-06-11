import type { Note } from '../engine/Note';

export interface BusEvents {
  'ui:load': { file: File };
  'ui:stop': void;
  'ui:pause': void;
  'ui:resume': void;
  'ui:toggle-bg': void;
  'game:hit': { note: Note; quality: 'perfect' | 'good' };
  'game:score': { score: number; combo: number };
  'game:judgement': { text: string; color: string };
  'game:miss': void;
  'input:key': { sectorIndex: number };
}

type Handler<T> = T extends void ? () => void : (data: T) => void;

type HandlersMap = {
  [K in keyof BusEvents]?: Handler<BusEvents[K]>[];
};

class Bus {
  private _h: HandlersMap = {};

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    const handlers = this._h[event] as Handler<BusEvents[K]>[] | undefined;
    if (handlers) {
      handlers.push(fn);
    } else {
      (this._h[event] as Handler<BusEvents[K]>[]) = [fn];
    }
    return () => this.off(event, fn);
  }

  off<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): void {
    const a = this._h[event] as Handler<BusEvents[K]>[] | undefined;
    if (a) {
      (this._h[event] as Handler<BusEvents[K]>[]) = a.filter(f => f !== fn);
    }
  }

  emit<K extends keyof BusEvents>(
    ...args: BusEvents[K] extends void ? [event: K] : [event: K, data: BusEvents[K]]
  ): void {
    const [event, data] = args as [K, BusEvents[K]];
    const handlers = this._h[event] as Handler<BusEvents[K]>[] | undefined;
    if (handlers) {
      for (const f of handlers) {
        (f as (data?: BusEvents[K]) => void)(data);
      }
    }
  }
}

export const bus = new Bus();
export type { Bus };
