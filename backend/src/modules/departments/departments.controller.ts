import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/prisma';
import { PermissionService } from '../permissions/permission.service';

export class DepartmentController {
  // Получить дерево подразделений, доступное текущему юзеру
  static async getTree(req: AuthRequest, res: Response) {
    const currentUser = req.user!;
    
    // Если админ - возвращаем всё дерево
    if (currentUser.isSystemAdmin) {
      const allDepts = await prisma.department.findMany({
        include: { manager: true, children: true, users: true }
      });
      return res.json(allDepts);
    }

    // Иначе находим отделы, которыми он руководит, и их детей
    const managedDepts = await prisma.department.findMany({
      where: { managerId: currentUser.id },
      include: { children: true, users: true, manager: true }
    });

    res.json(managedDepts);
  }

  // Пример проверки прав при редактировании профиля сотрудника
  static async updateUserProfile(req: AuthRequest, res: Response) {
    const currentUser = req.user!;
    const targetUserId = req.params.userId;
    const { fullName, direction, departmentId } = req.body;

    // ПРОВЕРКА ПРАВ: Может ли текущий юзер трогать целевого?
    const canManage = await PermissionService.canManageUser(
      currentUser.id, 
      targetUserId, 
      currentUser.isSystemAdmin
    );

    if (!canManage) {
      return res.status(403).json({ error: 'У вас нет прав на редактирование этого сотрудника' });
    }

    // Если права есть - обновляем
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { fullName, direction, departmentId },
    });

    res.json(updatedUser);
  }

  // Перенос подразделения (с проверкой на циклы!)
  static async moveDepartment(req: AuthRequest, res: Response) {
    const deptId = req.params.deptId;
    const newParentId = req.body.parentId;

    // Проверка на циклическую зависимость
    if (newParentId) {
      let currentId: string | null = newParentId;
      while (currentId) {
        if (currentId === deptId) {
          return res.status(400).json({ error: 'Нельзя переместить отдел в его же подотдел (циклическая зависимость)' });
        }
        const parent = await prisma.department.findUnique({ where: { id: currentId }, select: { parentId: true } });
        currentId = parent?.parentId || null;
      }
    }

    const updated = await prisma.department.update({
      where: { id: deptId },
      data: { parentId: newParentId },
    });

    res.json(updated);
  }
}