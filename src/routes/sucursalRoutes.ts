import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { getSucursales, getSucursalById, createSucursal, updateSucursal, deleteSucursal } from '../controllers/sucursalController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.get('/', getSucursales);
router.get('/:id', getSucursalById);
router.post('/', createSucursal);
router.put('/:id', updateSucursal);
router.delete('/:id', deleteSucursal);

export default router;
