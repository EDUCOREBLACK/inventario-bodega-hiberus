import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { getAreas, createArea, updateArea, deleteArea } from '../controllers/areaController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.get('/', getAreas);
router.post('/', createArea);
router.put('/:id', updateArea);
router.delete('/:id', deleteArea);

export default router;
