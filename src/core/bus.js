class Bus {
  constructor() {
    this._h = {};
  }

  on(event, fn) {
    (this._h[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const a = this._h[event];
    if (a) this._h[event] = a.filter(f => f !== fn);
  }

  emit(event, data) {
    (this._h[event] || []).forEach(f => f(data));
  }
}

export const bus = new Bus();
