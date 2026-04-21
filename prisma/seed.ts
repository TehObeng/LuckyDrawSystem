import process from "node:process";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  buildIdleAuctionDisplay,
  buildIdleLuckyDrawDisplay,
  buildIdleMasterDisplay,
  ensurePrimaryDisplayScreen,
  publishMasterDisplaySelection,
  publishDisplayState,
} from "../modules/shared/services/display-state-service";

process.loadEnvFile?.();
const prisma = new PrismaClient();
type DbClient = Prisma.TransactionClient | PrismaClient;

const DEMO_EVENT_SLUG = "demo-event";
const DEMO_TICKETS = [
  { ticketNumber: "00001", participantName: "Alex Tan", participantPhone: "555-0101" },
  { ticketNumber: "00002", participantName: "Mira Lim", participantPhone: "555-0102" },
  { ticketNumber: "00003", participantName: "Jon Reyes", participantPhone: "555-0103" },
  { ticketNumber: "00004", participantName: "Sara Kim", participantPhone: "555-0104" },
  { ticketNumber: "00005", participantName: "Noah Cruz", participantPhone: "555-0105" },
  { ticketNumber: "00006", participantName: "Pia Santos", participantPhone: "555-0106" },
];
const DEMO_AUCTION_LOTS = [
  {
    lotNumber: "01",
    title: "Signed Guitar Bundle",
    displayTitle: "Signed Guitar Bundle",
    description: "Primary demo lot for opening bid, live bid, undo, and sold validation.",
    openingBid: 1000,
    orderIndex: 1,
    displayImageUrl: "/demo-media/auction-guitar.svg",
  },
  {
    lotNumber: "02",
    title: "Weekend Resort Stay",
    displayTitle: "Weekend Resort Stay",
    description: "Secondary demo lot for passed-state validation.",
    openingBid: 1500,
    orderIndex: 2,
    displayImageUrl: "/demo-media/auction-resort.svg",
  },
];
const DEMO_THEME_VARIANTS = [
  {
    name: "Broadcast Emerald",
    accentColor: "#34d399",
    backgroundImageUrl: "/demo-media/emerald-stage.svg",
    logoUrl: "/demo-media/stage-ops-logo.svg",
    overlayMode: false,
    displayStyle: "broadcast",
    motionProfile: "dynamic",
    backgroundFit: "cover",
    backgroundPosition: "center",
    overlayOpacity: 0.72,
    logoScale: 1,
    logoPosition: "top_right",
    contentAlignment: "left",
    showMetaPanel: true,
    showSceneLabel: true,
    panelStyle: "glass",
    heroImageBehavior: "poster",
  },
  {
    name: "Velvet Gold",
    accentColor: "#fbbf24",
    backgroundImageUrl: "/demo-media/gold-velvet.svg",
    logoUrl: "/demo-media/stage-ops-logo.svg",
    overlayMode: false,
    displayStyle: "cinematic",
    motionProfile: "calm",
    backgroundFit: "cover",
    backgroundPosition: "center",
    overlayOpacity: 0.78,
    logoScale: 0.94,
    logoPosition: "top_left",
    contentAlignment: "left",
    showMetaPanel: true,
    showSceneLabel: true,
    panelStyle: "solid",
    heroImageBehavior: "spotlight",
  },
  {
    name: "Glass Sunrise",
    accentColor: "#38bdf8",
    backgroundImageUrl: "/demo-media/sunrise-arena.svg",
    logoUrl: "/demo-media/stage-ops-logo.svg",
    overlayMode: true,
    displayStyle: "minimal",
    motionProfile: "dynamic",
    backgroundFit: "cover",
    backgroundPosition: "center",
    overlayOpacity: 0.6,
    logoScale: 0.9,
    logoPosition: "top_center",
    contentAlignment: "center",
    showMetaPanel: false,
    showSceneLabel: true,
    panelStyle: "minimal",
    heroImageBehavior: "background",
  },
] as const;

function buildThemePayload(variant: (typeof DEMO_THEME_VARIANTS)[number]) {
  return {
    backgroundType: "image" as const,
    backgroundImageUrl: variant.backgroundImageUrl,
    logoUrl: variant.logoUrl,
    accentColor: variant.accentColor,
    overlayMode: variant.overlayMode,
    fontSettings: {
      heading: "Space Grotesk",
      body: "Manrope",
    },
    textColorSettings: {
      primary: "#f8fafc",
      muted: "#cbd5e1",
      surfaceTint: "rgba(8, 15, 28, 0.72)",
    },
    layoutPreferences: {
      displayStyle: variant.displayStyle,
      motionProfile: variant.motionProfile,
      backgroundFit: variant.backgroundFit,
      backgroundPosition: variant.backgroundPosition,
      overlayOpacity: variant.overlayOpacity,
      logoScale: variant.logoScale,
      logoPosition: variant.logoPosition,
      contentAlignment: variant.contentAlignment,
      showMetaPanel: variant.showMetaPanel,
      showSceneLabel: variant.showSceneLabel,
      panelStyle: variant.panelStyle,
      heroImageBehavior: variant.heroImageBehavior,
    },
  };
}

