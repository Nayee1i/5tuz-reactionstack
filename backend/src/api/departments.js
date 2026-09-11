const express = require('express');
const router = express.Router();
const { prisma } = require('../db.js'); // Убедитесь, что путь к вашему экземпляру prisma верный

// ============================================================
// ПОДРАЗДЕЛЕНИЯ (DEPARTMENTS)
// ============================================================

// 1. GET /api/departments - Получить все подразделения (плоским списком для селекта)
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { 
        id: true, 
        name: true, 
        parentId: true,
        headId: true,
        parent: { select: { name: true } }, // Для отладки и будущего отображения иерархии
        head: { select: { fullName: true } }
      }
    });
    res.json(departments);
  } catch (error) {
    console.error('GET /api/departments error:', error);
    res.status(500).json([]); // 🛡️ Защита фронтенда
  }
});

// 2. POST /api/departments - Создать подразделение
router.post('/', async (req, res) => {
  try {
    const { name, parentId, headId } = req.body;
    if (!name || !headId) {
      return res.status(400).json({ error: 'Название и руководитель обязательны' });
    }

    const newDept = await prisma.department.create({
      data: {
        name,
        parentId: parentId || null,
        headId
      },
      include: { head: { select: { fullName: true } } }
    });
    res.status(201).json(newDept);
  } catch (error) {
    console.error('POST /api/departments error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Подразделение с таким именем у этого родителя уже существует' });
    res.status(500).json({ error: 'Ошибка создания подразделения' });
  }
});

// 3. PUT /api/departments/:id - Обновить подразделение (например, сменить руководителя)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, headId } = req.body;

    // Защита от циклической ссылки (нельзя сделать родителя самим собой или своим потомком)
    if (parentId === id) {
      return res.status(400).json({ error: 'Подразделение не может быть родителем самого себя' });
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        name,
        parentId: parentId || null,
        headId
      },
      include: { head: { select: { fullName: true } } }
    });
    res.json(updatedDept);
  } catch (error) {
    console.error('PUT /api/departments error:', error);
    res.status(500).json({ error: 'Ошибка обновления подразделения' });
  }
});

// 4. DELETE /api/departments/:id - Удалить подразделение
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка: есть ли дочерние подразделения или сотрудники
    const childrenCount = await prisma.department.count({ where: { parentId: id } });
    const usersCount = await prisma.user.count({ where: { departmentId: id } });

    if (childrenCount > 0) {
      return res.status(400).json({ error: 'Сначала удалите или перенесите дочерние подразделения.' });
    }
    if (usersCount > 0) {
      return res.status(400).json({ error: 'Сначала перенесите сотрудников из этого подразделения.' });
    }

    await prisma.department.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/departments error:', error);
    res.status(500).json({ error: 'Ошибка удаления подразделения' });
  }
});

module.exports = router;