import { prisma } from "@/lib/prisma";

export async function getWorkspaceSnapshot(selectedEventId?: string) {
  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
    },
    orderBy: [{ date: "desc" }, { name: "asc" }],
    include: {
      defaultTheme: true,
      _count: {
        select: {
          prizeCategories: true,
          drawSessions: true,
          winners: true,
          auctionLots: true,
          bidEntries: true,
        },
      },
    },
  });

  const resolvedEventId = selectedEventId ?? events[0]?.id;
  if (!resolvedEventId) {
    return {
      events,
      selectedEvent: null,
      displayStates: [],
    };
  }

  const selectedEvent = await prisma.event.findUnique({
    where: {
      id: resolvedEventId,
    },
    include: {
      defaultTheme: true,
      themes: {
        orderBy: {
          updatedAt: "desc",
        },
      },
      mediaAssets: {
        orderBy: {
          createdAt: "desc",
        },
      },
      displayScreens: {
        orderBy: [
          { moduleType: "asc" },
          { createdAt: "asc" },
        ],
      },
      prizeCategories: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          specialTheme: true,
          drawSessions: {
            orderBy: {
              sessionOrder: "asc",
            },
            include: {
              winners: {
                where: {
                  status: {
                    in: ["revealed", "confirmed"],
                  },
                },
                orderBy: {
                  revealOrder: "desc",
                },
                take: 6,
              },
            },
          },
          winners: {
            where: {
              status: {
                in: ["revealed", "confirmed"],
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          },
        },
      },
      ticketPool: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      auctionSessions: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      auctionLots: {
        orderBy: {
          orderIndex: "asc",
        },
        include: {
          themeOverride: true,
          auctionSession: true,
          bids: {
            where: {
              voidedAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          },
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      },
      chatMessages: {
        orderBy: [
          { createdAt: "desc" },
          { updatedAt: "desc" },
        ],
        take: 50,
      },
      chatBans: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  const displayStates = selectedEvent
    ? await prisma.displayState.findMany({
        where: {
          eventId: selectedEvent.id,
        },
        include: {
          screen: true,
        },
        orderBy: {
          syncedAt: "desc",
        },
      })
    : [];

  return {
    events,
    selectedEvent,
    displayStates,
  };
}

