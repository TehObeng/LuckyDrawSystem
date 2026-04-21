import { cookies } from "next/headers";
import { z } from "zod";

const PREVIEW_OPERATOR_COOKIE = "live-event-preview-operator";

const previewOperatorSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "operator"]).default("admin"),
});

export interface OperatorIdentity {
  id: string;
  authUserId: string;
  email: string;
  displayName: string;
  role: "admin" | "operator";
  source: "local";
}

async function readPreviewOperator() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PREVIEW_OPERATOR_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    return previewOperatorSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function createPreviewOperatorSession(input: { displayName: string; email: string; role?: "admin" | "operator" }) {
  const cookieStore = await cookies();
  const previewOperator = previewOperatorSchema.parse(input);

  cookieStore.set(PREVIEW_OPERATOR_COOKIE, JSON.stringify(previewOperator), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearPreviewOperatorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_OPERATOR_COOKIE);
}

export async function getCurrentOperator() {
  const previewOperator = await readPreviewOperator();
  if (!previewOperator) {
    return null;
  }

  return {
    id: "preview-operator",
    authUserId: "preview-operator",
    email: previewOperator.email,
    displayName: previewOperator.displayName,
    role: previewOperator.role,
    source: "local",
  } satisfies OperatorIdentity;
}
