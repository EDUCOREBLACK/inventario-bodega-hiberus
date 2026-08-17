import { Router } from 'express';
import {
    getMateriales,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterialStock,
    actualizarUnidadStock,
    deleteUnidadStock,
    uploadImage,
    getImages,
    bulkUpdateMaterials,
} from '../controllers/materialController';
import { upload } from '../middleware/upload';
import { auth, verificarRol } from '../middleware/auth';

const router = Router();

router.use(auth);

// Rutas protegidas (requieren autenticación)
router.get('/', getMateriales);
router.get('/:id', getMaterialById);
router.get('/:id/stock', getMaterialStock);
router.get('/:id/imagenes', getImages);
router.post('/', verificarRol(['admin', 'gerente']), createMaterial);
router.put('/:id', verificarRol(['admin', 'gerente']), updateMaterial);
router.delete('/:id', verificarRol(['admin']), deleteMaterial);
router.post('/:id/imagen', upload.single('imagen'), uploadImage);
router.put('/:id/stock/:stockId', verificarRol(['admin', 'gerente']), actualizarUnidadStock);
router.put('/bulk', verificarRol(['admin', 'gerente']), bulkUpdateMaterials);

export default router;