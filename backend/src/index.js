require('dotenv').config(); // Читаем .env файл (добавь в самое начало, если нет)

const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth'); // <-- ДОБАВЬ ЭТУ СТРОКУ (Импорт нашего auth.js)

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Заглушка для кейса
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// <-- ДОБАВЬ ЭТУ СТРОКУ (Говорим серверу: все запросы на /api/auth/ отправляй в authRoutes)
app.use('/api/auth', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});