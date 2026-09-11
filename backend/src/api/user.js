// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
// const { requireAuth } = require('../middleware/auth'); // Раскомментируйте, когда настроите авторизацию
const { prisma } = require('../db.js'); // Убедитесь, что путь к prisma верный

// ============================================================
// МУЛЬТЕР — загрузка аватаров (оставляем как было)
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
// 🛠 АДМИНСКИЕ ЭНДПОИНТЫ (Для AdminUsersPage.jsx)
// Эти роуты НЕ требуют req.user, чтобы вы могли тестировать админку прямо сейчас
// ============================================================

// 1. GET /api/users - Получить список пользователей с фильтрацией
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

    // 🛡️ ГАРАНТИРУЕМ, что вернется массив, даже если пользователей нет
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
    // 🛡️ Возвращаем пустой массив при ошибке, чтобы фронтенд не падал на .map()
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


// ============================================================
// 👤 ЛИЧНЫЕ ЭНДПОИНТЫ ПОЛЬЗОВАТЕЛЯ (Требуют авторизации)
// ============================================================

// Вспомогательная функция для проверки авторизации (заглушка, если middleware отключен)
function checkAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
}

// router.use(checkAuth); // Раскомментируйте, когда настроите токены

router.get('/me/profile', async (req, res) => {
  try {
    // 🛡️ Защита от undefined req.user
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

    // Упрощенный формат для хакатона (убрали несуществующие в схеме поля avatarUrl/bio, чтобы не было ошибок Prisma)
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
      achievements: [], // Можно заполнить позже, если успеете
      skills: [] // Можно заполнить позже
    });
  } catch (error) {
    console.error('GET /users/me/profile error:', error);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// Остальные /me роуты можно добавить по аналогии, когда дойдете до них

module.exports = router;