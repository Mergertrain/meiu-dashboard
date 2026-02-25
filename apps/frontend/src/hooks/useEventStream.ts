import { useEffect } from "react";

interface DomainEvent {
  eventType: string;
  entityType: string;
  createdAt: string;
}

export function useEventStream(url: string | null, onEvent: (event: DomainEvent) => void) {
  useEffect(() => {
    if (!url) {
      return;
    }

    const source = new EventSource(url, { withCredentials: false });
    source.addEventListener("domain_event", (e) => {
      onEvent(JSON.parse((e as MessageEvent).data) as DomainEvent);
    });

    return () => source.close();
  }, [url, onEvent]);
}
