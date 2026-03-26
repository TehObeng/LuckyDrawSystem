import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.upsert({
    where: { slug: "demo-event" },
    update: {},
    create: {
      name: "Demo Gala Night",
      slug: "demo-event",
      date: new Date(),
      ticketFormat: {
        mode: "numeric",
        fixedLength: 5,
        allowSeries: false,
        preserveLeadingZeros: true,
      },
      duplicatePolicy: "event",
      supportsAuction: true,
      supportsLuckyDraw: true,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
