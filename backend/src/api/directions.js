const express = require('express');
const router = express.Router();
const { prisma } = require('../db.js'); // Убедитесь, что путь к вашему экземпляру prisma верный

// ============================================================
// НАПРАВЛЕНИЯ (DIRECTIONS)
// ============================================================

// 1. GET /api/directions - Получить все активные направления
router.get('/', async (req, res) => {
  try {
    const directions = await prisma.direction.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true } // Возвращаем только то, что нужно фронтенду
    });
    res.json(directions);
  } catch (error) {
    console.error('GET /api/directions error:', error);
    res.status(500).json([]); // 🛡️ Возвращаем пустой массив при ошибке, чтобы фронт не падал
  }
});

// 2. POST /api/directions - Создать направление
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название направления обязательно' });

    const newDirection = await prisma.direction.create({
      data: { name: name.toUpperCase().trim() }
    });
    res.status(201).json(newDirection);
  } catch (error) {
    console.error('POST /api/directions error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Такое направление уже существует' });
    res.status(500).json({ error: 'Ошибка создания направления' });
  }
});

// 3. DELETE /api/directions/:id - Архивация направления (мягкое удаление)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка: есть ли пользователи или скиллы в этом направлении
    const usersCount = await prisma.user.count({ where: { directionId: id } });
    const skillsCount = await prisma.skill.count({ where: { directionId: id } });
    
    if (usersCount > 0 || skillsCount > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить направление, к которому привязаны пользователи или навыки.' 
      });
    }

    await prisma.direction.update({
      where: { id },
      data: { archivedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/directions error:', error);
    res.status(500).json({ error: 'Ошибка удаления направления' });
  }
});

module.exports = router;