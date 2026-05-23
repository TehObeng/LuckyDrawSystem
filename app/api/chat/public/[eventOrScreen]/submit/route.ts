import { getRequestSourceHash, submitPublicChatMessage } from "@/modules/chat-overlay/services/chat-overlay-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ eventOrScreen: string }>;
  },
) {
  const { eventOrScreen } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    senderName?: string;
    content?: string;
  };

  try {
    const result = await submitPublicChatMessage({
      eventOrScreen,
      senderName: body.senderName,
      content: body.content ?? "",
      sourceHash: getRequestSourceHash(request),
    });

    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to submit message.",
      },
      { status: 400 },
    );
  }
}
