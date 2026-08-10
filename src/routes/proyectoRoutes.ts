import { Router } from 'express';
import {
    getProyectos,
    getProyectoById,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    getProyectoMateriales
} from '../controllers/proyectoController';

const router = Router();

router.get('/', getProyectos);
router.get('/:id', getProyectoById);
router.get('/:id/materiales', getProyectoMateriales);
router.post('/', createProyecto);
router.put('/:id', updateProyecto);
router.delete('/:id', deleteProyecto);

export default router;