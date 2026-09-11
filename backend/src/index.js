// backend/src/index.js
// import meetingsRouter from './api/routes/meetings.js';


const express = require('express');
const cors = require('cors');
const usersRoutes = require('./routes/users'); // <-- ДОБАВИТЬ
const authRoutes = require('./routes/auth'); // <-- ДОБАВИТЬ

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// app.use('/api/meetings', meetingsRouter);
app.use('/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Подключаем авторизацию <-- ДОБАВИТЬ
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});