async function ensureDemoThemes(db: DbClient, eventId: string) {
  const themes = [];

  for (const variant of DEMO_THEME_VARIANTS) {
    const existingTheme = await db.themePreset.findFirst({
      where: {
        eventId,
        name: variant.name,
      },
    });

    const payload = buildThemePayload(variant);
    const theme = existingTheme
      ? await db.themePreset.update({
          where: { id: existingTheme.id },
          data: {
            eventId,
            name: variant.name,
            ...payload,
          },
        })
      : await db.themePreset.create({
          data: {
            eventId,
            name: variant.name,
            ...payload,
          },
        });

    themes.push(theme);
  }

  return themes;
}

async function seedMediaAssets(db: DbClient, eventId: string) {
  await db.mediaAsset.deleteMany({
    where: {
      eventId,
    },
  });

  const assets = [
    { kind: "background" as const, publicUrl: "/demo-media/emerald-stage.svg", title: "Emerald Stage", tags: ["theme", "background"] },
    { kind: "background" as const, publicUrl: "/demo-media/gold-velvet.svg", title: "Velvet Gold", tags: ["theme", "background"] },
    { kind: "background" as const, publicUrl: "/demo-media/sunrise-arena.svg", title: "Sunrise Arena", tags: ["theme", "background"] },
    { kind: "logo" as const, publicUrl: "/demo-media/stage-ops-logo.svg", title: "Stage Ops Mark", tags: ["logo"] },
    { kind: "supporting" as const, publicUrl: "/demo-media/prize-scooter.svg", title: "Grand Prize Scooter", tags: ["prize", "doorprize"] },
    { kind: "supporting" as const, publicUrl: "/demo-media/auction-guitar.svg", title: "Signed Guitar Bundle", tags: ["auction", "lot"] },
    { kind: "supporting" as const, publicUrl: "/demo-media/auction-resort.svg", title: "Weekend Resort Stay", tags: ["auction", "lot"] },
  ];

  await db.mediaAsset.createMany({
    data: assets.map((asset) => ({
      eventId,
      kind: asset.kind,
      publicUrl: asset.publicUrl,
      metadata: {
        title: asset.title,
        altText: asset.title,
        width: 1200,
        height: 900,
        tags: asset.tags,
        focalPoint: { x: 0.5, y: 0.5 },
      },
    })),
  });
}

