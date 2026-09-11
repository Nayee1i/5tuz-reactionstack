// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование...');
  console.log('🧹 Очищаем базу данных (в строгом порядке зависимостей)...');
  
  // ВАЖНО: Порядок удаления имеет значение! Сначала удаляем то, что ссылается на другие таблицы.
  await prisma.problem.deleteMany();
  await prisma.skillConfirmation.deleteMany();
  await prisma.meetingSkill.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingLink.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.learningPlan.deleteMany();
  await prisma.userSkill.deleteMany();
  
  await prisma.skill.deleteMany();          // 1. Скиллы (ссылаются на direction)
  await prisma.department.deleteMany();     // 2. Отделы (ссылаются на user через headId!)
  await prisma.user.deleteMany();           // 3. Пользователи (теперь безопасно, т.к. отделы удалены)
  await prisma.direction.deleteMany();      // 4. Направления (ни на что не ссылаются)
  
  console.log('✅ База данных очищена');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Создаем направления
  const directions = await Promise.all([
    prisma.direction.create({ data: { name: 'BACK' } }),
    prisma.direction.create({ data: { name: 'FRONT' } }),
    prisma.direction.create({ data: { name: 'QA' } }),
  ]);
  console.log('✅ Направления созданы');

  // 2. Создаем справочник навыков
  const backDir = directions.find(d => d.name === 'BACK');
  const frontDir = directions.find(d => d.name === 'FRONT');
  const qaDir = directions.find(d => d.name === 'QA');

  const skillsToCreate = [
    { name: 'Node.js', description: 'Разработка серверной логики, Express, NestJS', directionId: backDir.id },
    { name: 'PostgreSQL', description: 'Проектирование схем БД, сложные SQL-запросы, оптимизация', directionId: backDir.id },
    { name: 'React', description: 'Hooks, Context API, оптимизация рендеринга', directionId: frontDir.id },
    { name: 'TypeScript', description: 'Строгая типизация, дженерики, utility types', directionId: frontDir.id },
    { name: 'Jest / Testing Library', description: 'Unit и интеграционное тестирование JS/TS кода', directionId: qaDir.id },
    { name: 'Cypress / Playwright', description: 'Написание и поддержка E2E тестов веб-приложений', directionId: qaDir.id },
  ];

  for (const skillData of skillsToCreate) {
    await prisma.skill.create({ data: skillData });
  }
  console.log('✅ Справочник навыков заполнен');

  // 3. Создаем Админа (пока без departmentId, чтобы избежать циклической зависимости при создании)
  const adminUser = await prisma.user.create({
    data: {
      login: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Администратор Системы',
      directionId: backDir.id,
      isAdmin: true,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  // 4. Создаем корневой отдел и назначаем админа руководителем
  const rootDepartment = await prisma.department.create({
    data: {
      name: 'Департамент Разработки',
      headId: adminUser.id,
    },
  });
  
  // Привязываем админа к отделу
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { departmentId: rootDepartment.id },
  });

  // 5. Создаем дочерние отделы
  const frontDept = await prisma.department.create({
    data: { name: 'Frontend Команда', parentId: rootDepartment.id, headId: adminUser.id },
  });
  const backDept = await prisma.department.create({
    data: { name: 'Backend Команда', parentId: rootDepartment.id, headId: adminUser.id },
  });
  const qaDept = await prisma.department.create({
    data: { name: 'QA Команда', parentId: rootDepartment.id, headId: adminUser.id },
  });
  console.log('✅ Подразделения созданы');

  // 6. Создаем руководителей команд и сразу обновляем отделы
  const frontLead = await prisma.user.create({
    data: {
      login: 'front_lead',
      passwordHash: hashedPassword,
      fullName: 'Анна Петрова',
      directionId: frontDir.id,
      departmentId: frontDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.department.update({ where: { id: frontDept.id }, data: { headId: frontLead.id } });

  const backLead = await prisma.user.create({
    data: {
      login: 'back_lead',
      passwordHash: hashedPassword,
      fullName: 'Дмитрий Смирнов',
      directionId: backDir.id,
      departmentId: backDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.department.update({ where: { id: backDept.id }, data: { headId: backLead.id } });

  const qaLead = await prisma.user.create({
    data: {
      login: 'qa_lead',
      passwordHash: hashedPassword,
      fullName: 'Елена Волкова',
      directionId: qaDir.id,
      departmentId: qaDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.department.update({ where: { id: qaDept.id }, data: { headId: qaLead.id } });

  // 7. Создаем обычных сотрудников
  await prisma.user.create({
    data: {
      login: 'employee1',
      passwordHash: hashedPassword,
      fullName: 'Иван Иванов',
      directionId: frontDir.id,
      departmentId: frontDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.user.create({
    data: {
      login: 'employee2',
      passwordHash: hashedPassword,
      fullName: 'Сергей Сидоров',
      directionId: backDir.id,
      departmentId: backDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.user.create({
    data: {
      login: 'employee3',
      passwordHash: hashedPassword,
      fullName: 'Мария Кузнецова',
      directionId: qaDir.id,
      departmentId: qaDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  console.log('✅ Сидирование успешно завершено!');
  console.log('👤 Admin: login="admin", password="123456"');
  console.log('👤 Front Lead: login="front_lead", password="123456"');
  console.log('👤 Back Lead: login="back_lead", password="123456"');
  console.log('👤 QA Lead: login="qa_lead", password="123456"');
  console.log('👤 Employees: login="employee1", "employee2", "employee3" (password: "123456")');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });