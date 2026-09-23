// Node.js test environment polyfills for localStorage and browser events
const storage = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, String(val)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => Array.from(storage.keys())[index] || null,
};

(globalThis as any).window = {
  dispatchEvent: (_event: any) => true,
  addEventListener: (_type: string, _listener: any) => {},
  removeEventListener: (_type: string, _listener: any) => {},
  AudioContext: class {
    createOscillator() {
      return {
        connect() {},
        start() {},
        stop() {},
        frequency: { setValueAtTime() {} },
        type: 'sine',
      };
    }
    createGain() {
      return {
        connect() {},
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      };
    }
    destination = {};
    currentTime = 0;
  },
};

(globalThis as any).Event = class Event {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

export {};
