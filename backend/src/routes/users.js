import express from 'express';
import { prisma } from '../db.js';

const router = express.Router();

// Получить всех пользователей с их направлениями и отделами
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        direction: true,
        department: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить пользователя по ID
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        direction: true,
        department: true,
        learningPlans: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Войти (проверка логина)
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { login: login },
      include: {
        direction: true,
        department: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // TODO: Добавить проверку пароля с bcrypt
    
    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        login: user.login,
        full_name: user.fullName,
        is_admin: user.isAdmin,
        direction: user.direction,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;