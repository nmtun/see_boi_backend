import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);

  await prisma.user.createMany({
    data: [
      {
        fullName: 'Nguyen admin',
        userName: 'admin',
        email: 'admin@gmail.com',
        password,
        role: 'ADMIN',
      },
      {
        fullName: 'Nguyen Van A',
        userName: 'user_a',
        email: 'a@gmail.com',
        password,
      },
      {
        fullName: 'Tran Thi B',
        userName: 'user_b',
        email: 'b@gmail.com',
        password,
      },
      {
        fullName: 'Le Van C',
        userName: 'user_c',
        email: 'c@gmail.com',
        password,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded users successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());