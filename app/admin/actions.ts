"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAuctionLot, createAuctionSession, cueAuctionLot, clearAuctionDisplay, markLotPassed, markLotSold, parseBidAmount, placeBid, undoLastBid } from "@/modules/auction/commands/auction-commands";
import { clearLuckyDrawDisplay, createDrawSession, createPrizeCategory, deleteDrawSession, deletePrizeCategory, drawRandomWinner, editWinnerTicket, invalidateWinner, redrawWinner, replayLuckyDrawAnimation, revealWinner, undoLastReveal, updateDrawSession, updatePrizeBoardSettings, updatePrizeCategory } from "@/modules/lucky-draw/commands/lucky-draw-commands";
import { archiveEvent, createEvent, createMediaAssetRecord, createThemePreset, updateEvent, updateEventSettings, updateMediaAssetRecord, updateThemePreset } from "@/modules/shared/commands/platform-commands";
import { publishMasterDisplaySelection } from "@/modules/shared/services/display-state-service";
import { importAuctionLotsFromCsv, importTicketPoolFromCsv } from "@/modules/shared/services/import-export-service";
import { defaultEventSettings, defaultPrizeBoardSettings, defaultTicketFormat, duplicatePolicySchema, eventSettingsSchema, prizeBoardSettingsSchema, themeSettingsSchema, ticketFormatSchema } from "@/modules/shared/types/contracts";
import { getCurrentOperator } from "@/lib/auth/operator";
import { prisma } from "@/lib/prisma";

const ADMIN_PATHS = ["/admin", "/admin/events", "/admin/themes", "/admin/settings", "/admin/debug", "/admin/lucky-draw", "/admin/auction", "/admin/imports", "/admin/audit", "/admin/live"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || undefined;
}

function getBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = getString(formData, key);
  if (!value) {
    return fallback;
  }

  return Number(value);
}

