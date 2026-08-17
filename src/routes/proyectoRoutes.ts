import { Router } from 'express';
import {
    getProyectos,
    getProyectoById,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    getProyectoMateriales
} from '../controllers/proyectoController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', getProyectos);
router.get('/:id', getProyectoById);
router.get('/:id/materiales', getProyectoMateriales);
router.post('/', verificarRol(['admin', 'gerente']), createProyecto);
router.put('/:id', verificarRol(['admin', 'gerente']), updateProyecto);
router.delete('/:id', verificarRol(['admin']), deleteProyecto);

export default router;