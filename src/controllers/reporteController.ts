import { Request, Response } from 'express';
import db from '../database/database';

// Reporte de materiales
export const reporteMateriales = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.nombre,
            p.descripcion,
            tm.nombre as tipo,
            m.nombre as marca,
            p.modelo,
            COALESCE(SUM(s.cantidad), 0) as stock_total,
            p.precio_unitario,
            p.stock_minimo,
            p.estado
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON p.id = s.producto_id
        GROUP BY p.id
        ORDER BY p.nombre ASC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

// Reporte de movimientos por proyecto
export const reporteMovimientosProyecto = (req: Request, res: Response) => {
    const { proyecto_id } = req.params;
    
    db.all(`
        SELECT 
            pr.nombre as proyecto,
            p.sku,
            p.nombre as material,
            ap.cantidad_asignada,
            ap.cantidad_utilizada,
            ap.cantidad_devuelta,
            ap.estado,
            ap.fecha_asignacion,
            ap.fecha_uso,
            ap.observaciones
        FROM asignaciones_proyecto ap
        JOIN proyectos pr ON ap.proyecto_id = pr.id
        JOIN productos p ON ap.producto_id = p.id
        WHERE ap.proyecto_id = ?
        ORDER BY ap.fecha_asignacion DESC
    `, [proyecto_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

// Reporte de stock bajo
export const reporteStockBajo = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.nombre,
            tm.nombre as tipo,
            m.nombre as marca,
            COALESCE(SUM(s.cantidad), 0) as stock_total,
            p.stock_minimo,
            (p.stock_minimo - COALESCE(SUM(s.cantidad), 0)) as faltante
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON p.id = s.producto_id
        GROUP BY p.id
        HAVING stock_total <= p.stock_minimo
        ORDER BY faltante DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};
