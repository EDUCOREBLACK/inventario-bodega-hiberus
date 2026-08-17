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
        nombre, codigo, tipo, cliente_id, responsable_id,
        responsable, fecha_inicio, fecha_fin, descripcion
    } = req.body;

    if (!nombre || !tipo) {
        res.status(400).json({ error: 'Nombre y tipo son requeridos' });
        return;
    }

    const codigoProyecto = (codigo || nombre).toString().trim().substring(0, 20).toUpperCase();
    const responsableFinal = responsable_id ?? responsable ?? null;

    db.run(`
        INSERT INTO proyectos (
            empresa_id, codigo, nombre, tipo, cliente_id,
            responsable_id, descripcion,
            fecha_inicio, fecha_fin, estado
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
    `, [
        codigoProyecto,
        nombre, tipo, cliente_id,
        responsableFinal, descripcion,
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
        nombre, codigo, tipo, cliente_id, responsable_id,
        responsable, fecha_inicio, fecha_fin, descripcion, estado
    } = req.body;

    const codigoProyecto = codigo ? codigo.toString().trim().substring(0, 20).toUpperCase() : undefined;
    const responsableFinal = responsable_id ?? responsable ?? undefined;

    db.run(`
        UPDATE proyectos SET
            codigo = COALESCE(?, codigo),
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
    `, [codigoProyecto, nombre, tipo, cliente_id, responsableFinal, fecha_inicio, fecha_fin, descripcion, estado, id],
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

    db.all(`
        SELECT ap.id, COALESCE(s.estado, 'sin_unidad') as stock_estado
        FROM asignaciones_proyecto ap
        LEFT JOIN stock s ON s.id = ap.stock_id
        WHERE ap.proyecto_id = ?
          AND COALESCE(s.estado, 'sin_unidad') NOT IN ('disponible', 'dado_baja')
    `, [id], (assignmentErr, unresolvedAssignments: any[] = []) => {
        if (assignmentErr) {
            res.status(500).json({ error: assignmentErr.message });
            return;
        }

        if (unresolvedAssignments.length > 0) {
            res.status(409).json({
                error: 'No se puede eliminar el proyecto mientras tenga materiales reservados, instalados, en tránsito o sin unidad física. Devuélvelos a disponible o dales de baja desde la lista de materiales del proyecto.',
                estados_bloqueantes: unresolvedAssignments.map((assignment) => assignment.stock_estado)
            });
            return;
        }

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
    });
};

// Obtener materiales de un proyecto
export const getProyectoMateriales = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.all(`
        SELECT 
            ap.id,
            ap.proyecto_id,
            ap.producto_id,
            ap.stock_id,
            ap.cantidad_asignada,
            ap.cantidad_utilizada,
            ap.cantidad_devuelta,
            ap.estado,
            ap.observaciones,
            ap.created_at as fecha_asignacion,
            COALESCE(p.modelo, p.nombre) as material_nombre,
            tm.nombre as tipo,
            m.nombre as marca,
            s.serial_number,
            s.metraje,
            s.estado as stock_estado,
            a.nombre as area_nombre,
            (ap.cantidad_asignada - ap.cantidad_utilizada - ap.cantidad_devuelta) as cantidad_pendiente
        FROM asignaciones_proyecto ap
        JOIN productos p ON ap.producto_id = p.id
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON ap.stock_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE ap.proyecto_id = ?
        ORDER BY ap.created_at DESC, ap.id DESC
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};