import { Request, Response } from 'express';
import db from '../database/database';

// ============================================
// LISTAR MOVIMIENTOS
// ============================================

export const getMovimientos = (req: Request, res: Response) => {
    const { limit = 100, offset = 0, producto_id, tipo, proyecto_id } = req.query;
    const requestedLimit = Number(limit);
    const requestedOffset = Number(offset);
    const safeLimit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const safeOffset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
    
    let query = `
        SELECT 
            m.*,
            tm.nombre as tipo_movimiento_nombre,
            COALESCE(p.modelo, p.nombre) as material_nombre,
            md.cantidad,
            md.metraje,
            u.nombre as responsable_nombre,
            pr.nombre as proyecto_nombre
        FROM movimientos m
        LEFT JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN movimientos_detalle md ON m.id = md.movimiento_id
        LEFT JOIN productos p ON md.producto_id = p.id
        LEFT JOIN usuarios u ON m.responsable_id = u.id
        LEFT JOIN proyectos pr ON m.proyecto_id = pr.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (producto_id) {
        query += ` AND md.producto_id = ?`;
        params.push(producto_id);
    }
    if (tipo) {
        query += ` AND tm.codigo = ?`;
        params.push(tipo);
    }
    if (proyecto_id) {
        query += ` AND m.proyecto_id = ?`;
        params.push(proyecto_id);
    }

    query += ` ORDER BY m.fecha_movimiento DESC LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// ============================================
// REGISTRAR ENTRADA
// ============================================

export const registrarEntrada = (req: Request, res: Response) => {
    const {
        producto_id,
        cantidad,
        ubicacion_id,
        lote_id,
        proveedor_id,
        documento,
        observaciones
    } = req.body;

    if (!producto_id || !cantidad || !ubicacion_id) {
        res.status(400).json({ error: 'Producto, cantidad y ubicación son requeridos' });
        return;
    }

    if (cantidad <= 0) {
        res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Obtener stock actual
        db.get(`
            SELECT cantidad FROM stock WHERE producto_id = ? AND ubicacion_id = ?
        `, [producto_id, ubicacion_id], (err, row: any) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }

            const cantidadAnterior = row ? row.cantidad : 0;
            const cantidadNueva = cantidadAnterior + cantidad;

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

                // Crear movimiento
                db.run(`
                    INSERT INTO movimientos (
                        empresa_id, sucursal_id, tipo_movimiento_id,
                        documento_numero, fecha_movimiento, descripcion, estado
                    ) VALUES (1, 1, 1, ?, DATE('now'), ?, 'ejecutado')
                `, [documento || `ENT-${Date.now()}`, observaciones || 'Entrada de stock'], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const movimientoId = this.lastID;

                    // Detalle del movimiento
                    db.run(`
                        INSERT INTO movimientos_detalle (
                            movimiento_id, producto_id, cantidad,
                            cantidad_anterior, cantidad_nueva,
                            ubicacion_destino_id, observaciones
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        movimientoId, producto_id, cantidad,
                        cantidadAnterior, cantidadNueva,
                        ubicacion_id, observaciones || 'Entrada de stock'
                    ], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        // Si tiene lote, actualizar
                        if (lote_id) {
                            db.run(`
                                UPDATE stock SET lote_id = ? 
                                WHERE producto_id = ? AND ubicacion_id = ?
                            `, [lote_id, producto_id, ubicacion_id]);
                        }

                        db.run('COMMIT');
                        res.status(201).json({
                            message: 'Entrada registrada exitosamente',
                            movimientoId,
                            stock_anterior: cantidadAnterior,
                            stock_nuevo: cantidadNueva
                        });
                    });
                });
            });
        });
    });
};

// ============================================
// REGISTRAR SALIDA
// ============================================

export const registrarSalida = (req: Request, res: Response) => {
    const {
        producto_id,
        cantidad,
        ubicacion_id,
        proyecto_id,
        responsable,
        observaciones
    } = req.body;

    if (!producto_id || !cantidad || !ubicacion_id) {
        res.status(400).json({ error: 'Producto, cantidad y ubicación son requeridos' });
        return;
    }

    if (cantidad <= 0) {
        res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        return;
    }

    // Verificar stock disponible
    db.get(`
        SELECT cantidad FROM stock WHERE producto_id = ? AND ubicacion_id = ? AND estado = 'disponible'
    `, [producto_id, ubicacion_id], (err, row: any) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!row || row.cantidad < cantidad) {
            res.status(400).json({ 
                error: 'Stock insuficiente',
                disponible: row ? row.cantidad : 0,
                solicitado: cantidad
            });
            return;
        }

        const cantidadAnterior = row.cantidad;
        const cantidadNueva = cantidadAnterior - cantidad;

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Actualizar stock
            db.run(`
                UPDATE stock 
                SET cantidad = cantidad - ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE producto_id = ? AND ubicacion_id = ? AND estado = 'disponible'
            `, [cantidad, producto_id, ubicacion_id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                // Crear movimiento
                db.run(`
                    INSERT INTO movimientos (
                        empresa_id, sucursal_id, tipo_movimiento_id,
                        fecha_movimiento, proyecto_id, descripcion, estado
                    ) VALUES (1, 1, 2, DATE('now'), ?, ?, 'ejecutado')
                `, [proyecto_id || null, observaciones || 'Salida de stock'], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const movimientoId = this.lastID;

                    // Detalle del movimiento
                    db.run(`
                        INSERT INTO movimientos_detalle (
                            movimiento_id, producto_id, cantidad,
                            cantidad_anterior, cantidad_nueva,
                            ubicacion_origen_id, observaciones
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        movimientoId, producto_id, -cantidad,
                        cantidadAnterior, cantidadNueva,
                        ubicacion_id, observaciones || 'Salida de stock'
                    ], (err) => {
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
                            `, [proyecto_id, producto_id, cantidad, cantidad, observaciones || 'Asignado al proyecto']);
                        }

                        db.run('COMMIT');
                        res.status(201).json({
                            message: 'Salida registrada exitosamente',
                            movimientoId,
                            stock_anterior: cantidadAnterior,
                            stock_nuevo: cantidadNueva
                        });
                    });
                });
            });
        });
    });
};

// ============================================
// MOVIMIENTOS POR PRODUCTO
// ============================================

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
            u_destino.nombre as ubicacion_destino,
            pr.nombre as proyecto_nombre
        FROM movimientos m
        LEFT JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN movimientos_detalle md ON m.id = md.movimiento_id
        LEFT JOIN ubicaciones u_origen ON md.ubicacion_origen_id = u_origen.id
        LEFT JOIN ubicaciones u_destino ON md.ubicacion_destino_id = u_destino.id
        LEFT JOIN proyectos pr ON m.proyecto_id = pr.id
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

export default db;