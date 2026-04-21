import { moduleTypeSchema } from "@/modules/shared/types/contracts";
import { getPublicDisplayState } from "@/modules/shared/services/display-state-service";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ moduleType: string; eventOrScreen: string }>;
  },
) {
  const { moduleType: rawModuleType, eventOrScreen } = await params;
  const parsedModuleType = moduleTypeSchema.safeParse(rawModuleType);

  if (!parsedModuleType.success) {
    return Response.json({ error: "Invalid module type." }, { status: 400 });
  }

  const state = await getPublicDisplayState(parsedModuleType.data, eventOrScreen);
  if (!state) {
    return Response.json({ error: "Display screen not found." }, { status: 404 });
  }

  return Response.json(state);
}
