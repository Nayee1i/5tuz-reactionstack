// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем сидирование...');
  
  console.log('🧹 Очищаем базу данных...');
  await prisma.problem.deleteMany();
  await prisma.skillConfirmation.deleteMany();
  await prisma.meetingSkill.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingLink.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.learningPlan.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
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

  // 2. Создаем Админа
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

  // 3. Создаем корневой отдел
  const rootDepartment = await prisma.department.create({
    data: {
      name: 'Департамент Разработки',
      headId: adminUser.id,
    },
  });

  await prisma.user.update({
    where: { id: adminUser.id },
    data: { departmentId: rootDepartment.id },
  });

  // 4. Создаем дочерние отделы (Frontend, Backend, QA)
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

  // 5. Создаем руководителей команд
  const frontLead = await prisma.user.create({
    data: {
      login: 'front_lead',
      passwordHash: hashedPassword,
      fullName: 'Анна Петрова',
      directionId: directions[1].id, // FRONT
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
      directionId: directions[0].id, // BACK
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
      directionId: directions[2].id, // QA
      departmentId: qaDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });
  await prisma.department.update({ where: { id: qaDept.id }, data: { headId: qaLead.id } });

  // 6. Создаем обычных сотрудников
  await prisma.user.create({
    data: {
      login: 'employee1',
      passwordHash: hashedPassword,
      fullName: 'Иван Иванов',
      directionId: directions[1].id, // FRONT
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
      directionId: directions[0].id, // BACK
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
      directionId: directions[2].id, // QA
      departmentId: qaDept.id,
      isAdmin: false,
      sessionToken: crypto.randomBytes(32).toString('hex'),
    },
  });

  console.log('✅ Сидирование завершено!');
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