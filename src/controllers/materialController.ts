import { Request, Response } from 'express';
import db from '../database/database';

// Obtener todos los materiales (productos)
export const getMateriales = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.*,
            tm.nombre as tipo_nombre,
            m.nombre as marca_nombre,
            u.nombre as ubicacion_nombre,
            SUM(s.cantidad) as stock_total
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON p.id = s.producto_id
        LEFT JOIN ubicaciones u ON s.ubicacion_id = u.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Obtener un material por ID
export const getMaterialById = (req: Request, res: Response) => {
    const { id } = req.params;
    db.get(`
        SELECT 
            p.*,
            tm.nombre as tipo_nombre,
            m.nombre as marca_nombre,
            u.nombre as ubicacion_nombre,
            SUM(s.cantidad) as stock_total
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON p.id = s.producto_id
        LEFT JOIN ubicaciones u ON s.ubicacion_id = u.id
        WHERE p.id = ?
        GROUP BY p.id
    `, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }
        res.json(row);
    });
};

// Obtener material por SKU
export const getMaterialBySku = (req: Request, res: Response) => {
    const { sku } = req.params;
    db.get(`
        SELECT 
            p.*,
            tm.nombre as tipo_nombre,
            m.nombre as marca_nombre
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        WHERE p.sku = ?
    `, [sku], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }
        res.json(row);
    });
};

// Crear un nuevo material
export const createMaterial = (req: Request, res: Response) => {
    const {
        sku, tipo_material_id, marca_id, nombre,
        descripcion, modelo, unidad_medida_id,
        requiere_serial, requiere_metraje,
        stock_minimo, precio_compra, precio_venta
    } = req.body;

    if (!sku || !tipo_material_id || !nombre) {
        res.status(400).json({ error: 'SKU, tipo y nombre son requeridos' });
        return;
    }

    db.run(`
        INSERT INTO productos (
            empresa_id, sku, tipo_material_id, marca_id,
            nombre, descripcion, modelo, unidad_medida_id,
            requiere_serial, requiere_metraje,
            stock_minimo, precio_compra, precio_venta,
            moneda
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD')
    `, [
        sku, tipo_material_id, marca_id,
        nombre, descripcion, modelo, unidad_medida_id || 1,
        requiere_serial || 0, requiere_metraje || 0,
        stock_minimo || 0, precio_compra || 0, precio_venta || 0
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            id: this.lastID,
            message: 'Material creado exitosamente'
        });
    });
};

// Actualizar un material
export const updateMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        sku, tipo_material_id, marca_id, nombre,
        descripcion, modelo, unidad_medida_id,
        requiere_serial, requiere_metraje,
        stock_minimo, precio_compra, precio_venta,
        estado
    } = req.body;

    db.run(`
        UPDATE productos SET
            sku = COALESCE(?, sku),
            tipo_material_id = COALESCE(?, tipo_material_id),
            marca_id = COALESCE(?, marca_id),
            nombre = COALESCE(?, nombre),
            descripcion = COALESCE(?, descripcion),
            modelo = COALESCE(?, modelo),
            unidad_medida_id = COALESCE(?, unidad_medida_id),
            requiere_serial = COALESCE(?, requiere_serial),
            requiere_metraje = COALESCE(?, requiere_metraje),
            stock_minimo = COALESCE(?, stock_minimo),
            precio_compra = COALESCE(?, precio_compra),
            precio_venta = COALESCE(?, precio_venta),
            estado = COALESCE(?, estado),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        sku, tipo_material_id, marca_id, nombre,
        descripcion, modelo, unidad_medida_id,
        requiere_serial, requiere_metraje,
        stock_minimo, precio_compra, precio_venta,
        estado, id
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }
        res.json({ message: 'Material actualizado exitosamente' });
    });
};

// Eliminar un material
export const deleteMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    db.run('DELETE FROM productos WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }
        res.json({ message: 'Material eliminado exitosamente' });
    });
};

// Obtener stock de un material
export const getMaterialStock = (req: Request, res: Response) => {
    const { id } = req.params;
    db.all(`
        SELECT 
            s.*,
            u.nombre as ubicacion_nombre,
            l.codigo as lote_codigo,
            l.descripcion as lote_descripcion
        FROM stock s
        LEFT JOIN ubicaciones u ON s.ubicacion_id = u.id
        LEFT JOIN lotes l ON s.lote_id = l.id
        WHERE s.producto_id = ?
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};