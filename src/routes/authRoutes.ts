import { Router } from 'express';
import { register, login, getPerfil } from '../controllers/authController';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/perfil', auth, getPerfil);
router.post('/register', auth, verificarRol(['admin']), register);

export default router;