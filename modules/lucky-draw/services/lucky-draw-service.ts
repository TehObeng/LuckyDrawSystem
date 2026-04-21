import { revealWinner as revealWinnerCommand } from "@/modules/lucky-draw/commands/lucky-draw-commands";
import { luckyDrawRevealSchema, type LuckyDrawRevealInput } from "@/modules/lucky-draw/schemas/reveal";

const animationPresets = new Set<LuckyDrawPublicState["animationPreset"]>([
  "scramble",
  "rolling",
  "slot",
  "flip",
  "zoom",
  "fade_pop",
]);

function toAnimationPreset(value: string | null | undefined): LuckyDrawPublicState["animationPreset"] {
  if (value && animationPresets.has(value as LuckyDrawPublicState["animationPreset"])) {
    return value as LuckyDrawPublicState["animationPreset"];
  }

  return "fade_pop";
}

export async function revealWinner(input: LuckyDrawRevealInput) {
  const payload = luckyDrawRevealSchema.parse(input);
  return revealWinnerCommand(payload, payload.actor);
}
