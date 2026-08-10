import { Router } from 'express';
import materialRoutes from './materialRoutes';
import movimientoRoutes from './movimientoRoutes';
import proyectoRoutes from './proyectoRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = Router();

router.use('/materiales', materialRoutes);
router.use('/movimientos', movimientoRoutes);
router.use('/proyectos', proyectoRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;