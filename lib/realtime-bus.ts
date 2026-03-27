import type { DisplayPayload } from "@/modules/shared/types/contracts";

type Listener = (event: DisplayPayload) => void;

class RealtimeBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: DisplayPayload) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const globalBus = globalThis as unknown as { bus?: RealtimeBus };
export const realtimeBus = globalBus.bus ?? new RealtimeBus();
if (!globalBus.bus) globalBus.bus = realtimeBus;
