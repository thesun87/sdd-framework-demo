import { useSyncExternalStore } from "react";
import { cartStore, type CartSnapshot, type CartLine } from "./cartStore.js";

export interface UseCartResult {
  readonly lines: readonly CartLine[];
  readonly unavailable: boolean;
  readonly totalQuantity: number;
  readonly add: (productId: number, quantity?: number) => boolean;
  readonly setQuantity: (productId: number, quantity: number) => boolean;
  readonly remove: (productId: number) => void;
  readonly dropUnknown: (productIds: readonly number[]) => void;
}

export function useCart(): UseCartResult {
  const snapshot: CartSnapshot = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getSnapshot,
  );

  return {
    lines: snapshot.lines,
    unavailable: snapshot.unavailable,
    totalQuantity: snapshot.lines.reduce((sum, line) => sum + line.quantity, 0),
    add: cartStore.add,
    setQuantity: cartStore.setQuantity,
    remove: cartStore.remove,
    dropUnknown: cartStore.dropUnknown,
  };
}
