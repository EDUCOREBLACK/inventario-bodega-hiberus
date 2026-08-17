import { Router } from 'express';
import {
    reporteMateriales,
    reporteMovimientosProyecto,
    reporteStockBajo
} from '../controllers/reporteController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

// Todas las rutas de reportes requieren autenticación
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.get('/materiales', reporteMateriales);
router.get('/stock-bajo', reporteStockBajo);
router.get('/proyecto/:proyecto_id', reporteMovimientosProyecto);

export default router;