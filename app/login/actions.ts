"use server";

import { redirect } from "next/navigation";
import { createPreviewOperatorSession, clearPreviewOperatorSession } from "@/lib/auth/operator";

export async function loginWithPasswordAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "Local Operator").trim() || "Local Operator";
  const email = String(formData.get("email") ?? "operator@local.dev").trim() || "operator@local.dev";

  await createPreviewOperatorSession({
    displayName,
    email,
    role: "admin",
  });

  redirect("/admin?notice=Local+operator+session+ready.");
}

export async function previewAccessAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "Preview Operator").trim() || "Preview Operator";
  const email = String(formData.get("email") ?? "preview@local.dev").trim() || "preview@local.dev";

  await createPreviewOperatorSession({
    displayName,
    email,
    role: "admin",
  });

  redirect("/admin?notice=Preview+workspace+ready.");
}

export async function logoutAction() {
  await clearPreviewOperatorSession();
  redirect("/login");
}
