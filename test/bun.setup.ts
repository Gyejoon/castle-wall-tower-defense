import { afterEach } from 'bun:test';
import { vi as bunVi } from 'bun:test';

const globalsToRestore = new Map<string, PropertyDescriptor | undefined>();

function installGlobalStubHelpers(viLike: Record<string, unknown> | undefined): void {
  if (!viLike) return;

  if (typeof viLike.hoisted !== 'function') {
    viLike.hoisted = <T>(factory: () => T) => factory();
  }

  if (typeof viLike.stubGlobal !== 'function') {
    viLike.stubGlobal = (key: string, value: unknown) => {
      if (!globalsToRestore.has(key)) {
        globalsToRestore.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      }
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    };
  }

  if (typeof viLike.unstubAllGlobals !== 'function') {
    viLike.unstubAllGlobals = () => {
      for (const [key, descriptor] of globalsToRestore) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete (globalThis as Record<string, unknown>)[key];
        }
      }
      globalsToRestore.clear();
    };
  }
}

installGlobalStubHelpers(bunVi as unknown as Record<string, unknown>);

try {
  const { vi } = await import('vitest');
  installGlobalStubHelpers(vi as unknown as Record<string, unknown>);
} catch {
  // bun:test-only files do not need the vitest package shim.
}

const ensureGlobal = (key: string, value: unknown) => {
  if (!(key in globalThis)) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
};

if (!('document' in globalThis) || typeof globalThis.document?.createElement !== 'function') {
  const { JSDOM } = await import('../packages/web-shell/node_modules/jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });

  ensureGlobal('window', dom.window);
  ensureGlobal('document', dom.window.document);
  ensureGlobal('navigator', dom.window.navigator);
  ensureGlobal('Node', dom.window.Node);
  ensureGlobal('Element', dom.window.Element);
  ensureGlobal('HTMLElement', dom.window.HTMLElement);
  ensureGlobal('HTMLCanvasElement', dom.window.HTMLCanvasElement);
  ensureGlobal('HTMLImageElement', dom.window.HTMLImageElement);
  ensureGlobal('Event', dom.window.Event);
  ensureGlobal('CustomEvent', dom.window.CustomEvent);
}

ensureGlobal('self', globalThis.window ?? globalThis);
ensureGlobal('window', globalThis.window ?? globalThis);
ensureGlobal('document', globalThis.document);
ensureGlobal('navigator', globalThis.navigator ?? { userAgent: 'bun-test', maxTouchPoints: 0 });

const createMock2DContext = () => {
  let lastImageData = { data: new Uint8ClampedArray([255, 0, 0, 255]) };
  return {
    fillStyle: '#000000',
    globalCompositeOperation: 'source-over',
    drawImage: () => {},
    fillRect: () => {
      lastImageData = { data: new Uint8ClampedArray([10, 20, 30, 127]) };
    },
    getImageData: () => lastImageData,
    putImageData: (imageData: { data: Uint8ClampedArray }) => {
      lastImageData = imageData;
    },
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
  };
};

if (globalThis.HTMLCanvasElement?.prototype) {
  Object.defineProperty(globalThis.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: function getContext() {
      return createMock2DContext();
    },
  });
}

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

ensureGlobal('Image', globalThis.Image ?? MockImage);
ensureGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
});

try {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
  });
} catch {
  // Non-React suites do not need DOM cleanup.
}
