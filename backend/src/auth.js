const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Секретный ключ для создания "пропусков" (токенов)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_skillflow_hackathon_2026';

// 🟢 1. РЕГИСТРАЦИЯ (Создание нового пользователя)
router.post('/register', async (req, res) => {
  try {
    const { login, password, full_name } = req.body;

    if (!login || !password || !full_name) {
      return res.status(400).json({ error: 'Заполни все поля (login, password, full_name)' });
    }

    // Проверяем, нет ли уже такого пользователя
    const existingUser = await prisma.user.findUnique({ where: { login } });
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    // Шифруем пароль (10 - это уровень сложности шифрования)
    const password_hash = await bcrypt.hash(password, 10);

    // Создаем пользователя в базе
    const user = await prisma.user.create({
      data: { login, password_hash, full_name },
    });

    res.status(201).json({ message: 'Успешная регистрация!', userId: user.id });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 🔵 2. ВХОД (Проверка логина и пароля)
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    // Ищем пользователя в базе
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Сравниваем введенный пароль с зашифрованным в базе
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Если пароль верный, выдаем "электронный пропуск" (JWT токен)
    const token = jwt.sign(
      { userId: user.id, login: user.login, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' } // Токен живет 24 часа
    );

    // Отдаем токен и базовую инфо о пользователе фронту
    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        full_name: user.full_name,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;