import { prisma } from "@/lib/prisma";
import { parseCsv, toCsv } from "@/modules/shared/utils/csv";

export async function importTicketPoolFromCsv(eventId: string, csvText: string) {
  const rows = parseCsv(csvText);
  const [header, ...body] = rows;
  if (!header || header[0] !== "ticket_number") {
    throw new Error("CSV must start with ticket_number column");
  }

  await prisma.$transaction(
    body.map((row) =>
      prisma.ticketPool.create({
        data: {
          eventId,
          ticketNumber: row[0],
          series: row[1] || null,
          participantName: row[2] || null,
          participantPhone: row[3] || null,
        },
      }),
    ),
  );
}

export async function exportWinnersCsv(eventId: string) {
  const winners = await prisma.winner.findMany({
    where: { eventId },
    orderBy: { revealOrder: "asc" },
  });

  return toCsv([
    ["ticket_number", "status", "reveal_order", "created_at"],
    ...winners.map((winner) => [winner.ticketNumber, winner.status, winner.revealOrder, winner.createdAt.toISOString()]),
  ]);
}

export async function exportAuctionResultsCsv(eventId: string) {
  const lots = await prisma.auctionLot.findMany({
    where: { eventId },
    orderBy: { orderIndex: "asc" },
  });

  return toCsv([
    ["lot_number", "title", "status", "final_bid", "winner_label"],
    ...lots.map((lot) => [lot.lotNumber, lot.title, lot.status, lot.finalBid?.toString() ?? "", lot.winnerLabel ?? ""]),
  ]);
}
