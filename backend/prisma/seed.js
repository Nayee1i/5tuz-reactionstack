// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование...');
  
  // Очистка БД в правильном порядке (сначала зависимые таблицы)
  console.log('🧹 Очищаем базу данных...');
  
  // 1. Сначала удаляем все связи и зависимые сущности
  await prisma.problem.deleteMany();
  await prisma.skillConfirmation.deleteMany();
  await prisma.meetingSkill.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingLink.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.learningPlan.deleteMany();
  await prisma.userSkill.deleteMany();
  
  // 2. ВАЖНО: Сначала удаляем отделы (они ссылаются на users через headId)
  await prisma.department.deleteMany();
  
  // 3. Теперь можно удалять пользователей
  await prisma.user.deleteMany();
  
  // 4. И направления
  await prisma.direction.deleteMany();
  
  console.log('✅ База данных очищена');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Создаем направления
  const directions = await Promise.all([
    prisma.direction.create({ data: { name: 'BACK' } }),
    prisma.direction.create({ data: { name: 'FRONT' } }),
    prisma.direction.create({ data: { name: 'QA' } }),
  ]);
  console.log('✅ Направления созданы');

  // 2. Создаем Админа (пока без отдела)
  const adminUser = await prisma.user.create({
    data: {
      login: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Администратор Системы',
      directionId: directions[0].id,
      isAdmin: true,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  // 3. Создаем корневой отдел и назначаем Админа главой
  const rootDepartment = await prisma.department.create({
    data: {
      name: 'Департамент Разработки',
      headId: adminUser.id,
    },
  });

  // 4. Привязываем Админа к отделу
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { departmentId: rootDepartment.id },
  });

  // 5. Создаем дочерние отделы
  const frontDept = await prisma.department.create({
    data: {
      name: 'Frontend Команда',
      parentId: rootDepartment.id,
      headId: adminUser.id,
    },
  });

  const backDept = await prisma.department.create({
    data: {
      name: 'Backend Команда',
      parentId: rootDepartment.id,
      headId: adminUser.id,
    },
  });

  // 6. Создаем руководителей и сотрудников
  const frontLead = await prisma.user.create({
    data: {
      login: 'front_lead',
      passwordHash: hashedPassword,
      fullName: 'Анна Петрова',
      directionId: directions[1].id,
      departmentId: frontDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  // Назначаем Анну главой Frontend отдела
  await prisma.department.update({
    where: { id: frontDept.id },
    data: { headId: frontLead.id },
  });

  const employee1 = await prisma.user.create({
    data: {
      login: 'employee1',
      passwordHash: hashedPassword,
      fullName: 'Иван Иванов',
      directionId: directions[1].id,
      departmentId: frontDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      login: 'employee2',
      passwordHash: hashedPassword,
      fullName: 'Сергей Сидоров',
      directionId: directions[0].id,
      departmentId: backDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  console.log('✅ Сидирование завершено!');
  console.log('👤 Admin: login="admin", password="123456"');
  console.log('👤 Front Lead: login="front_lead", password="123456"');
  console.log('👤 Employee 1: login="employee1", password="123456"');
  console.log('👤 Employee 2: login="employee2", password="123456"');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });