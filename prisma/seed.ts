/**
 * HealthPilot ERP — Seed script (Phase 1)
 * Run: npm run db:seed
 *
 * Creates:
 *  - 1 Item  : Insulin Glargine 100 IU/ml
 *  - 1 Supplier: MediSupply Pharmaceuticals Pvt. Ltd.
 *  - 4 Locations: Central Warehouse + Branch A/B/C
 *  - 5 Users (one per role)
 *  Opening stock = 0 everywhere (no ledger entries)
 */

import { PrismaClient, LocationType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding HealthPilot ERP…');

  // ── Item ──────────────────────────────────────────────────────────────────
  const insulinGlargine = await prisma.item.upsert({
    where: { code: 'ITEM-IG-001' },
    update: {},
    create: {
      code: 'ITEM-IG-001',
      name: 'Insulin Glargine 100 IU/ml',
      unit: 'Vial',
      purchaseCost: 500.0,
      taxPct: 5.0,
      refrigerated: true
    }
  });
  console.log('  ✔  Item:', insulinGlargine.name);

  // ── Supplier ──────────────────────────────────────────────────────────────
  const mediSupply = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {},
    create: {
      code: 'SUP-001',
      name: 'MediSupply Pharmaceuticals Pvt. Ltd.'
    }
  });
  console.log('  ✔  Supplier:', mediSupply.name);

  // ── Locations ─────────────────────────────────────────────────────────────
  const central = await prisma.location.upsert({
    where: { code: 'LOC-CENTRAL' },
    update: {},
    create: {
      code: 'LOC-CENTRAL',
      name: 'Central Pharmacy Warehouse',
      type: LocationType.WAREHOUSE
    }
  });

  const branchA = await prisma.location.upsert({
    where: { code: 'LOC-BRA' },
    update: {},
    create: {
      code: 'LOC-BRA',
      name: 'Branch A',
      type: LocationType.BRANCH
    }
  });

  const branchB = await prisma.location.upsert({
    where: { code: 'LOC-BRB' },
    update: {},
    create: {
      code: 'LOC-BRB',
      name: 'Branch B',
      type: LocationType.BRANCH
    }
  });

  const branchC = await prisma.location.upsert({
    where: { code: 'LOC-BRC' },
    update: {},
    create: {
      code: 'LOC-BRC',
      name: 'Branch C',
      type: LocationType.BRANCH
    }
  });

  console.log(
    '  ✔  Locations:',
    [central, branchA, branchB, branchC].map((l) => l.name).join(', ')
  );

  // ── Users (one per role) ──────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { code: 'USR-ADMIN' },
      update: {},
      create: {
        code: 'USR-ADMIN',
        name: 'Admin User',
        role: UserRole.ADMIN
      }
    }),
    prisma.user.upsert({
      where: { code: 'USR-PM' },
      update: {},
      create: {
        code: 'USR-PM',
        name: 'Purchase Manager',
        role: UserRole.PURCHASE_MANAGER
      }
    }),
    prisma.user.upsert({
      where: { code: 'USR-SK' },
      update: {},
      create: {
        code: 'USR-SK',
        name: 'Store Keeper',
        role: UserRole.STORE_KEEPER
      }
    }),
    prisma.user.upsert({
      where: { code: 'USR-RX' },
      update: {},
      create: {
        code: 'USR-RX',
        name: 'Pharmacist',
        role: UserRole.PHARMACIST
      }
    }),
    prisma.user.upsert({
      where: { code: 'USR-AC' },
      update: {},
      create: {
        code: 'USR-AC',
        name: 'Accounts Officer',
        role: UserRole.ACCOUNTS
      }
    })
  ]);
  console.log('  ✔  Users:', users.map((u) => `${u.name} (${u.role})`).join(', '));

  console.log('\n✅  Seed complete — opening stock = 0 everywhere.');
  console.log('   Item ID     :', insulinGlargine.id);
  console.log('   Supplier ID :', mediSupply.id);
  console.log('   Central ID  :', central.id);
  console.log('   Branch A ID :', branchA.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
