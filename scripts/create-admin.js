// scripts/create-admin.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const adminEnvPath = path.join(__dirname, '..', 'admin.env');
if (!fs.existsSync(adminEnvPath)) {
  console.error('❌ Файл admin.env не найден в корне проекта.');
  console.error('Скопируйте admin.env.example в admin.env и заполните данные.');
  process.exit(1);
}

// Парсим admin.env
const adminEnvContent = fs.readFileSync(adminEnvPath, 'utf-8');
const adminConfig = {};
adminEnvContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    adminConfig[match[1].trim()] = match[2].trim();
  }
});

const { ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_FULL_NAME } = adminConfig;

if (!ADMIN_LOGIN || !ADMIN_PASSWORD || !ADMIN_FULL_NAME) {
  console.error('❌ В admin.env не хватает ADMIN_LOGIN, ADMIN_PASSWORD или ADMIN_FULL_NAME');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 72) {
  console.error('❌ ADMIN_PASSWORD должен быть от 12 до 72 байт (требование pgcrypto).');
  process.exit(1);
}

async function setupAdmin() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Обновляем логин, пароль и ФИО для базового админа из seed-скрипта
    const query = `
      UPDATE pr.users 
      SET login = $1, 
          password_hash = public.crypt($2, public.gen_salt('bf', 12)),
          full_name = $3
      WHERE id = '20000000-0000-0000-0000-000000000001'
      RETURNING id, login, full_name;
    `;
    
    const res = await client.query(query, [
      ADMIN_LOGIN.toLowerCase().trim(),
      ADMIN_PASSWORD,
      ADMIN_FULL_NAME
    ]);

    if (res.rowCount === 0) {
      console.error('❌ Админ не найден в БД. Сначала запустите 001_schema.sql и 002_seed.sql.');
      process.exit(1);
    }

    console.log('✅ Данные администратора успешно обновлены из admin.env:');
    console.log(`   Логин: ${res.rows[0].login}`);
    console.log(`   ФИО:   ${res.rows[0].full_name}`);
  } catch (err) {
    console.error('❌ Ошибка при обновлении админа:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupAdmin();