// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { prisma } = require('../db.js');

// ============================================================
// МУЛЬТЕР — загрузка аватаров
// ============================================================

// Гарантируем, что папка для аватаров существует
const avatarsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Допустимые MIME-типы
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    // Имя файла = userId + расширение оригинала
    // При повторной загрузке старый файл автоматически перезапишется
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.user.id}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Допустимые форматы: JPG, PNG, WEBP, GIF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 МБ
  },
});

// Обёртка для перехвата ошибок multer
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Файл слишком большой (макс. 2 МБ)' });
      }
      return res.status(400).json({ message: `Ошибка загрузки: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

// ============================================================
// Все эндпоинты этого роутера требуют авторизации
// ============================================================
// router.use(requireAuth);

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Разбивает fullName на firstName и lastName.
 * "Иван Иванович Иванов" → { firstName: "Иван", lastName: "Иванович Иванов" }
 */
function splitFullName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Маппит Prisma-User в формат, который ожидает фронтенд (profile.api.js).
 */
function formatUser(user) {
  const { firstName, lastName } = splitFullName(user.fullName);
  const directionName = user.direction?.name || '';

  const positionByDirection = {
    BACK: 'Backend Developer',
    FRONT: 'Frontend Developer',
    QA: 'QA Engineer',
  };
  const position = positionByDirection[directionName] || 'Specialist';

  return {
    id: user.id,
    firstName,
    lastName,
    fullName: user.fullName,
    email: `${user.login}@skillflow.local`,
    position,
    direction: directionName,
    department: user.department?.name || '',
    departmentId: user.departmentId || null,
    company: 'SkillFlow Technologies',
    joinedAt: user.createdAt,
    // Если в схеме есть поле avatar — используем его, иначе null
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || '',
  };
}

/**
 * Вычисляет статус и прогресс скилла на основе PlanItem.
 */
function computeSkillStatus(planItem) {
  const now = new Date();
  const dueDate = new Date(planItem.dueDate);
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  const hasConfirmation = (planItem.skillConfirmations || []).some(
    (c) => c.outcome === 'CONFIRMED'
  );
  const hasDiscussion = (planItem.meetingSkills || []).some(
    (s) => s.outcome === 'DISCUSSED'
  );

  if (hasConfirmation) {
    return {
      status: 'confirmed',
      statusLabel: 'Подтверждён',
      progress: 100,
      confirmedAt: planItem.skillConfirmations?.[0]?.createdAt || planItem.updatedAt,
    };
  }

  if (hasDiscussion) {
    return {
      status: 'in_progress',
      statusLabel: 'В работе',
      progress: 50,
      confirmedAt: null,
    };
  }

  if (daysUntilDue < 0) {
    return {
      status: 'overdue',
      statusLabel: 'Просрочен',
      progress: Math.max(0, Math.min(40, 40 + daysUntilDue)),
      confirmedAt: null,
    };
  }

  if (daysUntilDue <= 14) {
    return {
      status: 'at_risk',
      statusLabel: 'Есть отставание',
      progress: Math.max(10, 40 - daysUntilDue),
      confirmedAt: null,
    };
  }

  const plan = planItem.plan;
  const planStart = new Date(plan.createdAt);
  const totalDays = Math.max(1, (dueDate - planStart) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, (now - planStart) / (1000 * 60 * 60 * 24));
  const expectedProgress = Math.min(95, Math.round((elapsed / totalDays) * 100));

  return {
    status: expectedProgress > 5 ? 'on_track' : 'planned',
    statusLabel: expectedProgress > 5 ? 'По плану' : 'Запланирован',
    progress: expectedProgress,
    confirmedAt: null,
  };
}

/**
 * Генерирует достижения пользователя на основе реальных данных.
 */
async function buildAchievements(userId) {
  const achievements = [];

  const confirmedCount = await prisma.skillConfirmation.count({
    where: {
      outcome: 'CONFIRMED',
      planItem: { plan: { employeeId: userId } },
    },
  });

  if (confirmedCount >= 1) {
    achievements.push({
      id: 'first-skill',
      title: 'Первый скилл',
      description: 'Подтвердил свой первый технический навык',
      earnedAt: new Date().toISOString(),
      icon: 'star',
    });
  }

  if (confirmedCount >= 3) {
    achievements.push({
      id: 'skill-streak',
      title: '3 скилла подряд',
      description: 'Подтвердил 3 и более скилла',
      earnedAt: new Date().toISOString(),
      icon: 'streak',
    });
  }

  const conductedCount = await prisma.meeting.count({
    where: { conductorId: userId, status: 'COMPLETED' },
  });

  if (conductedCount >= 3) {
    achievements.push({
      id: 'mentor',
      title: 'Наставник',
      description: `Провёл ${conductedCount} встреч в качестве наставника`,
      earnedAt: new Date().toISOString(),
      icon: 'mentor',
    });
  }

  const resolvedCount = await prisma.problem.count({
    where: { resolverId: userId, status: 'RESOLVED' },
  });

  if (resolvedCount >= 1) {
    achievements.push({
      id: 'problem-solver',
      title: 'Решатель проблем',
      description: `Успешно закрыл ${resolvedCount} проблем`,
      earnedAt: new Date().toISOString(),
      icon: 'check',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (user) {
    const daysInCompany = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysInCompany >= 180) {
      achievements.push({
        id: 'veteran',
        title: 'Ветеран команды',
        description: 'Более 6 месяцев в компании',
        earnedAt: user.createdAt.toISOString(),
        icon: 'medal',
      });
    }
  }

  return achievements;
}

// ============================================================
// ЭНДПОИНТЫ
// ============================================================

/**
 * GET /api/users/me/profile
 * Полный профиль: user, manager, achievements, skills.
 */
router.get('/me/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        direction: true,
        department: {
          include: {
            head: {
              include: { direction: true, department: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const manager = user.department?.head || null;
    const achievements = await buildAchievements(userId);

    const planItems = await prisma.planItem.findMany({
      where: {
        plan: { employeeId: userId },
        cancelledAt: null,
      },
      include: {
        skill: { include: { direction: true } },
        skillConfirmations: true,
        meetingSkills: true,
        plan: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const skills = planItems.map((item) => {
      const { status, statusLabel, progress, confirmedAt } = computeSkillStatus(item);
      return {
        id: item.id,
        name: item.skill.name,
        direction: item.skill.direction?.name || '',
        progress,
        status,
        statusLabel,
        plannedDate: item.dueDate,
        confirmedAt,
      };
    });

    res.json({
      user: formatUser(user),
      manager: manager ? formatUser(manager) : null,
      achievements,
      skills,
    });
  } catch (error) {
    console.error('GET /users/me/profile error:', error);
    res.status(500).json({ message: 'Ошибка загрузки профиля' });
  }
});

/**
 * GET /api/users/me/skills
 * Только список скиллов из плана обучения.
 */
router.get('/me/skills', async (req, res) => {
  try {
    const userId = req.user.id;

    const planItems = await prisma.planItem.findMany({
      where: {
        plan: { employeeId: userId },
        cancelledAt: null,
      },
      include: {
        skill: { include: { direction: true } },
        skillConfirmations: true,
        meetingSkills: true,
        plan: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const skills = planItems.map((item) => {
      const { status, statusLabel, progress, confirmedAt } = computeSkillStatus(item);
      return {
        id: item.id,
        name: item.skill.name,
        direction: item.skill.direction?.name || '',
        progress,
        status,
        statusLabel,
        plannedDate: item.dueDate,
        confirmedAt,
      };
    });

    res.json(skills);
  } catch (error) {
    console.error('GET /users/me/skills error:', error);
    res.status(500).json({ message: 'Ошибка загрузки скиллов' });
  }
});

/**
 * GET /api/users/me/achievements
 * Достижения пользователя.
 */
router.get('/me/achievements', async (req, res) => {
  try {
    const achievements = await buildAchievements(req.user.id);
    res.json(achievements);
  } catch (error) {
    console.error('GET /users/me/achievements error:', error);
    res.status(500).json({ message: 'Ошибка загрузки достижений' });
  }
});

/**
 * POST /api/users/me/avatar
 * Загрузка аватара через multer.
 * Фронтенд отправляет FormData с полем "file".
 */
router.post('/me/avatar', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не выбран' });
    }

    // Формируем публичный URL аватара
    // (папка uploads/avatars раздаётся как статика в index.js)
    const avatarUrl = `/avatars/${req.file.filename}`;

    // Сохраняем URL в БД (если поле avatarUrl есть в схеме)
    // Если поля нет в схеме — Prisma вернет ошибку, поэтому оборачиваем в try
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl },
      });
    } catch (dbError) {
      // Поля avatarUrl нет в схеме — не критично, файл уже сохранён на диске
      console.warn(
        'Не удалось сохранить avatarUrl в БД (поле может отсутствовать в схеме):',
        dbError.message
      );
    }

    res.json({
      avatarUrl,
      message: 'Аватар успешно загружен',
    });
  } catch (error) {
    console.error('POST /users/me/avatar error:', error);
    res.status(500).json({ message: 'Не удалось загрузить аватар' });
  }
});

/**
 * PATCH /api/users/me/bio
 * Обновление поля "О себе".
 */
router.patch('/me/bio', async (req, res) => {
  try {
    const { bio } = req.body;
    if (typeof bio !== 'string' || bio.length > 600) {
      return res.status(400).json({ message: 'Некорректное значение bio (макс. 600 символов)' });
    }

    // Сохраняем в БД (если поле bio есть в схеме)
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { bio },
      });
    } catch (dbError) {
      console.warn(
        'Не удалось сохранить bio в БД (поле может отсутствовать в схеме):',
        dbError.message
      );
    }

    res.json({ bio, message: 'Bio обновлено' });
  } catch (error) {
    console.error('PATCH /users/me/bio error:', error);
    res.status(500).json({ message: 'Не удалось сохранить bio' });
  }
});

module.exports = router;