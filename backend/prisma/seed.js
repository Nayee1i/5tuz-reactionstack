const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Или используйте ваш метод хеширования

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование...');

  // 1. Создаем направления (если их нет)
  const frontDir = await prisma.directions.upsert({
    where: { name: 'FRONT' }, // Убедитесь, что поле называется name или как у вас в схеме
    update: {},
    create: { name: 'FRONT' },
  });

  // 2. Создаем подразделение
  const dept = await prisma.departments.upsert({
    where: { name: 'Frontend Department' },
    update: {},
    create: { name: 'Frontend Department', direction_id: frontDir.id },
  });

  // 3. Хэшируем пароль (например, '1234')
  const hashedPassword = await bcrypt.hash('1234', 10);

  // 4. Создаем Админа
  await prisma.users.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password_hash: hashedPassword,
      full_name: 'Иван Админов',
      is_admin: true,
      is_active: true,
      department_id: dept.id,
    },
  });

  // 5. Создаем Тимлида (у него будут подчиненные)
  const lead = await prisma.users.upsert({
    where: { login: 'lead' },
    update: {},
    create: {
      login: 'lead',
      password_hash: hashedPassword,
      full_name: 'Петр Тимлидов',
      is_admin: false,
      is_active: true,
      department_id: dept.id,
      manager_id: null, // Или ID админа, если требуется
    },
  });

  // 6. Создаем Разработчика (подчиненный тимлида)
  await prisma.users.upsert({
    where: { login: 'dev' },
    update: {},
    create: {
      login: 'dev',
      password_hash: hashedPassword,
      full_name: 'Алексей Разрабов',
      is_admin: false,
      is_active: true,
      department_id: dept.id,
      manager_id: lead.id, // Привязываем к тимлиду!
    },
  });

  console.log('✅ Сидирование завершено!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });