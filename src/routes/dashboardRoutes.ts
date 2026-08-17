import { Router } from 'express';
import {
    getDashboardResumen,
    getStockBajo,
    getCostosProyectos,
    getMovimientosRecientes
} from '../controllers/dashboardController';
import { auth } from '../middleware/auth';

const router = Router();

router.use(auth);
router.get('/resumen', getDashboardResumen);
router.get('/stock-bajo', getStockBajo);
router.get('/costos-proyectos', getCostosProyectos);
router.get('/movimientos-recientes', getMovimientosRecientes);

export default router;