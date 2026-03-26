import { revealWinner } from "@/modules/lucky-draw/services/lucky-draw-service";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await revealWinner(body);
  return Response.json({ result });
}
