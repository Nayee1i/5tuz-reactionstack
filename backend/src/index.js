// backend/src/index.js
import meetingsRouter from './api/routes/meetings.js';


const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth'); // <-- ДОБАВИТЬ

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/meetings', meetingsRouter);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Подключаем авторизацию <-- ДОБАВИТЬ
app.use('/api/auth', authRoutes);

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});