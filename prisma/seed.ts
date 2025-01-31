import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Define roles
  const roles = [
    { name: 'ADMIN', description: 'System administrator with full access' },
    { name: 'USER', description: 'Standard user with limited access' },
    { name: 'MANAGER', description: 'Moderates user content' },
    { name: 'STORE_KEEPER', description: 'Manages product stocks' }, // Fixed hyphen to underscore
  ];

  const admin = {
    email: 'admin@minishop.io',
    password:
      '$argon2id$v=19$m=65536,t=3,p=4$cl607qz8cgXMUM+S1nux6Q$h/I2Lv8jl2yQiCFBFO61+9qGn+Si13UKhE8Tc2vAjDc',
  };

  // Create all roles first and store the admin role ID
  let adminRoleId: string | undefined;

  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description }, // Added description update
      create: role,
    });

    // Store the admin role ID specifically
    if (role.name === 'ADMIN') {
      adminRoleId = createdRole.publicId;
    }
  }

  // Verify admin role was created
  if (!adminRoleId) {
    throw new Error('Admin role was not created successfully');
  }

  // Create admin user
  const createdAdmin = await prisma.user.upsert({
    where: { email: admin.email },
    update: { password: admin.password },
    create: {
      ...admin,
      isEnabled: true,
    },
  });

  // Link admin user to admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: createdAdmin.publicId,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: createdAdmin.publicId,
      roleId: adminRoleId,
    },
  });

  console.log('Roles & Admin User seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1); // Exit with error code
  })
  .finally(async () => {
    await prisma.$disconnect(); // Made disconnect async
  });
