// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Создаем направление
  const direction = await prisma.direction.upsert({
    where: { name: 'Разработка' },
    update: {},
    create: { name: 'Разработка' },
  });

  // 2. Создаем Админа БЕЗ отдела (теперь departmentId может быть null)
  const adminUser = await prisma.user.create({
    data: {
      login: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Администратор Системы',
      directionId: direction.id,
      // departmentId намеренно не указываем, он будет null
      isAdmin: true,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  // 3. Создаем отдел и сразу назначаем Админа его главой (headId)
  const department = await prisma.department.create({
    data: {
      name: 'Основной отдел',
      headId: adminUser.id, 
    },
  });

  // 4. Обновляем Админа, привязывая его к созданному отделу
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { departmentId: department.id },
  });

  // 5. Создаем обычного сотрудника и сразу привязываем к направлению и отделу
  await prisma.user.create({
    data: {
      login: 'employee',
      passwordHash: hashedPassword,
      fullName: 'Иван Иванов',
      directionId: direction.id,
      departmentId: department.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  console.log('✅ Сидирование завершено!');
  console.log('👤 Admin: login="admin", password="123456"');
  console.log('👤 Employee: login="employee", password="123456"');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });