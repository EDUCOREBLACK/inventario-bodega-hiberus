import { Request, Response } from 'express';
import db from '../database/database';

// Obtener todos los proyectos
export const getProyectos = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.*,
            c.nombre as cliente_nombre,
            COUNT(ap.id) as total_asignaciones
        FROM proyectos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN asignaciones_proyecto ap ON p.id = ap.proyecto_id
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

// Obtener proyecto por ID
export const getProyectoById = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.get(`
        SELECT 
            p.*,
            c.nombre as cliente_nombre
        FROM proyectos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE p.id = ?
    `, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Proyecto no encontrado' });
            return;
        }
        res.json(row);
    });
};

// Crear proyecto
export const createProyecto = (req: Request, res: Response) => {
    const {
        nombre, tipo, cliente_id, responsable,
        fecha_inicio, fecha_fin, descripcion
    } = req.body;

    if (!nombre || !tipo) {
        res.status(400).json({ error: 'Nombre y tipo son requeridos' });
        return;
    }

    db.run(`
        INSERT INTO proyectos (
            empresa_id, codigo, nombre, tipo, cliente_id,
            responsable_id, descripcion,
            fecha_inicio, fecha_fin, estado
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
    `, [
        nombre.substring(0, 10).toUpperCase(), // codigo temporal
        nombre, tipo, cliente_id,
        responsable, descripcion,
        fecha_inicio, fecha_fin
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            id: this.lastID,
            message: 'Proyecto creado exitosamente'
        });
    });
};

// Actualizar proyecto
export const updateProyecto = (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        nombre, tipo, cliente_id, responsable,
        fecha_inicio, fecha_fin, descripcion, estado
    } = req.body;

    db.run(`
        UPDATE proyectos SET
            nombre = COALESCE(?, nombre),
            tipo = COALESCE(?, tipo),
            cliente_id = COALESCE(?, cliente_id),
            responsable_id = COALESCE(?, responsable_id),
            fecha_inicio = COALESCE(?, fecha_inicio),
            fecha_fin = COALESCE(?, fecha_fin),
            descripcion = COALESCE(?, descripcion),
            estado = COALESCE(?, estado),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [nombre, tipo, cliente_id, responsable, fecha_inicio, fecha_fin, descripcion, estado, id],
    function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Proyecto no encontrado' });
            return;
        }
        res.json({ message: 'Proyecto actualizado exitosamente' });
    });
};

// Eliminar proyecto
export const deleteProyecto = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.run('DELETE FROM proyectos WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Proyecto no encontrado' });
            return;
        }
        res.json({ message: 'Proyecto eliminado exitosamente' });
    });
};

// Obtener materiales de un proyecto
export const getProyectoMateriales = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.all(`
        SELECT 
            ap.*,
            p.sku,
            p.nombre as material_nombre,
            tm.nombre as tipo,
            m.nombre as marca,
            s.serial_number
        FROM asignaciones_proyecto ap
        JOIN productos p ON ap.producto_id = p.id
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON ap.stock_id = s.id
        WHERE ap.proyecto_id = ?
        ORDER BY ap.fecha_asignacion DESC
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};