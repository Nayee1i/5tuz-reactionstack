import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { DepartmentController } from './departments.controller';

const router = Router();

// Все роуты ниже требуют авторизации
router.use(authMiddleware);

router.get('/tree', DepartmentController.getTree);
router.patch('/users/:userId', DepartmentController.updateUserProfile);
router.patch('/:deptId/move', DepartmentController.moveDepartment);

export default router;