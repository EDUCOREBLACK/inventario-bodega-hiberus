import { Router } from 'express';
import {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario
} from '../controllers/usuarioController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

// Todas las rutas de usuarios requieren autenticación y rol admin
router.use(auth);
router.use(verificarRol(['admin']));

router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);
router.post('/', createUsuario);
router.put('/:id', updateUsuario);
router.delete('/:id', deleteUsuario);

export default router;