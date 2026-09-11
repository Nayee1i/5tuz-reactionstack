// backend/src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. Импортируем роутеры
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users'); // <-- Подключаем реальный роутер пользователей

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Раздача аватарок (если нужно)
app.use('/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));

// 2. Подключаем роутеры (ПОРЯДОК ВАЖЕН!)
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes); // <-- Теперь запросы пойдут сюда, а не в заглушку

// Проверка работоспособности
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});