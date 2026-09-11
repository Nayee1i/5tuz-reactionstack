// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { prisma } = require('../db.js');

// ============================================================
// МУЛЬТЕР — загрузка аватаров
// ============================================================
const avatarsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.id : 'anonymous';
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${userId}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
  else cb(new Error('Допустимые форматы: JPG, PNG, WEBP, GIF'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 МБ
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Файл слишком большой (макс. 2 МБ)' });
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// ============================================================
// 🛠 АДМИНСКИЕ И ОБЩИЕ ЭНДПОИНТЫ
// ============================================================

// 1. GET /api/users - Получить список пользователей
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
    console.error('GET /api/users error:', error);
    res.status(500).json([]); 
  }
});

// 2. POST /api/users - Создание пользователя
router.post('/', async (req, res) => {
  try {
    const { login, password, fullName, directionId, departmentId, isAdmin } = req.body;
    
    if (!fullName || !directionId) {
      return res.status(400).json({ error: 'ФИО и направление обязательны' });
    }

    const finalLogin = login || `${fullName.toLowerCase().replace(/\s+/g, '.')}@company.test`;
    const finalPassword = password || '123456';
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        login: finalLogin,
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
    console.error('POST /api/users error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    res.status(500).json({ error: 'Ошибка сервера при создании пользователя' });
  }
});

// 3. PUT /api/users/:id - Обновление пользователя
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
    console.error('PUT /api/users/:id error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Пользователь не найден' });
    res.status(500).json({ error: 'Ошибка сервера при обновлении' });
  }
});

// 4. DELETE /api/users/:id - Мягкое удаление пользователя
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const managedDepts = await prisma.department.findMany({ 
      where: { headId: id },
      select: { name: true }
    });
    
    if (managedDepts.length > 0) {
      return res.status(400).json({ 
        error: `Нельзя удалить: пользователь руководит отделами (${managedDepts.map(d => d.name).join(', ')}).` 
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Пользователь деактивирован' });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    res.status(500).json({ error: 'Ошибка сервера при удалении' });
  }
});

// 5. GET /api/users/me/profile - Данные текущего пользователя
router.get('/me/profile', async (req, res) => {
  try {
    // Для хакатона: если нет req.user (мидлваря), берем из query или отдаем ошибку
    const userId = req.user ? req.user.id : req.query.mockUserId; 
    if (!userId) return res.status(401).json({ error: 'Пользователь не авторизован' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        direction: true,
        department: { include: { head: { include: { direction: true } } } },
      },
    });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: `${user.login}@company.test`,
        direction: user.direction?.name || '',
        department: user.department?.name || '',
      },
      manager: user.department?.head ? {
        fullName: user.department.head.fullName,
        direction: user.department.head.direction?.name || '',
      } : null,
      achievements: [], 
      skills: [] 
    });
  } catch (error) {
    console.error('GET /users/me/profile error:', error);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// 6. POST /api/users/me/avatar - Загрузка аватара
router.post('/me/avatar', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не выбран' });
    }
    const userId = req.user ? req.user.id : 'anonymous';
    const avatarUrl = `/avatars/${userId}${path.extname(req.file.originalname).toLowerCase()}`;
    
    res.json({ avatarUrl, message: 'Аватар успешно загружен' });
  } catch (error) {
    console.error('POST /users/me/avatar error:', error);
    res.status(500).json({ error: 'Не удалось загрузить аватар' });
  }
});

module.exports = router;