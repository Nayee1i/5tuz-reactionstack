// backend/src/index.js
// import meetingsRouter from './api/routes/meetings.js';


const express = require('express');
const cors = require('cors');
const usersRoutes = require('./api/user'); // <-- ДОБАВИТЬ
const authRoutes = require('./routes/auth'); // <-- ДОБАВИТЬ
const path = require('path');
const miscRouter = require('./api/misc'); // <-- ДОБАВИТЬ ЭТО
const skillsRouter = require('./src/api/skills');



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
app.use('/api', miscRouter);
app.use('/api/skills', skillsRouter);



app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});