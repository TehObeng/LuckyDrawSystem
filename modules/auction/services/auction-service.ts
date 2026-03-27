import { prisma } from "@/lib/prisma";
import { persistDisplayState } from "@/lib/display-state";
import { realtimeBus } from "@/lib/realtime-bus";
import { bidInputSchema, type BidInput } from "@/modules/auction/schemas/bid";
import type { AuctionPublicState } from "@/modules/shared/types/contracts";

const defaultTheme = {
  backgroundType: "color" as const,
  accentColor: "#f97316",
  textColor: "#ffffff",
  overlayMode: false,
};

export async function placeBid(input: BidInput) {
  const payload = bidInputSchema.parse(input);

  const lot = await prisma.auctionLot.findUniqueOrThrow({ where: { id: payload.lotId } });
  const event = await prisma.event.findUniqueOrThrow({ where: { id: payload.eventId } });

  if (lot.currentBid !== null && payload.amount <= Number(lot.currentBid)) {
    throw new Error("Bid must be greater than current bid.");
  }

  const previousAmount = lot.currentBid ? Number(lot.currentBid) : Number(lot.openingBid);

  await prisma.bidEntry.create({
    data: {
      lotId: payload.lotId,
      eventId: payload.eventId,
      amount: payload.amount,
      previousAmount,
      bidderLabel: payload.bidderLabel,
      isOpeningBid: lot.currentBid === null,
      enteredBy: payload.enteredBy,
    },
  });

  const updatedLot = await prisma.auctionLot.update({
    where: { id: payload.lotId },
    data: {
      currentBid: payload.amount,
      status: "live",
    },
  });

  await prisma.auditLog.create({
    data: {
      eventId: payload.eventId,
      moduleType: "auction",
      actionType: "auction.bid_placed",
      actor: payload.enteredBy,
      payload: updatedLot,
    },
  });

  const state: AuctionPublicState = {
    moduleType: "auction",
    eventSlug: event.slug,
    lotNumber: updatedLot.lotNumber,
    lotTitle: updatedLot.title,
    currentBid: Number(updatedLot.currentBid),
    previousBid: previousAmount,
    bidderLabel: payload.bidderLabel,
    status: "revealed",
    updatedAt: new Date().toISOString(),
    theme: defaultTheme,
  };

  await persistDisplayState(payload.eventId, "auction", state);
  realtimeBus.publish(state);
  return updatedLot;
}
