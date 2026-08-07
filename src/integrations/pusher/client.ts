import Pusher from "pusher-js";

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || "mt1";

if (!PUSHER_KEY) {
  console.warn("VITE_PUSHER_KEY not set - realtime features will not work");
}

export const pusherClient = PUSHER_KEY
  ? new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    })
  : null;

export interface PusherChannel {
  bind(event: string, callback: (data: unknown) => void): void;
  unbind(event?: string, callback?: (data: unknown) => void): void;
  subscribe(): void;
  unsubscribe(): void;
}

export function getPusherChannelName(type: string, identifier: string): string {
  return `${type}-${identifier}`;
}

export function subscribeToChannel(
  channelName: string,
  event: string,
  callback: (data: unknown) => void
): () => void {
  if (!pusherClient) {
    console.warn("Pusher not configured");
    return () => {};
  }

  const channel = pusherClient.subscribe(channelName);
  channel.bind(event, callback);

  return () => {
    channel.unbind(event, callback);
    pusherClient.unsubscribe(channelName);
  };
}