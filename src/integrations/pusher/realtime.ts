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

export interface RealtimeChannel {
  on(event: string, config: { event: string; schema: string; table: string; filter?: string }, callback: (payload: unknown) => void): RealtimeChannel;
subscribe(): RealtimeChannel;
  unsubscribe(): void;
}

export interface RealtimeClient {
  channel(name: string): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): void;
}

function createRealtimeChannel(channelName: string): RealtimeChannel {
  if (!pusherClient) {
    return {
      on: () => ({ subscribe: () => {}, unsubscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    };
  }

  const channel = pusherClient.subscribe(channelName);
  const callbacks = new Map<string, (data: unknown) => void>();

  return {
    on(event: string, config: { event: string; schema: string; table: string; filter?: string }, callback: (payload: unknown) => void) {
      const pusherEvent = `${config.table}:${config.event}`;
      channel.bind(pusherEvent, callback);
      callbacks.set(pusherEvent, callback);
      return this;
    },
    subscribe() {
      return this;
    },
    unsubscribe() {
      for (const [event, callback] of callbacks) {
        channel.unbind(event, callback);
      }
      callbacks.clear();
      pusherClient.unsubscribe(channelName);
    },
  };
}

export const realtime = {
  channel(name: string) {
    return createRealtimeChannel(name);
  },
  removeChannel(channel: RealtimeChannel) {
    channel.unsubscribe();
  },
};

export function getChannelName(type: string, identifier: string): string {
  return `${type}-${identifier}`;
}