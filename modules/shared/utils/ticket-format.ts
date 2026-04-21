import type { TicketFormatSettings } from "@/modules/shared/schemas/platform";

export function normalizeTicketNumber(rawValue: string, format: TicketFormatSettings) {
  const trimmed = rawValue.trim().toUpperCase();
  const withoutWhitespace = trimmed.replace(/\s+/g, "");

  if (format.mode === "numeric") {
    return withoutWhitespace.replace(/[^0-9]/g, "");
  }

  return withoutWhitespace.replace(/[^A-Z0-9-]/g, "");
}

export function validateTicketNumber(rawValue: string, format: TicketFormatSettings) {
  const normalized = normalizeTicketNumber(rawValue, format);
  const issues: string[] = [];

  if (!normalized) {
    issues.push("Ticket number is required.");
  }

  if (format.mode === "numeric" && /[^0-9]/.test(normalized)) {
    issues.push("Ticket number must be numeric.");
  }

  if (format.fixedLength !== null && normalized.length !== format.fixedLength) {
    issues.push(`Ticket number must be exactly ${format.fixedLength} characters.`);
  }

  if (normalized.length < format.minLength || normalized.length > format.maxLength) {
    issues.push(`Ticket number must be between ${format.minLength} and ${format.maxLength} characters.`);
  }

  if (format.prefix && !normalized.startsWith(format.prefix.toUpperCase())) {
    issues.push(`Ticket number must start with ${format.prefix}.`);
  }

  if (format.regex) {
    const expression = new RegExp(format.regex);
    if (!expression.test(normalized)) {
      issues.push("Ticket number does not match the configured format.");
    }
  }

  return {
    normalized,
    valid: issues.length === 0,
    issues,
  };
}

