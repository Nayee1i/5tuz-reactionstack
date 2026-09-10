import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Неверный email или пароль');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new Error('Неверный email или пароль');

    const token = jwt.sign(
      { id: user.id, isSystemAdmin: user.isSystemAdmin },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    return { token, user: { id: user.id, fullName: user.fullName, isSystemAdmin: user.isSystemAdmin } };
  }
}