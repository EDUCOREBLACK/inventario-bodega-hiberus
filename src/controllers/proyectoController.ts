import { Request, Response } from 'express';
import db from '../database/database';

// Obtener todos los proyectos
export const getProyectos = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.*,
            c.nombre as cliente_nombre,
            COUNT(DISTINCT ap.id) as total_asignaciones,
            COALESCE(SUM(DISTINCT prod.precio_unitario * ap.cantidad_asignada), 0) as costo_materiales,
            COALESCE(p.horas_hombre * p.costo_hora_hombre, 0) as costo_laboral,
            COALESCE(SUM(DISTINCT prod.precio_unitario * ap.cantidad_asignada), 0) + COALESCE(p.horas_hombre * p.costo_hora_hombre, 0) as costo_total,
            (SELECT COUNT(*) FROM proyecto_tareas pt WHERE pt.proyecto_id = p.id) as total_tareas,
            (SELECT COUNT(*) FROM proyecto_tareas pt WHERE pt.proyecto_id = p.id AND pt.estado = 'realizada') as tareas_completadas,
            (SELECT COUNT(*) FROM proyecto_tareas pt WHERE pt.proyecto_id = p.id AND pt.estado != 'realizada' AND pt.fecha_fin < date('now')) as tareas_vencidas
        FROM proyectos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN asignaciones_proyecto ap ON p.id = ap.proyecto_id
        LEFT JOIN productos prod ON ap.producto_id = prod.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const proyectosConProgreso = rows.map((row: any) => {
            const avance = row.total_tareas > 0 ? Math.round((row.tareas_completadas / row.total_tareas) * 100) : 0;
            return {
                ...row,
                porcentaje_avance: avance
            };
        });
        
        res.json(proyectosConProgreso || []);
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
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Proyecto no encontrado' });
        res.json(row);
    });
};

// Crear proyecto
export const createProyecto = (req: Request, res: Response) => {
    const {
        nombre, codigo, tipo, cliente_id, responsable_id,
        responsable, fecha_inicio, fecha_fin, descripcion,
        especificaciones, configuracion, cantidad_personas, horas_hombre, costo_hora_hombre
    } = req.body;

    if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son requeridos' });

    const codigoProyecto = (codigo || nombre).toString().trim().substring(0, 20).toUpperCase();
    const responsableFinal = responsable_id ?? responsable ?? null;

    db.run(`
        INSERT INTO proyectos (
            empresa_id, codigo, nombre, tipo, cliente_id,
            responsable_id, descripcion,
            fecha_inicio, fecha_fin, estado,
            especificaciones, configuracion, cantidad_personas, horas_hombre, costo_hora_hombre
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?, ?, ?, ?)
    `, [
        codigoProyecto, nombre, tipo, cliente_id,
        responsableFinal, descripcion,
        fecha_inicio, fecha_fin,
        especificaciones || null, configuracion || null, 
        Number(cantidad_personas || 0), Number(horas_hombre || 0), Number(costo_hora_hombre || 0)
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Proyecto creado exitosamente' });
    });
};

// Actualizar proyecto
export const updateProyecto = (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        nombre, codigo, tipo, cliente_id, responsable_id,
        responsable, fecha_inicio, fecha_fin, descripcion, estado,
        especificaciones, configuracion, cantidad_personas, horas_hombre, costo_hora_hombre
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
            especificaciones = COALESCE(?, especificaciones),
            configuracion = COALESCE(?, configuracion),
            cantidad_personas = COALESCE(?, cantidad_personas),
            horas_hombre = COALESCE(?, horas_hombre),
            costo_hora_hombre = COALESCE(?, costo_hora_hombre),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        codigoProyecto, nombre, tipo, cliente_id, responsableFinal, 
        fecha_inicio, fecha_fin, descripcion, estado,
        especificaciones, configuracion, 
        cantidad_personas !== undefined ? Number(cantidad_personas) : undefined, 
        horas_hombre !== undefined ? Number(horas_hombre) : undefined, 
        costo_hora_hombre !== undefined ? Number(costo_hora_hombre) : undefined, 
        id
    ],
    function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });
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
        if (assignmentErr) return res.status(500).json({ error: assignmentErr.message });

        if (unresolvedAssignments.length > 0) {
            return res.status(409).json({
                error: 'No se puede eliminar el proyecto mientras tenga materiales reservados, instalados, en trǭnsito o sin unidad fsica. DevuǸlvelos a disponible o dales de baja desde la lista de materiales del proyecto.',
                estados_bloqueantes: unresolvedAssignments.map((a) => a.stock_estado)
            });
        }

        db.run('DELETE FROM proyectos WHERE id = ?', [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });
            res.json({ message: 'Proyecto eliminado exitosamente' });
        });
    });
};

// Obtener materiales de un proyecto
export const getProyectoMateriales = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.all(`
        SELECT 
            ap.id, ap.proyecto_id, ap.producto_id, ap.stock_id,
            ap.cantidad_asignada, ap.cantidad_utilizada, ap.cantidad_devuelta,
            ap.estado, ap.observaciones, ap.created_at as fecha_asignacion,
            COALESCE(p.modelo, p.nombre) as material_nombre,
            tm.nombre as tipo, m.nombre as marca,
            s.serial_number, s.metraje, s.estado as stock_estado,
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
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

// ==========================================
// Módulo de Tareas del Proyecto
// ==========================================

export const getProyectoTareas = (req: Request, res: Response) => {
    const { id } = req.params;
    db.all(`SELECT * FROM proyecto_tareas WHERE proyecto_id = ? ORDER BY fecha_inicio ASC`, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};

export const createProyectoTarea = (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, fecha_inicio, fecha_fin, estado } = req.body;

    if (!nombre || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Nombre, fecha de inicio y fin son requeridos' });
    }

    db.run(`
        INSERT INTO proyecto_tareas (proyecto_id, nombre, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, ?)
    `, [id, nombre, fecha_inicio, fecha_fin, estado || 'pendiente'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Tarea creada' });
    });
};

export const updateProyectoTarea = (req: Request, res: Response) => {
    const { id, tareaId } = req.params;
    const { nombre, fecha_inicio, fecha_fin, estado } = req.body;

    db.run(`
        UPDATE proyecto_tareas SET
            nombre = COALESCE(?, nombre),
            fecha_inicio = COALESCE(?, fecha_inicio),
            fecha_fin = COALESCE(?, fecha_fin),
            estado = COALESCE(?, estado),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND proyecto_id = ?
    `, [nombre, fecha_inicio, fecha_fin, estado, tareaId, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
        res.json({ message: 'Tarea actualizada' });
    });
};

export const deleteProyectoTarea = (req: Request, res: Response) => {
    const { id, tareaId } = req.params;
    db.run(`DELETE FROM proyecto_tareas WHERE id = ? AND proyecto_id = ?`, [tareaId, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
        res.json({ message: 'Tarea eliminada' });
    });
};

// Obtener TODAS las tareas para el Dashboard Gantt
export const getAllTareas = (req: Request, res: Response) => {
    db.all(`
        SELECT t.*, p.nombre as proyecto_nombre, p.codigo as proyecto_codigo
        FROM proyecto_tareas t
        JOIN proyectos p ON t.proyecto_id = p.id
        ORDER BY t.fecha_inicio ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
};