import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { asignarStockAProyecto, actualizarAsignacion, actualizarEstadoAsignacion, consumirAsignacion, devolverAsignacion } from '../controllers/asignacionController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.post('/proyecto', asignarStockAProyecto);
router.put('/:id', actualizarAsignacion);
router.put('/:id/estado', actualizarEstadoAsignacion);
router.post('/consumir', consumirAsignacion);
router.post('/devolver', devolverAsignacion);

export default router;