function revalidateAdmin() {
  for (const path of ADMIN_PATHS) {
    revalidatePath(path);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

async function redirectBackWithStatus(kind: "notice" | "error", message: string, fallbackPath = "/admin") {
  const headerList = await headers();
  const referer = headerList.get("referer");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL(referer ?? fallbackPath, baseUrl);
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  url.searchParams.set(kind, message);

  redirect(`${url.pathname}${url.search}`);
}

async function requireOperator() {
  const operator = await getCurrentOperator();
  if (!operator) {
    redirect("/login");
  }

  return operator;
}

async function runAdminAction(
  work: (operator: Awaited<ReturnType<typeof requireOperator>>) => Promise<string | void>,
  options?: {
    fallbackPath?: string;
    successMessage?: string;
  },
) {
  const operator = await requireOperator();
  let successMessage = options?.successMessage ?? "Changes saved.";

  try {
    successMessage = (await work(operator)) ?? successMessage;
  } catch (error) {
    await redirectBackWithStatus("error", getErrorMessage(error), options?.fallbackPath);
  }

  revalidateAdmin();
  await redirectBackWithStatus("notice", successMessage, options?.fallbackPath);
}

type InlineActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

async function runInlineAdminAction(
  work: (operator: Awaited<ReturnType<typeof requireOperator>>) => Promise<string | void>,
  options?: {
    fallbackPath?: string;
    successMessage?: string;
  },
): Promise<InlineActionResult> {
  const operator = await requireOperator();
  let successMessage = options?.successMessage ?? "Changes saved.";

  try {
    successMessage = (await work(operator)) ?? successMessage;
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }

  revalidateAdmin();

  return {
    ok: true,
    message: successMessage,
  };
}

function parseTicketFormatFromForm(formData: FormData) {
  return ticketFormatSchema.parse({
    mode: getString(formData, "ticketMode") || defaultTicketFormat.mode,
    allowSeries: getBoolean(formData, "allowSeries"),
    preserveLeadingZeros: getBoolean(formData, "preserveLeadingZeros"),
    fixedLength: getString(formData, "fixedLength") ? Number(getString(formData, "fixedLength")) : null,
    minLength: getNumber(formData, "minLength", defaultTicketFormat.minLength),
    maxLength: getNumber(formData, "maxLength", defaultTicketFormat.maxLength),
    prefix: getString(formData, "ticketPrefix"),
    regex: getString(formData, "ticketRegex"),
  });
}

function parseThemeSettingsFromForm(formData: FormData) {
  const backgroundImageUrl = getOptionalString(formData, "backgroundImageUrl") ?? getOptionalString(formData, "backgroundAssetUrl");
  const logoUrl = getOptionalString(formData, "logoUrl") ?? getOptionalString(formData, "logoAssetUrl");

  return themeSettingsSchema.parse({
    backgroundType: getString(formData, "backgroundType") || "color",
    backgroundImageUrl,
    logoUrl,
    backgroundColorStart: getString(formData, "backgroundColorStart") || "#0f172a",
    backgroundColorEnd: getString(formData, "backgroundColorEnd") || "#020617",
    backgroundColorMode: getString(formData, "backgroundColorMode") === "solid" ? "solid" : "gradient",
    accentColor: getString(formData, "accentColor") || "#34d399",
    textColor: getString(formData, "textColor") || "#f8fafc",
    mutedTextColor: getString(formData, "mutedTextColor") || "#94a3b8",
    surfaceTint: getString(formData, "surfaceTint") || "rgba(8, 15, 28, 0.72)",
    overlayMode: getBoolean(formData, "overlayMode"),
    displayStyle: getString(formData, "displayStyle") || "broadcast",
    motionProfile: getString(formData, "motionProfile") || "dynamic",
    backgroundFit: getString(formData, "backgroundFit") || "cover",
    backgroundPosition: getString(formData, "backgroundPosition") || "center",
    overlayOpacity: getString(formData, "overlayOpacity") ? Number(getString(formData, "overlayOpacity")) : 0.72,
    logoScale: getString(formData, "logoScale") ? Number(getString(formData, "logoScale")) : 1,
    logoPosition: getString(formData, "logoPosition") || "top_right",
    contentAlignment: getString(formData, "contentAlignment") || "left",
    showMetaPanel: getBoolean(formData, "showMetaPanel"),
    showSceneLabel: getBoolean(formData, "showSceneLabel"),
    panelStyle: getString(formData, "panelStyle") || "glass",
    heroImageBehavior: getString(formData, "heroImageBehavior") || "poster",
  });
}

function parsePrizeBoardSettingsFromForm(formData: FormData) {
  return prizeBoardSettingsSchema.parse({
    columns: getNumber(formData, "columns", defaultPrizeBoardSettings.columns),
    minItemWidth: getNumber(formData, "minItemWidth", defaultPrizeBoardSettings.minItemWidth),
    cardMinHeight: getNumber(formData, "cardMinHeight", defaultPrizeBoardSettings.cardMinHeight),
    boardMaxWidth: getNumber(formData, "boardMaxWidth", defaultPrizeBoardSettings.boardMaxWidth),
    gap: getNumber(formData, "gap", defaultPrizeBoardSettings.gap),
    fontFamily: getString(formData, "fontFamily") || defaultPrizeBoardSettings.fontFamily,
    winnerLabelFontSize: getNumber(formData, "winnerLabelFontSize", defaultPrizeBoardSettings.winnerLabelFontSize),
    fontSize: getNumber(formData, "fontSize", defaultPrizeBoardSettings.fontSize),
    numberFontSize: getNumber(formData, "numberFontSize", defaultPrizeBoardSettings.numberFontSize),
    fontWeight: getNumber(formData, "fontWeight", defaultPrizeBoardSettings.fontWeight),
  });
}

export async function createEventAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createEvent(
      {
        name: getString(formData, "name"),
        slug: getOptionalString(formData, "slug"),
        date: getString(formData, "date"),
        locale: getString(formData, "locale") || "en-US",
        currencyCode: getString(formData, "currencyCode") || "USD",
        description: getOptionalString(formData, "description"),
        supportsLuckyDraw: getBoolean(formData, "supportsLuckyDraw"),
        supportsAuction: getBoolean(formData, "supportsAuction"),
        duplicatePolicy: duplicatePolicySchema.parse(getString(formData, "duplicatePolicy") || "event"),
        ticketFormat: parseTicketFormatFromForm(formData),
      },
      operator.displayName,
    );

    return "Event created.";
  }, { fallbackPath: "/admin/events" });
}

