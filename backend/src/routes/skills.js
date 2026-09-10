import express from 'express';
import { prisma } from '../db.js';

const router = express.Router();

// Получить все навыки с направлениями
router.get('/', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        direction: true
      },
      where: {
        archivedAt: null // Только активные навыки
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить навык по ID
router.get('/:id', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: {
        direction: true,
        planItems: {
          include: {
            plan: {
              include: {
                employee: true
              }
            }
          }
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать новый навык
router.post('/', async (req, res) => {
  try {
    const { directionId, name, description } = req.body;
    
    if (!directionId || !name) {
      return res.status(400).json({ error: 'directionId and name are required' });
    }
    
    const skill = await prisma.skill.create({
      data: {
        directionId,
        name: name.trim(),
        description: description ? description.trim() : null
      },
      include: {
        direction: true
      }
    });
    
    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить навык
router.put('/:id', async (req, res) => {
  try {
    const { name, description, archivedAt } = req.body;
    
    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: {
        name: name ? name.trim() : undefined,
        description: description ? description.trim() : undefined,
        archivedAt: archivedAt !== undefined ? new Date(archivedAt) : undefined
      },
      include: {
        direction: true
      }
    });
    
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Архивировать навык (мягкое удаление)
router.delete('/:id', async (req, res) => {
  try {
    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: {
        archivedAt: new Date()
      },
      include: {
        direction: true
      }
    });
    
    res.json({ message: 'Skill archived', skill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить навыки по направлению
router.get('/direction/:directionId', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: {
        directionId: req.params.directionId,
        archivedAt: null
      },
      include: {
        direction: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;