// routes/auth.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: 'Введите логин и пароль' });
    }

    const user = await prisma.user.findUnique({
      where: { login },
      include: { 
        direction: { select: { name: true } }, 
        department: { select: { name: true } } 
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    // Генерируем простой случайный токен
    const newSessionToken = crypto.randomBytes(32).toString('hex');
    
    // Сохраняем токен в БД
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        sessionToken: newSessionToken,
        authVersion: { increment: 1 }
      }
    });

    // Убираем чувствительные данные из ответа
    const { passwordHash, sessionToken, ...userWithoutPassword } = user;

    res.json({
      token: newSessionToken,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
});

// Простой logout (обнуляем токен)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      await prisma.user.updateMany({
        where: { sessionToken: token },
        data: { sessionToken: null }
      });
    }
    res.json({ message: 'Вы вышли из системы' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка выхода' });
  }
});

module.exports = router;