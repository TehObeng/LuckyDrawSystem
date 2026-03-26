import type { DisplayPayload } from "@/modules/shared/types/contracts";
import { prisma } from "@/lib/prisma";

export async function persistDisplayState(eventId: string, moduleType: "lucky_draw" | "auction", payload: DisplayPayload) {
  await prisma.displayState.upsert({
    where: {
      eventId_moduleType_routeKey: {
        eventId,
        moduleType,
        routeKey: payload.eventSlug,
      },
    },
    create: {
      eventId,
      moduleType,
      routeKey: payload.eventSlug,
      payload,
      displayMode: payload.theme.overlayMode ? "overlay" : "fullscreen",
      status: payload.status,
      syncedAt: new Date(),
    },
    update: {
      payload,
      displayMode: payload.theme.overlayMode ? "overlay" : "fullscreen",
      status: payload.status,
      syncedAt: new Date(),
    },
  });
}
