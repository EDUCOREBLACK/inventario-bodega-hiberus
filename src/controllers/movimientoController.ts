import { Request, Response } from 'express';
import db from '../database/database';

// Obtener todos los movimientos
export const getMovimientos = (req: Request, res: Response) => {
    const { limit = 100, offset = 0 } = req.query;
    
    db.all(`
        SELECT 
            m.*,
            tm.nombre as tipo_movimiento_nombre,
            p.sku as material_sku,
            p.nombre as material_nombre
        FROM movimientos m
        LEFT JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN movimientos_detalle md ON m.id = md.movimiento_id
        LEFT JOIN productos p ON md.producto_id = p.id
        ORDER BY m.fecha_movimiento DESC
        LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Obtener movimientos de un material específico
export const getMovimientosByMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    
    db.all(`
        SELECT 
            m.*,
            tm.nombre as tipo_movimiento_nombre,
            md.cantidad,
            md.metraje,
            md.precio_unitario,
            md.costo_total,
            u_origen.nombre as ubicacion_origen,
            u_destino.nombre as ubicacion_destino
        FROM movimientos m
        LEFT JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN movimientos_detalle md ON m.id = md.movimiento_id
        LEFT JOIN ubicaciones u_origen ON md.ubicacion_origen_id = u_origen.id
        LEFT JOIN ubicaciones u_destino ON md.ubicacion_destino_id = u_destino.id
        WHERE md.producto_id = ?
        ORDER BY m.fecha_movimiento DESC
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Registrar un movimiento de entrada
export const registrarEntrada = (req: Request, res: Response) => {
    const {
        producto_id,
        cantidad,
        ubicacion_id,
        lote_id,
        observaciones
    } = req.body;

    if (!producto_id || !cantidad || !ubicacion_id) {
        res.status(400).json({ error: 'Producto, cantidad y ubicación son requeridos' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(`
            INSERT INTO movimientos (
                empresa_id, sucursal_id, tipo_movimiento_id,
                fecha_movimiento, descripcion, estado
            ) VALUES (1, 1, 1, DATE('now'), ?, 'ejecutado')
        `, [observaciones || 'Entrada de stock'], function(err) {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }

            const movimientoId = this.lastID;

            db.run(`
                INSERT INTO movimientos_detalle (
                    movimiento_id, producto_id, cantidad,
                    ubicacion_destino_id, observaciones
                ) VALUES (?, ?, ?, ?, ?)
            `, [movimientoId, producto_id, cantidad, ubicacion_id, observaciones], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                // Actualizar stock
                db.run(`
                    INSERT INTO stock (producto_id, ubicacion_id, cantidad, estado)
                    VALUES (?, ?, ?, 'disponible')
                    ON CONFLICT(producto_id, ubicacion_id) DO UPDATE SET
                        cantidad = cantidad + ?,
                        updated_at = CURRENT_TIMESTAMP
                `, [producto_id, ubicacion_id, cantidad, cantidad], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    db.run('COMMIT');
                    res.status(201).json({
                        message: 'Entrada registrada exitosamente',
                        movimientoId
                    });
                });
            });
        });
    });
};

// Registrar un movimiento de salida
export const registrarSalida = (req: Request, res: Response) => {
    const {
        producto_id,
        cantidad,
        ubicacion_id,
        proyecto_id,
        observaciones
    } = req.body;

    if (!producto_id || !cantidad || !ubicacion_id) {
        res.status(400).json({ error: 'Producto, cantidad y ubicación son requeridos' });
        return;
    }

    // Verificar stock disponible
    db.get(
        'SELECT cantidad FROM stock WHERE producto_id = ? AND ubicacion_id = ? AND estado = "disponible"',
        [producto_id, ubicacion_id],
        (err, row: any) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!row || row.cantidad < cantidad) {
                res.status(400).json({ error: 'Stock insuficiente' });
                return;
            }

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.run(`
                    INSERT INTO movimientos (
                        empresa_id, sucursal_id, tipo_movimiento_id,
                        fecha_movimiento, proyecto_id, descripcion, estado
                    ) VALUES (1, 1, 2, DATE('now'), ?, ?, 'ejecutado')
                `, [proyecto_id, observaciones || 'Salida de stock'], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const movimientoId = this.lastID;

                    db.run(`
                        INSERT INTO movimientos_detalle (
                            movimiento_id, producto_id, cantidad,
                            ubicacion_origen_id, observaciones
                        ) VALUES (?, ?, ?, ?, ?)
                    `, [movimientoId, producto_id, -cantidad, ubicacion_id, observaciones], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        // Actualizar stock
                        db.run(`
                            UPDATE stock 
                            SET cantidad = cantidad - ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE producto_id = ? AND ubicacion_id = ? AND estado = "disponible"
                        `, [cantidad, producto_id, ubicacion_id], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                            }

                            // Si tiene proyecto, registrar asignación
                            if (proyecto_id) {
                                db.run(`
                                    INSERT INTO asignaciones_proyecto (
                                        proyecto_id, producto_id, stock_id,
                                        cantidad_asignada, cantidad_utilizada,
                                        fecha_asignacion, estado, observaciones
                                    ) VALUES (?, ?, NULL, ?, ?, DATE('now'), 'en_uso', ?)
                                `, [proyecto_id, producto_id, cantidad, cantidad, observaciones]);
                            }

                            db.run('COMMIT');
                            res.status(201).json({
                                message: 'Salida registrada exitosamente',
                                movimientoId
                            });
                        });
                    });
                });
            });
        }
    );
};