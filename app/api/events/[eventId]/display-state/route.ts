import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const states = await prisma.displayState.findMany({
    where: { eventId },
    orderBy: { syncedAt: "desc" },
    take: 2,
  });

  return Response.json({ states });
}
