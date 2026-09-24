import { storefront } from "shared";

export type CartLine = storefront.CartLine;
export type StoredCart = storefront.StoredCart;

export interface CartSnapshot {
  readonly unavailable: boolean;
  readonly lines: readonly CartLine[];
}

const STORAGE_KEY = "shop_cart";

function readFromStorage(): CartSnapshot {
  try {
    if (typeof localStorage === "undefined") {
      return { unavailable: false, lines: [] };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { unavailable: false, lines: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { unavailable: false, lines: [] };
    }

    if (typeof parsed !== "object" || parsed === null) {
      return { unavailable: false, lines: [] };
    }

    const obj = parsed as Record<string, unknown>;
    if (obj.v !== 1 || !Array.isArray(obj.lines)) {
      return { unavailable: false, lines: [] };
    }

    // Read-repair:
    // - Bỏ qua dòng có productId hoặc quantity không hợp lệ
    // - Dòng trùng productId thì gộp và kẹp ở 9999
    const linesMap = new Map<number, number>();
    for (const item of obj.lines) {
      if (typeof item !== "object" || item === null) continue;
      const line = item as Record<string, unknown>;
      const pid = line.productId;
      const qty = line.quantity;
      if (
        typeof pid !== "number" ||
        !Number.isInteger(pid) ||
        pid <= 0 ||
        typeof qty !== "number" ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > 9999
      ) {
        continue;
      }
      const existing = linesMap.get(pid) ?? 0;
      linesMap.set(pid, Math.min(9999, existing + qty));
    }

    const validLines: CartLine[] = [];
    for (const [productId, quantity] of linesMap.entries()) {
      validLines.push({ productId, quantity });
    }

    return { unavailable: false, lines: validLines };
  } catch {
    return { unavailable: true, lines: [] };
  }
}

function writeToStorage(lines: readonly CartLine[]): boolean {
  try {
    const payload: StoredCart = storefront.StoredCartSchema.parse({
      v: 1,
      lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

class CartStore {
  private snapshot: CartSnapshot = readFromStorage();
  private listeners = new Set<() => void>();
  private storageListenerAttached = false;

  constructor() {
    this.ensureStorageListener();
  }

  private ensureStorageListener() {
    if (this.storageListenerAttached || typeof window === "undefined") {
      return;
    }
    window.addEventListener("storage", this.handleStorageEvent);
    this.storageListenerAttached = true;
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      this.refresh();
    }
  };

  private notify() {
    this.snapshot = readFromStorage();
    for (const listener of this.listeners) {
      listener();
    }
  }

  public refresh = (): void => {
    this.notify();
  };

  public _reset = (): void => {
    this.notify();
  };

  public getSnapshot = (): CartSnapshot => {
    return this.snapshot;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.ensureStorageListener();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public totalQuantity = (): number => {
    const { lines } = this.getSnapshot();
    return lines.reduce((sum, line) => sum + line.quantity, 0);
  };

  public add = (productId: number, quantity = 1): void => {
    if (!Number.isInteger(productId) || productId <= 0) return;
    if (!Number.isInteger(quantity) || quantity <= 0) return;

    const current = readFromStorage();
    if (current.unavailable) return;

    const updated = [...current.lines];
    const existingIndex = updated.findIndex((l) => l.productId === productId);
    if (existingIndex >= 0) {
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        productId,
        quantity: Math.min(9999, existing.quantity + quantity),
      };
    } else {
      updated.push({
        productId,
        quantity: Math.min(9999, quantity),
      });
    }

    if (writeToStorage(updated)) {
      this.notify();
    } else {
      this.snapshot = { unavailable: true, lines: [] };
      for (const listener of this.listeners) listener();
    }
  };

  public setQuantity = (productId: number, q: number): boolean => {
    if (!Number.isInteger(productId) || productId <= 0) return false;
    if (!Number.isInteger(q) || q < 0 || q > 9999) return false;

    if (q === 0) {
      this.remove(productId);
      return true;
    }

    const current = readFromStorage();
    if (current.unavailable) return false;

    const updated = [...current.lines];
    const existingIndex = updated.findIndex((l) => l.productId === productId);
    if (existingIndex >= 0) {
      updated[existingIndex] = { productId, quantity: q };
    } else {
      updated.push({ productId, quantity: q });
    }

    if (writeToStorage(updated)) {
      this.notify();
      return true;
    } else {
      this.snapshot = { unavailable: true, lines: [] };
      for (const listener of this.listeners) listener();
      return false;
    }
  };

  public remove = (productId: number): void => {
    const current = readFromStorage();
    if (current.unavailable) return;

    const updated = current.lines.filter((l) => l.productId !== productId);
    if (updated.length === current.lines.length) return;

    if (writeToStorage(updated)) {
      this.notify();
    } else {
      this.snapshot = { unavailable: true, lines: [] };
      for (const listener of this.listeners) listener();
    }
  };

  public dropUnknown = (productIds: readonly number[]): void => {
    if (productIds.length === 0) return;
    const current = readFromStorage();
    if (current.unavailable) return;

    const toDrop = new Set(productIds);
    const updated = current.lines.filter((l) => !toDrop.has(l.productId));
    if (updated.length === current.lines.length) return;

    if (writeToStorage(updated)) {
      this.notify();
    } else {
      this.snapshot = { unavailable: true, lines: [] };
      for (const listener of this.listeners) listener();
    }
  };
}

export const cartStore = new CartStore();
