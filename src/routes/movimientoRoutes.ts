import { Router } from 'express';
import {
    getMovimientos,
    getMovimientosByMaterial,
    registrarEntrada,
    registrarSalida
} from '../controllers/movimientoController';

const router = Router();

router.get('/', getMovimientos);
router.get('/material/:id', getMovimientosByMaterial);
router.post('/entrada', registrarEntrada);
router.post('/salida', registrarSalida);

export default router;