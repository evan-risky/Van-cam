import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/crypto";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur");

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@vanrycam.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "vanrycam-admin";
  const adminName = process.env.ADMIN_NAME ?? "Penyelenggara";

  const organization = await prisma.organization.upsert({
    where: { id: "org_vanry_demo" },
    update: { name: "Vanry Cam" },
    create: { id: "org_vanry_demo", name: "Vanry Cam" },
  });

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: hashPassword(adminPassword),
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: "owner" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
    },
  });

  await prisma.event.upsert({
    where: { slug: "evan-inri" },
    update: {
      name: "Kamera Disposable Evan & Inri",
      couple: "Evan & Inri",
      location: "Muara Teweh",
      dateLabel: "Rabu, 18 November 2026",
      year: 2026,
    },
    create: {
      organizationId: organization.id,
      name: "Kamera Disposable Evan & Inri",
      slug: "evan-inri",
      couple: "Evan & Inri",
      location: "Muara Teweh",
      dateLabel: "Rabu, 18 November 2026",
      year: 2026,
    },
  });

  console.log(`Seed selesai. Admin: ${adminEmail}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});