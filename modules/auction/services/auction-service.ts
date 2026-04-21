import { placeBid as placeBidCommand } from "@/modules/auction/commands/auction-commands";
import { bidInputSchema, type BidInput } from "@/modules/auction/schemas/bid";

export async function placeBid(input: BidInput) {
  const payload = bidInputSchema.parse(input);
  return placeBidCommand(
    {
      eventId: payload.eventId,
      lotId: payload.lotId,
      amount: payload.amount,
      bidderLabel: payload.bidderLabel,
    },
    payload.enteredBy,
  );
}
