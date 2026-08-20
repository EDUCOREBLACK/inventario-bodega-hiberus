import { Router } from 'express';
import {
    getProyectos,
    getProyectoById,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    getProyectoMateriales,
    getProyectoTareas,
    createProyectoTarea,
    updateProyectoTarea,
    deleteProyectoTarea,
    getAllTareas
} from '../controllers/proyectoController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', getProyectos);
router.get('/tareas', getAllTareas);
router.get('/:id', getProyectoById);
router.get('/:id/materiales', getProyectoMateriales);
router.post('/', verificarRol(['admin', 'gerente']), createProyecto);
router.put('/:id', verificarRol(['admin', 'gerente']), updateProyecto);
router.delete('/:id', verificarRol(['admin']), deleteProyecto);

// Tareas del proyecto
router.get('/:id/tareas', getProyectoTareas);
router.post('/:id/tareas', verificarRol(['admin', 'gerente']), createProyectoTarea);
router.put('/:id/tareas/:tareaId', verificarRol(['admin', 'gerente']), updateProyectoTarea);
router.delete('/:id/tareas/:tareaId', verificarRol(['admin', 'gerente']), deleteProyectoTarea);

export default router;