import prisma from '../../config/prisma';

export class PermissionService {
  /**
   * Проверяет, может ли currentUser управлять targetUser
   */
  static async canManageUser(currentUserId: string, targetUserId: string, isSystemAdmin: boolean): Promise<boolean> {
    // 1. Системный админ может всё
    if (isSystemAdmin) return true;

    // 2. Пользователь может управлять собой
    if (currentUserId === targetUserId) return true;

    // 3. Получаем отдел целевого пользователя
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { departmentId: true }
    });

    if (!targetUser || !targetUser.departmentId) {
      return false; // У цели нет отдела, значит никто (кроме админа) не может им управлять
    }

    // 4. Идем вверх по дереву отделов, проверяя руководителей
    return this.canManageDepartment(currentUserId, targetUser.departmentId);
  }

  /**
   * Рекурсивно поднимается по дереву отделов вверх.
   * Если находит отдел, где managerId === currentUserId, возвращает true.
   */
  private static async canManageDepartment(managerId: string, departmentId: string): Promise<boolean> {
    let currentDeptId: string | null = departmentId;

    while (currentDeptId) {
      const department = await prisma.department.findUnique({
        where: { id: currentDeptId },
        select: { managerId: true, parentId: true }
      });

      if (!department) break;

      // Если текущий юзер является руководителем этого отдела
      if (department.managerId === managerId) {
        return true;
      }

      // Переходим к родительскому отделу
      currentDeptId = department.parentId;
    }

    return false;
  }
}