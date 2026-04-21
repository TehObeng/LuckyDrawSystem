import { prisma } from "@/lib/prisma";
import { parseCsv, toCsv } from "@/modules/shared/utils/csv";
import { toNumber } from "@/modules/shared/utils/formatters";

export interface CsvImportResult {
  imported: number;
  errors: string[];
}

export async function importTicketPoolFromCsv(eventId: string, csvText: string) {
  const rows = parseCsv(csvText);
  const [header, ...body] = rows;
  if (!header || header[0] !== "ticket_number") {
    throw new Error("CSV must start with ticket_number column.");
  }

  const existingTickets = await prisma.ticketPool.findMany({
    where: { eventId },
    select: {
      ticketNumber: true,
      series: true,
    },
  });
  const existingKeys = new Set(existingTickets.map((ticket) => `${ticket.ticketNumber}::${ticket.series ?? ""}`));
  const errors: string[] = [];
  const seenKeys = new Set<string>();
  const validRows = body
    .map((row, index) => ({
      index: index + 2,
      ticketNumber: row[0]?.trim(),
      series: row[1]?.trim(),
      participantName: row[2]?.trim(),
      participantPhone: row[3]?.trim(),
    }))
    .filter((row) => {
      if (!row.ticketNumber) {
        errors.push(`Row ${row.index}: ticket_number is required.`);
        return false;
      }

      const rowKey = `${row.ticketNumber}::${row.series ?? ""}`;
      if (seenKeys.has(rowKey)) {
        errors.push(`Row ${row.index}: duplicate ticket_number in this CSV.`);
        return false;
      }

      if (existingKeys.has(rowKey)) {
        errors.push(`Row ${row.index}: ticket_number already exists for this event.`);
        return false;
      }

      seenKeys.add(rowKey);
      return true;
    });

  const result = validRows.length
      ? await prisma.ticketPool.createMany({
          data: validRows.map((row) => ({
            eventId,
            ticketNumber: row.ticketNumber!,
            series: row.series || null,
            participantName: row.participantName || null,
            participantPhone: row.participantPhone || null,
          })),
        })
    : { count: 0 };

  return {
    imported: result.count,
    errors,
  } satisfies CsvImportResult;
}

export async function importAuctionLotsFromCsv(eventId: string, csvText: string, auctionSessionId?: string) {
  const rows = parseCsv(csvText);
  const [header, ...body] = rows;
  if (!header || header[0] !== "lot_number") {
    throw new Error("CSV must start with lot_number column.");
  }

  const existingLots = await prisma.auctionLot.findMany({
    where: { eventId },
    select: {
      lotNumber: true,
      orderIndex: true,
    },
  });
  const existingLotNumbers = new Set(existingLots.map((lot) => lot.lotNumber));
  let nextOrderIndex = existingLots.reduce((max, lot) => Math.max(max, lot.orderIndex), -1) + 1;
  const errors: string[] = [];
  const seenLotNumbers = new Set<string>();
  const validRows = body
    .map((row, index) => ({
      index: index + 2,
      lotNumber: row[0]?.trim(),
      title: row[1]?.trim(),
      description: row[2]?.trim(),
      openingBid: toNumber(row[3]),
      orderIndex: row[4]?.trim() ? Number(row[4]) : undefined,
    }))
    .filter((row) => {
      if (!row.lotNumber || !row.title) {
        errors.push(`Row ${row.index}: lot_number and title are required.`);
        return false;
      }

      if (seenLotNumbers.has(row.lotNumber)) {
        errors.push(`Row ${row.index}: duplicate lot_number in this CSV.`);
        return false;
      }

      if (existingLotNumbers.has(row.lotNumber)) {
        errors.push(`Row ${row.index}: lot_number already exists for this event.`);
        return false;
      }

      if (row.orderIndex !== undefined && Number.isNaN(row.orderIndex)) {
        errors.push(`Row ${row.index}: order_index must be a number when provided.`);
        return false;
      }

      seenLotNumbers.add(row.lotNumber);
      return true;
    });

  const result = validRows.length
      ? await prisma.auctionLot.createMany({
          data: validRows.map((row) => ({
            eventId,
            auctionSessionId: auctionSessionId ?? null,
            lotNumber: row.lotNumber!,
            title: row.title!,
            description: row.description || null,
            openingBid: row.openingBid,
            orderIndex: row.orderIndex ?? nextOrderIndex++,
            status: "draft",
          })),
        })
    : { count: 0 };

  return {
    imported: result.count,
    errors,
  } satisfies CsvImportResult;
}

export async function exportTicketPoolCsv(eventId: string) {
  const tickets = await prisma.ticketPool.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  return toCsv([
    ["ticket_number", "series", "participant_name", "participant_phone", "eligible", "used"],
    ...tickets.map((ticket) => [
      ticket.ticketNumber,
      ticket.series ?? "",
      ticket.participantName ?? "",
      ticket.participantPhone ?? "",
      String(ticket.eligible),
      String(ticket.used),
    ]),
  ]);
}

export async function exportWinnersCsv(eventId: string) {
  const winners = await prisma.winner.findMany({
    where: { eventId },
    orderBy: [{ createdAt: "asc" }, { revealOrder: "asc" }],
    include: {
      prizeCategory: true,
      drawSession: true,
    },
  });

  return toCsv([
    ["ticket_number", "status", "reveal_order", "prize_name", "session_name", "reveal_source", "created_at"],
    ...winners.map((winner) => [
      winner.ticketNumber,
      winner.status,
      winner.revealOrder,
      winner.prizeCategory.name,
      winner.drawSession.name,
      winner.revealSource,
      winner.createdAt.toISOString(),
    ]),
  ]);
}

export async function exportAuctionResultsCsv(eventId: string) {
  const lots = await prisma.auctionLot.findMany({
    where: { eventId },
    orderBy: { orderIndex: "asc" },
    include: {
      bids: {
        where: {
          voidedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return toCsv([
    ["lot_number", "title", "status", "opening_bid", "current_bid", "final_bid", "winner_label", "last_bidder"],
    ...lots.map((lot) => [
      lot.lotNumber,
      lot.title,
      lot.status,
      lot.openingBid.toString(),
      lot.currentBid?.toString() ?? "",
      lot.finalBid?.toString() ?? "",
      lot.winnerLabel ?? "",
      lot.bids[0]?.bidderLabel ?? "",
    ]),
  ]);
}
