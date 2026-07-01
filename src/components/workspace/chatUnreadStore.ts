type Listener = () => void;

const unreadCounts = new Map<string, number>();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getUnreadCount(traderId: string): number {
  return unreadCounts.get(traderId) ?? 0;
}

export function incrementUnread(traderId: string) {
  unreadCounts.set(traderId, (unreadCounts.get(traderId) ?? 0) + 1);
  notify();
}

export function clearUnread(traderId: string) {
  unreadCounts.set(traderId, 0);
  notify();
}

export function setUnread(traderId: string, count: number) {
  unreadCounts.set(traderId, count);
  notify();
}

export function getTotalUnread(): number {
  let total = 0;
  unreadCounts.forEach((c) => (total += c));
  return total;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
