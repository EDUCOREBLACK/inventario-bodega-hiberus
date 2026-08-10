import { Router } from 'express';
import {
    getMateriales,
    getMaterialById,
    getMaterialBySku,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterialStock
} from '../controllers/materialController';

const router = Router();

router.get('/', getMateriales);
router.get('/:id', getMaterialById);
router.get('/sku/:sku', getMaterialBySku);
router.get('/:id/stock', getMaterialStock);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;