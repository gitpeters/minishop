import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: 'ADMIN', description: 'System administrator with full access' },
    { name: 'USER', description: 'Standard user with limited access' },
    { name: 'MANAGER', description: 'Moderates user content' },
    { name: 'STORE-KEEPER', description: 'Manages product stocks' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('Roles seeded successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