export async function updateEventAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updateEvent(
      {
        eventId: getString(formData, "eventId"),
        name: getString(formData, "name"),
        slug: getOptionalString(formData, "slug"),
        date: getString(formData, "date"),
        locale: getString(formData, "locale") || "en-US",
        currencyCode: getString(formData, "currencyCode") || "USD",
        description: getOptionalString(formData, "description"),
        supportsLuckyDraw: getBoolean(formData, "supportsLuckyDraw"),
        supportsAuction: getBoolean(formData, "supportsAuction"),
        duplicatePolicy: duplicatePolicySchema.parse(getString(formData, "duplicatePolicy") || "event"),
        ticketFormat: parseTicketFormatFromForm(formData),
        defaultThemeId: getOptionalString(formData, "defaultThemeId"),
      },
      operator.displayName,
    );

    return "Event updated.";
  }, { fallbackPath: "/admin/events" });
}

export async function archiveEventAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await archiveEvent(getString(formData, "eventId"), operator.displayName);
    return "Event archived.";
  }, { fallbackPath: "/admin/events" });
}

export async function createThemeAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createThemePreset(
      {
        eventId: getString(formData, "eventId"),
        name: getString(formData, "name"),
        settings: parseThemeSettingsFromForm(formData),
        setAsDefault: getBoolean(formData, "setAsDefault"),
      },
      operator.displayName,
    );

    return "Theme preset created.";
  }, { fallbackPath: "/admin/themes" });
}

export async function updateThemeAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updateThemePreset(
      {
        themeId: getString(formData, "themeId"),
        eventId: getString(formData, "eventId"),
        name: getString(formData, "name"),
        settings: parseThemeSettingsFromForm(formData),
        setAsDefault: getBoolean(formData, "setAsDefault"),
      },
      operator.displayName,
    );

    return "Theme preset updated.";
  }, { fallbackPath: "/admin/themes" });
}

export async function createPrizeAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createPrizeCategory(
      {
        eventId: getString(formData, "eventId"),
        name: getString(formData, "name"),
        quantity: getNumber(formData, "quantity", 1),
        description: getOptionalString(formData, "description"),
        displayImageUrl: getOptionalString(formData, "displayImageUrl"),
        displayMode: getString(formData, "displayMode") === "exclusive" ? "exclusive" : "grid",
        animationPreset: (getString(formData, "animationPreset") || "fade_pop") as "scramble" | "rolling" | "slot" | "flip" | "zoom" | "fade_pop" | "celebration_burst",
        animationSpeed: getNumber(formData, "animationSpeed", 1),
        specialThemeId: getOptionalString(formData, "specialThemeId"),
      },
      operator.displayName,
    );

    return "Prize category added.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function updatePrizeAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updatePrizeCategory(
      {
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        name: getString(formData, "name"),
        quantity: getNumber(formData, "quantity", 1),
        description: getOptionalString(formData, "description"),
        displayImageUrl: getOptionalString(formData, "displayImageUrl"),
        displayMode: getString(formData, "displayMode") === "exclusive" ? "exclusive" : "grid",
        animationPreset: (getString(formData, "animationPreset") || "fade_pop") as "scramble" | "rolling" | "slot" | "flip" | "zoom" | "fade_pop" | "celebration_burst",
        animationSpeed: getNumber(formData, "animationSpeed", 1),
        specialThemeId: getOptionalString(formData, "specialThemeId"),
      },
      operator.displayName,
    );

    return "Prize category updated.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function deletePrizeAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await deletePrizeCategory(getString(formData, "prizeCategoryId"), operator.displayName);
    return "Prize category removed.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function createDrawSessionAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createDrawSession(
      {
        eventId: getString(formData, "eventId"),
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        name: getString(formData, "name"),
        plannedWinnerCount: getNumber(formData, "plannedWinnerCount", 1),
        layoutMode: getString(formData, "layoutMode") === "exclusive" ? "exclusive" : "grid",
        gridItemCount: getNumber(formData, "gridItemCount", 12),
        gridRows: getString(formData, "gridRows") ? getNumber(formData, "gridRows") : undefined,
        gridCols: getString(formData, "gridCols") ? getNumber(formData, "gridCols") : undefined,
        animationPresetOverride: getOptionalString(formData, "animationPresetOverride") as
          | "scramble"
          | "rolling"
          | "slot"
          | "flip"
          | "zoom"
          | "fade_pop"
          | "celebration_burst"
          | undefined,
        animationSpeedOverride: getString(formData, "animationSpeedOverride") ? getNumber(formData, "animationSpeedOverride") : undefined,
        revealMode: getString(formData, "revealMode") === "digital_random" ? "digital_random" : "manual",
      },
      operator.displayName,
    );

    return "Draw session created.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function updateDrawSessionAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updateDrawSession(
      {
        drawSessionId: getString(formData, "drawSessionId"),
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        name: getString(formData, "name"),
        plannedWinnerCount: getNumber(formData, "plannedWinnerCount", 1),
        layoutMode: getString(formData, "layoutMode") === "exclusive" ? "exclusive" : "grid",
        gridItemCount: getNumber(formData, "gridItemCount", 12),
        gridRows: getString(formData, "gridRows") ? getNumber(formData, "gridRows") : undefined,
        gridCols: getString(formData, "gridCols") ? getNumber(formData, "gridCols") : undefined,
        animationPresetOverride: getOptionalString(formData, "animationPresetOverride") as
          | "scramble"
          | "rolling"
          | "slot"
          | "flip"
          | "zoom"
          | "fade_pop"
          | "celebration_burst"
          | undefined,
        animationSpeedOverride: getString(formData, "animationSpeedOverride") ? getNumber(formData, "animationSpeedOverride") : undefined,
        revealMode: getString(formData, "revealMode") === "digital_random" ? "digital_random" : "manual",
      },
      operator.displayName,
    );

    return "Draw session updated.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function deleteDrawSessionAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await deleteDrawSession(getString(formData, "drawSessionId"), operator.displayName);
    return "Draw session removed.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function updatePrizeBoardSettingsAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updatePrizeBoardSettings(
      {
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        boardSettings: parsePrizeBoardSettingsFromForm(formData),
      },
      operator.displayName,
    );

    return "Prize board settings updated.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function importTicketPoolAction(formData: FormData) {
  await runAdminAction(async () => {
    const result = await importTicketPoolFromCsv(getString(formData, "eventId"), getString(formData, "csvText"));
    const skipped = result.errors.length ? ` ${result.errors.length} row(s) were skipped.` : "";
    return `Imported ${result.imported} ticket row(s).${skipped}`;
  }, { fallbackPath: "/admin/imports" });
}

export async function importAuctionLotsAction(formData: FormData) {
  await runAdminAction(async () => {
    const result = await importAuctionLotsFromCsv(getString(formData, "eventId"), getString(formData, "csvText"), getOptionalString(formData, "auctionSessionId"));
    const skipped = result.errors.length ? ` ${result.errors.length} row(s) were skipped.` : "";
    return `Imported ${result.imported} auction lot row(s).${skipped}`;
  }, { fallbackPath: "/admin/imports" });
}

export async function createAuctionSessionAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createAuctionSession(
      {
        eventId: getString(formData, "eventId"),
        name: getString(formData, "name"),
      },
      operator.displayName,
    );

    return "Auction session created.";
  }, { fallbackPath: "/admin/auction" });
}

export async function createAuctionLotAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createAuctionLot(
      {
        eventId: getString(formData, "eventId"),
        auctionSessionId: getOptionalString(formData, "auctionSessionId"),
        lotNumber: getString(formData, "lotNumber"),
        title: getString(formData, "title"),
        description: getOptionalString(formData, "description"),
        displayImageUrl: getOptionalString(formData, "displayImageUrl"),
        openingBid: getNumber(formData, "openingBid", 0),
        orderIndex: getString(formData, "orderIndex") ? getNumber(formData, "orderIndex") : undefined,
        themeOverrideId: getOptionalString(formData, "themeOverrideId"),
        displayTitle: getOptionalString(formData, "displayTitle"),
        incrementRule: {
          minIncrement: getString(formData, "minIncrement") ? getNumber(formData, "minIncrement") : undefined,
          freeInput: getBoolean(formData, "freeInput"),
        },
      },
      operator.displayName,
    );

    return "Auction lot created.";
  }, { fallbackPath: "/admin/auction" });
}

