// backend/src/api/user.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// GET /api/users - Получение списка пользователей с фильтрацией
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { search, directionId, departmentId } = req.query;
    
    const where = {
      isActive: true,
      ...(search && { fullName: { contains: search, mode: 'insensitive' } }),
      ...(directionId && { directionId }),
      ...(departmentId && { departmentId }),
    };

    const users = await prisma.user.findMany({
      where,
      include: {
        direction: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        managedDepartments: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' }
    });

    // Форматируем ответ для удобного использования на фронтенде
    const formattedUsers = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      direction: u.direction?.name || 'Не указано',
      directionId: u.directionId,
      departmentId: u.departmentId,
      departmentName: u.department?.name || 'Не назначено',
      isAdmin: u.isAdmin,
      managedDepartments: u.managedDepartments,
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении пользователей' });
  }
});

// ==========================================
// POST /api/users - Создание нового пользователя
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { login, password, fullName, directionId, departmentId, isAdmin } = req.body;
    
    if (!login || !password || !fullName || !directionId) {
      return res.status(400).json({ error: 'Логин, пароль, ФИО и направление обязательны' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        login,
        passwordHash,
        fullName,
        directionId,
        departmentId: departmentId || null,
        isAdmin: isAdmin || false,
        sessionToken: crypto.randomBytes(32).toString('hex'),
      },
      include: { 
        direction: { select: { name: true } }, 
        department: { select: { name: true } } 
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    if (error.code === 'P2002') { // Unique constraint failed
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }
    res.status(500).json({ error: 'Ошибка сервера при создании пользователя' });
  }
});

// ==========================================
// PUT /api/users/:id - Обновление пользователя
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, directionId, departmentId, isAdmin } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        fullName, 
        directionId, 
        departmentId: departmentId || null, 
        isAdmin 
      },
      include: { 
        direction: { select: { name: true } }, 
        department: { select: { name: true } } 
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(500).json({ error: 'Ошибка сервера при обновлении пользователя' });
  }
});

// ==========================================
// DELETE /api/users/:id - Удаление (деактивация) пользователя
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Проверка: является ли пользователь руководителем какого-либо отдела
    const managedDepts = await prisma.department.findMany({ 
      where: { headId: id },
      select: { name: true }
    });
    
    if (managedDepts.length > 0) {
      return res.status(400).json({ 
        error: `Нельзя удалить пользователя, так как он является руководителем отделов: ${managedDepts.map(d => d.name).join(', ')}. Сначала назначьте другого руководителя.` 
      });
    }

    // 2. Мягкое удаление (меняем isActive на false), чтобы не ломать исторические данные встреч и планов
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Пользователь успешно деактивирован' });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(500).json({ error: 'Ошибка сервера при удалении пользователя' });
  }
});

module.exports = router;