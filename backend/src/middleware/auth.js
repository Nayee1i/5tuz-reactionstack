// middleware/auth.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    const user = await prisma.user.findFirst({
      where: { 
        sessionToken: token,
        isActive: true 
      },
      select: {
        id: true,
        login: true,
        fullName: true,
        isAdmin: true,
        directionId: true,
        departmentId: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Недействительная сессия' });
    }

    // Кладем пользователя в объект запроса, чтобы использовать в контроллерах
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Ошибка проверки авторизации' });
  }
};

// Middleware для проверки прав админа
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };