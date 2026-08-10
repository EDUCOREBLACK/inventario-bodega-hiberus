import { Request, Response } from 'express';
import db from '../database/database';

// Resumen general del dashboard
export const getDashboardResumen = (req: Request, res: Response) => {
    const queries = {
        totalProductos: 'SELECT COUNT(*) as total FROM productos',
        totalStock: 'SELECT SUM(cantidad) as total FROM stock',
        totalProyectos: 'SELECT COUNT(*) as total FROM proyectos WHERE estado = "activo"',
        totalMovimientos: 'SELECT COUNT(*) as total FROM movimientos',
        valorTotal: 'SELECT SUM(p.precio_compra * s.cantidad) as total FROM stock s JOIN productos p ON s.producto_id = p.id'
    };

    const results: any = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    for (const [key, query] of Object.entries(queries)) {
        db.get(query, (err, row: any) => {
            if (err) {
                if (!res.headersSent) {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            results[key] = row ? row.total || 0 : 0;
            completed++;
            
            if (completed === totalQueries && !res.headersSent) {
                res.json(results);
            }
        });
    }
};

// Materiales con stock bajo
export const getStockBajo = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.id,
            p.sku,
            p.nombre,
            p.stock_minimo,
            tm.nombre as tipo,
            m.nombre as marca,
            COALESCE(SUM(s.cantidad), 0) as stock_total
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON p.id = s.producto_id
        GROUP BY p.id
        HAVING stock_total <= p.stock_minimo
        ORDER BY stock_total ASC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Costos por proyecto
export const getCostosProyectos = (req: Request, res: Response) => {
    db.all(`
        SELECT 
            p.id,
            p.nombre,
            p.tipo,
            p.estado,
            COUNT(ap.id) as total_materiales,
            COALESCE(SUM(ap.cantidad_asignada), 0) as total_asignado,
            COALESCE(SUM(ap.cantidad_utilizada), 0) as total_utilizado,
            COALESCE(SUM(ap.cantidad_asignada * pr.precio_compra), 0) as costo_estimado,
            COALESCE(SUM(ap.cantidad_utilizada * pr.precio_compra), 0) as costo_real
        FROM proyectos p
        LEFT JOIN asignaciones_proyecto ap ON p.id = ap.proyecto_id
        LEFT JOIN productos pr ON ap.producto_id = pr.id
        GROUP BY p.id
        ORDER BY costo_real DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Movimientos recientes
export const getMovimientosRecientes = (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    
    db.all(`
        SELECT 
            m.*,
            tm.nombre as tipo_movimiento,
            p.sku,
            p.nombre as material_nombre,
            md.cantidad
        FROM movimientos m
        LEFT JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN movimientos_detalle md ON m.id = md.movimiento_id
        LEFT JOIN productos p ON md.producto_id = p.id
        ORDER BY m.fecha_movimiento DESC
        LIMIT ?
    `, [Number(limit)], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};