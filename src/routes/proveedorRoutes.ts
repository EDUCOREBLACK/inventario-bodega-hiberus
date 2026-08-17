import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { getProveedores, getProveedorById, createProveedor, updateProveedor, deleteProveedor } from '../controllers/proveedorController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.get('/', getProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);

export default router;
