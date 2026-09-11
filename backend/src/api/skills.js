const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Вспомогательная функция для проверки прав (заглушка для хакатона, замените на ваш middleware авторизации)
// const requireAuth = (req, res, next) => { if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Доступ запрещен' }); next(); };

// GET /api/skills - Получение списка навыков с фильтрацией и поиском
router.get('/', async (req, res) => {
  try {
    const { directionId, query } = req.query;
    
    const where = {
      archivedAt: null, // Не показываем удаленные
      ...(directionId && { directionId }),
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      })
    };

    const skills = await prisma.skill.findMany({
      where,
      include: { 
        direction: { select: { id: true, name: true } } 
      },
      orderBy: { name: 'asc' }
    });

    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Ошибка при получении списка навыков' });
  }
});

// GET /api/skills/directions - Получение списка направлений (для выпадающего списка на фронтенде)
router.get('/directions', async (req, res) => {
  try {
    const directions = await prisma.direction.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' }
    });
    res.json(directions);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении направлений' });
  }
});

// POST /api/skills - Создание нового навыка
router.post('/', async (req, res) => {
  try {
    const { directionId, name, description } = req.body;
    
    if (!directionId || !name?.trim()) {
      return res.status(400).json({ error: 'Поля directionId и name обязательны' });
    }

    const skill = await prisma.skill.create({
      data: {
        directionId,
        name: name.trim(),
        description: description?.trim() || ''
      },
      include: { direction: { select: { name: true } } }
    });

    res.status(201).json(skill);
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint failed
      return res.status(409).json({ error: 'Скилл с таким названием уже существует в этом направлении' });
    }
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Ошибка при создании навыка' });
  }
});

// PUT /api/skills/:id - Обновление навыка
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, directionId } = req.body;

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim(),
        directionId
      },
      include: { direction: { select: { name: true } } }
    });

    res.json(skill);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Скилл с таким названием уже существует в этом направлении' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Навык не найден' });
    }
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Ошибка при обновлении навыка' });
  }
});

// DELETE /api/skills/:id - Мягкое удаление (архивация) навыка
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Используем update вместо delete, чтобы сохранить историю в планах обучения, но скрыть из справочника
    const skill = await prisma.skill.update({
      where: { id },
      data: { archivedAt: new Date() }
    });

    res.json({ message: 'Навык архивирован', skill });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Навык не найден' });
    }
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Ошибка при удалении навыка' });
  }
});

module.exports = router;