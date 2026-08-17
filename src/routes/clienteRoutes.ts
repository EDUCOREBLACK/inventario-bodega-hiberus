import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { getClientes, getClienteById, createCliente, updateCliente, deleteCliente } from '../controllers/clienteController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente', 'supervisor']));

router.get('/', getClientes);
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

export default router;
