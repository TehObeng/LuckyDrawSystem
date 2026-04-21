import { prisma } from "@/lib/prisma";
import { liveDisplayEnvelopeSchema } from "@/modules/shared/types/contracts";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const states = await prisma.displayState.findMany({
    where: { eventId },
    orderBy: { syncedAt: "desc" },
    take: 6,
  });

  return Response.json({
    states: states.map((state) => liveDisplayEnvelopeSchema.parse(state.payload)),
  });
}
