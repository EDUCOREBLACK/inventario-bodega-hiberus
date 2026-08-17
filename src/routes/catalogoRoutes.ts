import { Router } from 'express';
import { auth, verificarRol } from '../middleware/auth';
import { getMarcas, createMarca, updateMarca, deleteMarca } from '../controllers/marcaController';
import { getTiposMaterial, createTipoMaterial, updateTipoMaterial, deleteTipoMaterial } from '../controllers/tipoMaterialController';

const router = Router();
router.use(auth);
router.use(verificarRol(['admin', 'gerente']));

router.get('/marcas', getMarcas);
router.post('/marcas', createMarca);
router.put('/marcas/:id', updateMarca);
router.delete('/marcas/:id', deleteMarca);

router.get('/tipos-material', getTiposMaterial);
router.post('/tipos-material', createTipoMaterial);
router.put('/tipos-material/:id', updateTipoMaterial);
router.delete('/tipos-material/:id', deleteTipoMaterial);

export default router;
