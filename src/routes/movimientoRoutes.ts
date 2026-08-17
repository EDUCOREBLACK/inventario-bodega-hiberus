import { Router } from 'express';
import {
    getMovimientos,
    getMovimientosByMaterial,
    registrarEntrada,
    registrarSalida
} from '../controllers/movimientoController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', getMovimientos);
router.get('/material/:id', getMovimientosByMaterial);
router.post('/entrada', verificarRol(['admin', 'gerente', 'supervisor']), registrarEntrada);
router.post('/salida', verificarRol(['admin', 'gerente', 'supervisor']), registrarSalida);

export default router;