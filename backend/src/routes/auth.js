// backend/src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

const router = express.Router();

// Middleware для проверки, что пользователь — администратор
const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Доступ запрещен. Требуется роль администратора.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный или истекший токен' });
  }
};

// ==========================================
// 1. POST /api/auth/login (Вход в систему)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ message: 'Введите логин и пароль' });
    }

    // Используем $queryRaw для проверки пароля через pgcrypto (bcrypt) прямо в БД.
    // Это избавляет от необходимости устанавливать npm-пакет bcryptjs.
    const users = await prisma.$queryRaw`
      SELECT id, login, password_hash, full_name, is_admin, is_active 
      FROM pr.users 
      WHERE login = ${login.toLowerCase().trim()} 
      AND password_hash = public.crypt(${password}, password_hash)
    `;

    if (users.length === 0) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Пользователь деактивирован' });
    }

    // Генерируем JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        login: user.login, 
        isAdmin: user.is_admin 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        fullName: user.full_name,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Ошибка сервера при авторизации' });
  }
});

// ==========================================
// 2. GET /api/auth/me (Текущий пользователь)
// ==========================================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        login: true,
        full_name: true,
        is_admin: true,
        is_active: true,
      }
    });

    if (!user || !user.is_active) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      login: user.login,
      fullName: user.full_name,
      isAdmin: user.is_admin,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ message: 'Неверный или истекший токен' });
  }
});

// ==========================================
// 3. POST /api/auth/register (Создание пользователя, только для админов)
// ==========================================
router.post('/register', verifyAdmin, async (req, res) => {
  try {
    const { login, password, fullName, directionId, departmentId } = req.body;

    if (!login || !password || !fullName) {
      return res.status(400).json({ message: 'Введите логин, пароль и ФИО' });
    }

    // Ограничение pgcrypto (bcrypt): пароль от 12 до 72 байт
    if (password.length < 12 || password.length > 72) {
      return res.status(400).json({ message: 'Пароль должен быть от 12 до 72 символов' });
    }

    // Проверка на уникальность логина
    const existingUser = await prisma.$queryRaw`
      SELECT id FROM pr.users WHERE login = ${login.toLowerCase().trim()}
    `;
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Пользователь с таким логином уже существует' });
    }

    // Если фронт не передал направление/подразделение, берем первые попавшиеся из БД
    let finalDirectionId = directionId;
    let finalDepartmentId = departmentId;

    if (!finalDirectionId) {
      const dir = await prisma.$queryRaw`SELECT id FROM pr.directions WHERE archived_at IS NULL LIMIT 1`;
      if (dir.length > 0) finalDirectionId = dir[0].id;
    }
    if (!finalDepartmentId) {
      const dep = await prisma.$queryRaw`SELECT id FROM pr.departments LIMIT 1`;
      if (dep.length > 0) finalDepartmentId = dep[0].id;
    }

    if (!finalDirectionId || !finalDepartmentId) {
      return res.status(400).json({ message: 'Не удалось определить направление или подразделение. Укажите их явно.' });
    }

    // Создаем пользователя (хешируем пароль прямо в БД через pgcrypto)
    const newUser = await prisma.$queryRaw`
      INSERT INTO pr.users (login, password_hash, full_name, direction_id, department_id, is_admin, is_active)
      VALUES (
        ${login.toLowerCase().trim()}, 
        public.crypt(${password}, public.gen_salt('bf', 12)), 
        ${fullName.trim()}, 
        ${finalDirectionId}, 
        ${finalDepartmentId}, 
        false, 
        true
      )
      RETURNING id, login, full_name, is_admin;
    `;

    const user = newUser[0];

    res.status(201).json({
      message: 'Пользователь успешно создан',
      user: {
        id: user.id,
        login: user.login,
        fullName: user.full_name,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
});

module.exports = router;