export async function liveRevealWinnerAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await revealWinner(
      {
        eventId: getString(formData, "eventId"),
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        drawSessionId: getString(formData, "drawSessionId"),
        ticketNumber: getString(formData, "ticketNumber"),
        note: getOptionalString(formData, "note"),
        revealSource: "manual",
      },
      operator.displayName,
    );

    return "Winner revealed.";
  }, { fallbackPath: "/admin/live" });
}

export async function digitalRandomWinnerAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await drawRandomWinner(
      {
        eventId: getString(formData, "eventId"),
        prizeCategoryId: getString(formData, "prizeCategoryId"),
        drawSessionId: getString(formData, "drawSessionId"),
        revealSource: "digital_random",
      },
      operator.displayName,
    );

    return "Digital random reveal completed.";
  }, { fallbackPath: "/admin/live" });
}

export async function invalidateWinnerAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await invalidateWinner(
      {
        winnerId: getString(formData, "winnerId"),
        note: getOptionalString(formData, "note"),
      },
      operator.displayName,
    );

    return "Winner invalidated.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function editWinnerAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await editWinnerTicket(
      {
        winnerId: getString(formData, "winnerId"),
        ticketNumber: getString(formData, "ticketNumber"),
        note: getOptionalString(formData, "note"),
      },
      operator.displayName,
    );

    return "Winner ticket updated.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function redrawWinnerAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await redrawWinner(
      {
        winnerId: getString(formData, "winnerId"),
        ticketNumber: getString(formData, "ticketNumber"),
        note: getOptionalString(formData, "note"),
      },
      operator.displayName,
    );

    return "Winner redrawn.";
  }, { fallbackPath: "/admin/lucky-draw" });
}

export async function undoRevealAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await undoLastReveal(getString(formData, "drawSessionId"), operator.displayName);
    return "Last reveal undone.";
  }, { fallbackPath: "/admin/live" });
}

export async function replayLuckyDrawAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await replayLuckyDrawAnimation(getString(formData, "drawSessionId"), operator.displayName);
    return "Replay animation sent to the display.";
  }, { fallbackPath: "/admin/live" });
}

export async function clearLuckyDrawDisplayAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await clearLuckyDrawDisplay(getString(formData, "eventId"), operator.displayName);
    return "Lucky draw display cleared.";
  }, { fallbackPath: "/admin/live" });
}

export async function cueAuctionLotAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await cueAuctionLot(getString(formData, "lotId"), operator.displayName);
    return "Auction lot intro cued.";
  }, { fallbackPath: "/admin/live" });
}

export async function liveBidAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await placeBid(
      {
        eventId: getString(formData, "eventId"),
        lotId: getString(formData, "lotId"),
        amount: parseBidAmount(getString(formData, "amount")),
        bidderLabel: getOptionalString(formData, "bidderLabel"),
        note: getOptionalString(formData, "note"),
      },
      operator.displayName,
    );

    return "Bid accepted.";
  }, { fallbackPath: "/admin/live" });
}

export async function undoBidAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await undoLastBid(getString(formData, "lotId"), operator.displayName);
    return "Last bid undone.";
  }, { fallbackPath: "/admin/live" });
}

export async function soldLotAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await markLotSold(
      {
        lotId: getString(formData, "lotId"),
        winnerLabel: getOptionalString(formData, "winnerLabel"),
      },
      operator.displayName,
    );

    return "Lot marked sold.";
  }, { fallbackPath: "/admin/live" });
}

export async function passedLotAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await markLotPassed(getString(formData, "lotId"), operator.displayName);
    return "Lot marked passed.";
  }, { fallbackPath: "/admin/live" });
}

export async function clearAuctionDisplayAction(formData: FormData) {
  return runInlineAdminAction(async (operator) => {
    await clearAuctionDisplay(getString(formData, "eventId"), operator.displayName);
    return "Auction display cleared.";
  }, { fallbackPath: "/admin/live" });
}

