import { Router } from 'express';
import materialRoutes from './materialRoutes';
import movimientoRoutes from './movimientoRoutes';
import proyectoRoutes from './proyectoRoutes';
import dashboardRoutes from './dashboardRoutes';
import authRoutes from './authRoutes';
import usuarioRoutes from './usuarioRoutes';
import reporteRoutes from './reporteRoutes';
import catalogoRoutes from './catalogoRoutes';
import asignacionRoutes from './asignacionRoutes';
import clienteRoutes from './clienteRoutes';
import proveedorRoutes from './proveedorRoutes';
import sucursalRoutes from './sucursalRoutes';
import areaRoutes from './areaRoutes';

const router = Router();

router.use('/materiales', materialRoutes);
router.use('/movimientos', movimientoRoutes);
router.use('/proyectos', proyectoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/reportes', reporteRoutes);
router.use('/catalogos', catalogoRoutes);
router.use('/asignaciones', asignacionRoutes);
router.use('/clientes', clienteRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/sucursales', sucursalRoutes);
router.use('/areas', areaRoutes);

export default router;