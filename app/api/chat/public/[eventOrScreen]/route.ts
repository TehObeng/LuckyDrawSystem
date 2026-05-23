import { getPublicChatContext } from "@/modules/chat-overlay/services/chat-overlay-service";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: Promise<{ eventOrScreen: string }>;
  },
) {
  const { eventOrScreen } = await params;
  const context = await getPublicChatContext(eventOrScreen);

  if (!context) {
    return Response.json({ error: "Event was not found." }, { status: 404 });
  }

  return Response.json(context);
}