export async function updateEventSettingsAction(formData: FormData) {
  const parsedSettings = eventSettingsSchema.parse({
    ...defaultEventSettings,
    defaultMasterSource: getString(formData, "defaultMasterSource") || defaultEventSettings.defaultMasterSource,
    activeMasterSource: getString(formData, "activeMasterSource") || defaultEventSettings.activeMasterSource,
    requireActionConfirmations: getBoolean(formData, "requireActionConfirmations"),
    persistLiveSelections: getBoolean(formData, "persistLiveSelections"),
    showRouteCopyButtons: getBoolean(formData, "showRouteCopyButtons"),
    fallbackPollingIntervalMs: getString(formData, "fallbackPollingIntervalMs")
      ? Number(getString(formData, "fallbackPollingIntervalMs"))
      : defaultEventSettings.fallbackPollingIntervalMs,
  });

  await runAdminAction(async (operator) => {
    await updateEventSettings(
      {
        eventId: getString(formData, "eventId"),
        settings: parsedSettings,
        publishMaster: true,
        masterDisplayMode: getString(formData, "masterDisplayMode") === "fullscreen" ? "fullscreen" : "overlay",
      },
      operator.displayName,
    );

    return "Operational settings saved.";
  }, { fallbackPath: "/admin/settings" });
}

export async function updateMasterDisplayAction(formData: FormData) {
  return runInlineAdminAction(async () => {
    await publishMasterDisplaySelection(prisma, {
      eventId: getString(formData, "eventId"),
      source: getString(formData, "source") === "lucky_draw" ? "lucky_draw" : getString(formData, "source") === "auction" ? "auction" : "blank",
      displayMode: getString(formData, "displayMode") === "fullscreen" ? "fullscreen" : "overlay",
      note: getOptionalString(formData, "note"),
    });

    return "Master display updated.";
  }, { fallbackPath: "/admin/live" });
}

export async function createMediaAssetAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await createMediaAssetRecord(
      {
        eventId: getOptionalString(formData, "eventId"),
        kind: getString(formData, "kind") === "background" ? "background" : getString(formData, "kind") === "logo" ? "logo" : "supporting",
        publicUrl: getString(formData, "publicUrl"),
        bucket: getOptionalString(formData, "bucket"),
        path: getOptionalString(formData, "path"),
        mimeType: getOptionalString(formData, "mimeType"),
        metadata: {
          title: getOptionalString(formData, "title"),
          altText: getOptionalString(formData, "altText"),
          width: getString(formData, "width") ? Number(getString(formData, "width")) : undefined,
          height: getString(formData, "height") ? Number(getString(formData, "height")) : undefined,
          tags: getString(formData, "tags")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          focalPoint:
            getString(formData, "focalX") && getString(formData, "focalY")
              ? {
                  x: Number(getString(formData, "focalX")),
                  y: Number(getString(formData, "focalY")),
                }
              : undefined,
        },
      },
      operator.displayName,
    );

    return "Media asset saved.";
  }, { fallbackPath: "/admin/themes" });
}

export async function updateMediaAssetAction(formData: FormData) {
  await runAdminAction(async (operator) => {
    await updateMediaAssetRecord(
      {
        mediaAssetId: getString(formData, "mediaAssetId"),
        eventId: getOptionalString(formData, "eventId"),
        kind: getString(formData, "kind") === "background" ? "background" : getString(formData, "kind") === "logo" ? "logo" : "supporting",
        publicUrl: getString(formData, "publicUrl"),
        bucket: getOptionalString(formData, "bucket"),
        path: getOptionalString(formData, "path"),
        mimeType: getOptionalString(formData, "mimeType"),
        metadata: {
          title: getOptionalString(formData, "title"),
          altText: getOptionalString(formData, "altText"),
          width: getString(formData, "width") ? Number(getString(formData, "width")) : undefined,
          height: getString(formData, "height") ? Number(getString(formData, "height")) : undefined,
          tags: getString(formData, "tags")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          focalPoint:
            getString(formData, "focalX") && getString(formData, "focalY")
              ? {
                  x: Number(getString(formData, "focalX")),
                  y: Number(getString(formData, "focalY")),
                }
              : undefined,
        },
      },
      operator.displayName,
    );

    return "Media asset updated.";
  }, { fallbackPath: "/admin/themes" });
}