export async function seedDemoEvent(db: DbClient) {
  let event = await db.event.upsert({
    where: { slug: DEMO_EVENT_SLUG },
    update: {
      name: "Demo Gala Night",
      slug: DEMO_EVENT_SLUG,
      date: new Date("2026-08-15T19:00:00.000Z"),
      locale: "en-US",
      currencyCode: "USD",
      description: "Local demo event used for live route and module validation.",
      supportsAuction: true,
      supportsLuckyDraw: true,
      duplicatePolicy: "event",
      settings: {
        defaultMasterSource: "blank",
        activeMasterSource: "blank",
        requireActionConfirmations: true,
        persistLiveSelections: true,
        showRouteCopyButtons: true,
        fallbackPollingIntervalMs: 2500,
      },
      ticketFormat: {
        mode: "numeric",
        fixedLength: 5,
        minLength: 5,
        maxLength: 5,
        allowSeries: false,
        preserveLeadingZeros: true,
        prefix: "",
        regex: "",
      },
      archivedAt: null,
    },
    create: {
      name: "Demo Gala Night",
      slug: DEMO_EVENT_SLUG,
      date: new Date("2026-08-15T19:00:00.000Z"),
      locale: "en-US",
      currencyCode: "USD",
      description: "Local demo event used for live route and module validation.",
      supportsAuction: true,
      supportsLuckyDraw: true,
      duplicatePolicy: "event",
      settings: {
        defaultMasterSource: "blank",
        activeMasterSource: "blank",
        requireActionConfirmations: true,
        persistLiveSelections: true,
        showRouteCopyButtons: true,
        fallbackPollingIntervalMs: 2500,
      },
      ticketFormat: {
        mode: "numeric",
        fixedLength: 5,
        minLength: 5,
        maxLength: 5,
        allowSeries: false,
        preserveLeadingZeros: true,
        prefix: "",
        regex: "",
      },
    },
  });

  const themes = await ensureDemoThemes(db, event.id);
  const defaultTheme = themes[0];

  event = await db.event.update({
    where: { id: event.id },
    data: {
      defaultThemeId: defaultTheme.id,
    },
  });

  await seedMediaAssets(db, event.id);

  await db.auditLog.deleteMany({
    where: { eventId: event.id },
  });
  await db.bidEntry.deleteMany({
    where: { eventId: event.id },
  });
  await db.winner.deleteMany({
    where: { eventId: event.id },
  });
  await db.displayState.deleteMany({
    where: { eventId: event.id },
  });
  await db.displayScreen.deleteMany({
    where: { eventId: event.id },
  });
  await db.auctionLot.deleteMany({
    where: { eventId: event.id },
  });
  await db.auctionSession.deleteMany({
    where: { eventId: event.id },
  });
  await db.drawSession.deleteMany({
    where: { eventId: event.id },
  });
  await db.prizeCategory.deleteMany({
    where: { eventId: event.id },
  });
  await db.ticketPool.deleteMany({
    where: { eventId: event.id },
  });

  const prizeCategory = await db.prizeCategory.create({
    data: {
      eventId: event.id,
      name: "Grand Prize Scooter",
      quantity: 2,
      description: "Demo prize category for manual and digital-random reveal checks.",
      displayImageUrl: "/demo-media/prize-scooter.svg",
      displayMode: "grid",
      animationPreset: "fade_pop",
      animationSpeed: 1,
      specialThemeId: themes[1]?.id ?? defaultTheme.id,
      sortOrder: 0,
    },
  });

  const drawSession = await db.drawSession.create({
    data: {
      eventId: event.id,
      prizeCategoryId: prizeCategory.id,
      name: "Main Stage Draw",
      sessionOrder: 1,
      plannedWinnerCount: 2,
      actualWinnerCount: 0,
      lastRevealOrder: 0,
      layoutMode: "grid",
      gridItemCount: 12,
      revealMode: "digital_random",
      status: "draft",
    },
  });

  await db.ticketPool.createMany({
    data: DEMO_TICKETS.map((ticket) => ({
      eventId: event.id,
      ticketNumber: ticket.ticketNumber,
      participantName: ticket.participantName,
      participantPhone: ticket.participantPhone,
      eligible: true,
      used: false,
    })),
  });

  const auctionSession = await db.auctionSession.create({
    data: {
      eventId: event.id,
      name: "Main Auction Block",
      orderIndex: 1,
      status: "draft",
    },
  });

  for (const lot of DEMO_AUCTION_LOTS) {
    await db.auctionLot.create({
      data: {
        eventId: event.id,
        auctionSessionId: auctionSession.id,
        lotNumber: lot.lotNumber,
        title: lot.title,
        displayTitle: lot.displayTitle,
        description: lot.description,
        displayImageUrl: lot.displayImageUrl,
        openingBid: lot.openingBid,
        orderIndex: lot.orderIndex,
        incrementRule: {
          minIncrement: 100,
          freeInput: true,
        },
        themeOverrideId: themes[2]?.id ?? defaultTheme.id,
        status: "draft",
      },
    });
  }

  const luckyDrawScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "lucky_draw",
    themePresetId: defaultTheme.id,
  });
  const auctionScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "auction",
    themePresetId: defaultTheme.id,
  });
  const masterScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "master",
    themePresetId: defaultTheme.id,
    displayMode: "overlay",
  });

  await db.displayScreen.updateMany({
    where: {
      eventId: event.id,
      isPrimary: true,
    },
    data: {
      themePresetId: defaultTheme.id,
    },
  });

  await publishDisplayState(
    db,
    buildIdleLuckyDrawDisplay({
      eventId: event.id,
      eventSlug: event.slug,
      screenKey: luckyDrawScreen.screenKey,
      displayMode: luckyDrawScreen.displayMode,
      theme: themes[1] ?? defaultTheme,
      prizeName: prizeCategory.name,
    }),
  );
  await publishDisplayState(
    db,
    buildIdleAuctionDisplay({
      eventId: event.id,
      eventSlug: event.slug,
      screenKey: auctionScreen.screenKey,
      displayMode: auctionScreen.displayMode,
      theme: themes[2] ?? defaultTheme,
      currencyCode: event.currencyCode,
    }),
  );
  await publishDisplayState(
    db,
    buildIdleMasterDisplay({
      eventId: event.id,
      eventSlug: event.slug,
      screenKey: masterScreen.screenKey,
      displayMode: masterScreen.displayMode,
      theme: defaultTheme,
    }),
  );
  await publishMasterDisplaySelection(db, {
    eventId: event.id,
    source: "blank",
    displayMode: "overlay",
  });

  return {
    eventId: event.id,
    drawSessionId: drawSession.id,
    prizeCategoryId: prizeCategory.id,
    auctionSessionId: auctionSession.id,
  };
}

async function main() {
  const result = await seedDemoEvent(prisma);
  console.log(`Seeded demo event ${DEMO_EVENT_SLUG} (${result.eventId})`);
}

if (process.argv[1]?.includes("seed")) {
  main()
    .then(async () => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
