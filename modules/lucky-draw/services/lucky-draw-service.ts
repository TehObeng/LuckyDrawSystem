import { revealWinner as revealWinnerCommand } from "@/modules/lucky-draw/commands/lucky-draw-commands";
import { luckyDrawRevealSchema, type LuckyDrawRevealInput } from "@/modules/lucky-draw/schemas/reveal";
import type { LuckyDrawDisplayEnvelope } from "@/modules/shared/types/contracts";

type LuckyDrawPublicState = LuckyDrawDisplayEnvelope;

export async function revealWinner(input: LuckyDrawRevealInput) {
  const payload = luckyDrawRevealSchema.parse(input);
  return revealWinnerCommand(payload, payload.actor);
}
