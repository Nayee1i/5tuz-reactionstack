// backend/src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ message: 'Введите логин и пароль' });
    }

    // Используем $queryRaw для проверки пароля через pgcrypto (bcrypt) прямо в БД.
    // Это безопаснее и избавляет от установки лишних npm-пакетов.
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

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Получаем пользователя через стандартные методы Prisma
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

module.exports = router;