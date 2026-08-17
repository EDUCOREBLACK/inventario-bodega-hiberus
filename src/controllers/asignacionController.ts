import { Request, Response } from 'express';
import db from '../database/database';

const calcularEstadoAsignacion = (cantidadAsignada: number, cantidadUtilizada: number, cantidadDevuelta: number) => {
    const pendiente = cantidadAsignada - cantidadUtilizada - cantidadDevuelta;
    if (pendiente <= 0) return 'devuelto';
    if (cantidadUtilizada > 0) return 'en_uso';
    return 'pendiente';
};

const parseSerialList = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
};

const registrarMovimientoProyecto = (
    proyectoId: number,
    productoId: number,
    stockId: number | null,
    cantidad: number,
    observaciones: string,
    onComplete: (error?: Error) => void
) => {
    if (!stockId) {
        onComplete(new Error('No se pudo identificar la unidad de stock asignada'));
        return;
    }

    db.get('SELECT sucursal_id, ubicacion_id, cantidad FROM stock WHERE id = ?', [stockId], (stockErr, stock: any) => {
        if (stockErr || !stock) {
            onComplete(stockErr || new Error('La unidad de stock asignada no existe'));
            return;
        }

        db.get(`SELECT id FROM tipos_movimiento WHERE codigo = 'SAL' ORDER BY id LIMIT 1`, (typeErr, tipo: any) => {
            if (typeErr || !tipo) {
                onComplete(typeErr || new Error('No existe el tipo de movimiento de salida'));
                return;
            }

            db.run(`
                INSERT INTO movimientos (
                    empresa_id, sucursal_id, tipo_movimiento_id, fecha_movimiento,
                    proyecto_id, descripcion, observaciones, estado
                ) VALUES (1, ?, ?, DATE('now'), ?, ?, ?, 'ejecutado')
            `, [stock.sucursal_id || 1, tipo.id, proyectoId, 'Asignación de material a proyecto', observaciones], function(movementErr) {
                if (movementErr) {
                    onComplete(movementErr);
                    return;
                }

                db.run(`
                    INSERT INTO movimientos_detalle (
                        movimiento_id, stock_id, producto_id, cantidad,
                        cantidad_anterior, cantidad_nueva, ubicacion_origen_id, observaciones
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [this.lastID, stockId, productoId, -cantidad, Number(stock.cantidad || 0), Number(stock.cantidad || 0), stock.ubicacion_id, observaciones], (detailErr) => {
                    onComplete(detailErr || undefined);
                });
            });
        });
    });
};

export const asignarStockAProyecto = (req: Request, res: Response) => {
    const { proyecto_id, producto_id, stock_id, cantidad, observaciones, seriales } = req.body;

    if (!proyecto_id || !producto_id) {
        res.status(400).json({ error: 'Proyecto y producto son requeridos' });
        return;
    }

    db.get('SELECT * FROM productos WHERE id = ?', [producto_id], (productErr, producto: any) => {
        if (productErr) {
            res.status(500).json({ error: productErr.message });
            return;
        }
        if (!producto) {
            res.status(404).json({ error: 'Producto no encontrado' });
            return;
        }

        const serialList = parseSerialList(seriales ?? req.body.serial_number ?? req.body.numero_serie);
        const requiereSerial = Boolean(producto.requiere_serial) || serialList.length > 0;

        if (requiereSerial && serialList.length === 0) {
            res.status(400).json({ error: 'Este material requiere ingresar el número de serie del componente para asignarlo al proyecto' });
            return;
        }

        const cantidadSolicitada = serialList.length > 0 ? serialList.length : Number(cantidad ?? 1);
        if (Number.isNaN(cantidadSolicitada) || cantidadSolicitada <= 0) {
            res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
            return;
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const finalizeAssignment = (stockId: number | null, totalAsignado: number, bodyText: string) => {
                db.get(`
                    SELECT id, cantidad_asignada, cantidad_utilizada, cantidad_devuelta
                    FROM asignaciones_proyecto
                    WHERE proyecto_id = ? AND producto_id = ? AND stock_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                `, [proyecto_id, producto_id, stockId], (err2, existing: any) => {
                    if (err2) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err2.message });
                        return;
                    }

                    if (existing) {
                        db.run(`
                            UPDATE asignaciones_proyecto
                            SET cantidad_asignada = cantidad_asignada + ?,
                                estado = ?,
                                observaciones = COALESCE(?, observaciones),
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [totalAsignado, calcularEstadoAsignacion(Number(existing.cantidad_asignada) + totalAsignado, Number(existing.cantidad_utilizada || 0), Number(existing.cantidad_devuelta || 0)), `${observaciones || 'Asignación'} | ${bodyText}`.trim(), existing.id], (updateErr) => {
                            if (updateErr) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: updateErr.message });
                                return;
                            }
                            registrarMovimientoProyecto(Number(proyecto_id), Number(producto_id), stockId, totalAsignado, bodyText, (movementErr) => {
                                if (movementErr) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: movementErr.message });
                                    return;
                                }
                                db.run('COMMIT');
                                res.status(201).json({ message: 'Asignación correcta', cantidad: totalAsignado, seriales: serialList });
                            });
                        });
                        return;
                    }

                    db.run(`
                        INSERT INTO asignaciones_proyecto (
                            proyecto_id, producto_id, stock_id, cantidad_asignada, cantidad_utilizada, cantidad_devuelta,
                            estado, observaciones
                        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
                    `, [proyecto_id, producto_id, stockId, totalAsignado, calcularEstadoAsignacion(totalAsignado, 0, 0), `${observaciones || 'Asignación'} | ${bodyText}`.trim()], (insertErr) => {
                        if (insertErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: insertErr.message });
                            return;
                        }
                        registrarMovimientoProyecto(Number(proyecto_id), Number(producto_id), stockId, totalAsignado, bodyText, (movementErr) => {
                            if (movementErr) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: movementErr.message });
                                return;
                            }
                            db.run('COMMIT');
                            res.status(201).json({ message: 'Asignación correcta', cantidad: totalAsignado, seriales: serialList });
                        });
                    });
                });
            };

            if (stock_id) {
                db.get(`
                    SELECT id, cantidad, serial_number, estado
                    FROM stock
                    WHERE id = ? AND producto_id = ?
                `, [stock_id, producto_id], (stockErr, stockRow: any) => {
                    if (stockErr) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: stockErr.message });
                        return;
                    }
                    if (!stockRow || stockRow.estado !== 'disponible' || Number(stockRow.cantidad || 0) < cantidadSolicitada) {
                        db.run('ROLLBACK');
                        res.status(400).json({ error: 'La unidad seleccionada ya no está disponible para asignar' });
                        return;
                    }

                    db.run(`
                        UPDATE stock
                        SET estado = 'reservado',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND producto_id = ?
                    `, [stockRow.id, producto_id], (updateErr) => {
                        if (updateErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: updateErr.message });
                            return;
                        }
                        finalizeAssignment(Number(stockRow.id), cantidadSolicitada, stockRow.serial_number ? `serial: ${stockRow.serial_number}` : `cantidad: ${cantidadSolicitada}`);
                    });
                });
                return;
            }

            if (serialList.length > 0) {
                const updates: Array<Promise<void>> = [];
                let stockId: number | null = null;

                serialList.forEach((serial) => {
                    updates.push(new Promise((resolve, reject) => {
                        db.get(`
                            SELECT id, cantidad, serial_number, estado
                            FROM stock
                            WHERE producto_id = ? AND estado = 'disponible' AND (serial_number = ? OR (serial_number IS NULL AND cantidad > 0))
                            ORDER BY id
                            LIMIT 1
                        `, [producto_id, serial], (findErr, row: any) => {
                            if (findErr) {
                                reject(findErr);
                                return;
                            }
                            if (!row) {
                                reject(new Error(`El serial ${serial} no está disponible en inventario`));
                                return;
                            }
                            stockId = row.id;

                            const nuevoCantidad = Number(row.cantidad || 0) - 1;
                            const nuevoSerial = row.serial_number || serial;
                            db.run(`
                                UPDATE stock
                                SET cantidad = ?,
                                    serial_number = ?,
                                    estado = CASE WHEN ? <= 0 THEN 'reservado' ELSE 'disponible' END,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = ? AND producto_id = ?
                            `, [Math.max(0, nuevoCantidad), nuevoSerial, nuevoCantidad, row.id, producto_id], (updateErr) => {
                                if (updateErr) {
                                    reject(updateErr);
                                    return;
                                }
                                resolve();
                            });
                        });
                    }));
                });

                Promise.all(updates)
                    .then(() => finalizeAssignment(stockId, serialList.length, `seriales: ${serialList.join(', ')}`))
                    .catch((updateErr) => {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: updateErr.message });
                    });
                return;
            }

            db.all(`
                SELECT id, ubicacion_id, cantidad
                FROM stock
                WHERE producto_id = ? AND estado = 'disponible' AND cantidad > 0
                ORDER BY id
            `, [producto_id], (err, rows: any[]) => {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const disponible = rows.reduce((sum, row) => sum + Number(row.cantidad || 0), 0);
                if (disponible < cantidadSolicitada) {
                    db.run('ROLLBACK');
                    res.status(400).json({ error: 'Stock insuficiente para asignar al proyecto' });
                    return;
                }

                let restante = cantidadSolicitada;
                const updates: Array<Promise<void>> = [];
                let stockId = rows[0]?.id || null;

                rows.forEach((row) => {
                    if (restante <= 0) return;
                    const aRestar = Math.min(Number(row.cantidad || 0), restante);
                    restante -= aRestar;
                    stockId = row.id;
                    updates.push(new Promise((resolve, reject) => {
                        db.run(`
                            UPDATE stock
                            SET cantidad = cantidad - ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ? AND producto_id = ?
                        `, [aRestar, row.id, producto_id], (updateErr) => {
                            if (updateErr) {
                                reject(updateErr);
                            } else {
                                resolve();
                            }
                        });
                    }));
                });

                Promise.all(updates)
                    .then(() => finalizeAssignment(stockId, cantidadSolicitada, `cantidad: ${cantidadSolicitada}`))
                    .catch((updateErr) => {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: updateErr.message });
                    });
            });
        });
    });
};

export const actualizarAsignacion = (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (cantidad === undefined || cantidad === null) {
        res.status(400).json({ error: 'La cantidad es requerida' });
        return;
    }

    const nuevaCantidad = Number(cantidad);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 0) {
        res.status(400).json({ error: 'La cantidad debe ser mayor o igual a cero' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get(`
            SELECT id, producto_id, stock_id, cantidad_asignada, cantidad_utilizada, cantidad_devuelta
            FROM asignaciones_proyecto
            WHERE id = ?
        `, [id], (err, row: any) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            if (!row) {
                db.run('ROLLBACK');
                res.status(404).json({ error: 'Asignación no encontrada' });
                return;
            }

            const asignada = Number(row.cantidad_asignada || 0);
            const utilizada = Number(row.cantidad_utilizada || 0);
            const devuelta = Number(row.cantidad_devuelta || 0);
            const minimoPermitido = utilizada + devuelta;

            if (nuevaCantidad < minimoPermitido) {
                db.run('ROLLBACK');
                res.status(400).json({ error: 'No puedes reducir la asignación por debajo de lo ya consumido o devuelto' });
                return;
            }

            if (nuevaCantidad === 0) {
                const pendiente = asignada - utilizada - devuelta;
                if (pendiente > 0) {
                    db.run(`
                        UPDATE stock
                        SET cantidad = cantidad + ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND producto_id = ?
                    `, [pendiente, row.stock_id, row.producto_id], (stockErr) => {
                        if (stockErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: stockErr.message });
                            return;
                        }

                        db.run('DELETE FROM asignaciones_proyecto WHERE id = ?', [id], (deleteErr) => {
                            if (deleteErr) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: deleteErr.message });
                                return;
                            }
                            db.run('COMMIT');
                            res.json({ message: 'Asignación eliminada correctamente' });
                        });
                    });
                } else {
                    db.run('DELETE FROM asignaciones_proyecto WHERE id = ?', [id], (deleteErr) => {
                        if (deleteErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: deleteErr.message });
                            return;
                        }
                        db.run('COMMIT');
                        res.json({ message: 'Asignación eliminada correctamente' });
                    });
                }
                return;
            }

            const diferencia = nuevaCantidad - asignada;

            if (diferencia > 0) {
                db.get(`
                    SELECT cantidad
                    FROM stock
                    WHERE id = ? AND producto_id = ? AND estado = 'disponible'
                `, [row.stock_id, row.producto_id], (stockErr, stockRow: any) => {
                    if (stockErr) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: stockErr.message });
                        return;
                    }
                    if (!stockRow || Number(stockRow.cantidad || 0) < diferencia) {
                        db.run('ROLLBACK');
                        res.status(400).json({ error: 'Stock insuficiente para aumentar la asignación' });
                        return;
                    }

                    db.run(`
                        UPDATE stock
                        SET cantidad = cantidad - ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND producto_id = ?
                    `, [diferencia, row.stock_id, row.producto_id], (updateStockErr) => {
                        if (updateStockErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: updateStockErr.message });
                            return;
                        }

                        db.run(`
                            UPDATE asignaciones_proyecto
                            SET cantidad_asignada = ?,
                                estado = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [nuevaCantidad, calcularEstadoAsignacion(nuevaCantidad, utilizada, devuelta), id], (updateErr) => {
                            if (updateErr) {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: updateErr.message });
                                return;
                            }
                            db.run('COMMIT');
                            res.json({ message: 'Asignación actualizada correctamente' });
                        });
                    });
                });
                return;
            }

            if (diferencia < 0) {
                const retorno = Math.abs(diferencia);
                db.run(`
                    UPDATE stock
                    SET cantidad = cantidad + ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND producto_id = ?
                `, [retorno, row.stock_id, row.producto_id], (stockErr) => {
                    if (stockErr) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: stockErr.message });
                        return;
                    }

                    db.run(`
                        UPDATE asignaciones_proyecto
                        SET cantidad_asignada = ?,
                            estado = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [nuevaCantidad, calcularEstadoAsignacion(nuevaCantidad, utilizada, devuelta), id], (updateErr) => {
                        if (updateErr) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: updateErr.message });
                            return;
                        }
                        db.run('COMMIT');
                        res.json({ message: 'Asignación actualizada correctamente' });
                    });
                });
                return;
            }

            db.run(`
                UPDATE asignaciones_proyecto
                SET estado = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [calcularEstadoAsignacion(asignada, utilizada, devuelta), id], (updateErr) => {
                if (updateErr) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: updateErr.message });
                    return;
                }
                db.run('COMMIT');
                res.json({ message: 'Asignación actualizada correctamente' });
            });
        });
    });
};

export const consumirAsignacion = (req: Request, res: Response) => {
    const { asignacion_id, cantidad } = req.body;
    if (!asignacion_id || !cantidad) {
        res.status(400).json({ error: 'Asignación y cantidad son requeridos' });
        return;
    }

    const cantidadSolicitada = Number(cantidad);
    if (Number.isNaN(cantidadSolicitada) || cantidadSolicitada <= 0) {
        res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
        return;
    }

    db.get(`
        SELECT id, cantidad_asignada, cantidad_utilizada, cantidad_devuelta
        FROM asignaciones_proyecto
        WHERE id = ?
    `, [asignacion_id], (err, row: any) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Asignación no encontrada' });
            return;
        }

        const pendiente = Number(row.cantidad_asignada || 0) - Number(row.cantidad_utilizada || 0) - Number(row.cantidad_devuelta || 0);
        if (cantidadSolicitada > pendiente) {
            res.status(400).json({ error: 'No puedes consumir más de lo pendiente' });
            return;
        }

        db.run(`
            UPDATE asignaciones_proyecto
            SET cantidad_utilizada = cantidad_utilizada + ?,
                estado = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [cantidadSolicitada, calcularEstadoAsignacion(Number(row.cantidad_asignada || 0), Number(row.cantidad_utilizada || 0) + cantidadSolicitada, Number(row.cantidad_devuelta || 0)), asignacion_id], (updateErr) => {
            if (updateErr) {
                res.status(500).json({ error: updateErr.message });
                return;
            }
            res.json({ message: 'Consumo registrado correctamente' });
        });
    });
};

export const actualizarEstadoAsignacion = (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['disponible', 'instalado', 'en_transito', 'en_mantenimiento', 'dado_baja'].includes(estado)) {
        res.status(400).json({ error: 'El estado no es válido para una unidad asignada' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get(`
            SELECT ap.id, ap.producto_id, ap.stock_id, ap.cantidad_asignada, ap.cantidad_utilizada,
                   ap.cantidad_devuelta, s.estado as stock_estado, s.cantidad as stock_cantidad
            FROM asignaciones_proyecto ap
            LEFT JOIN stock s ON s.id = ap.stock_id
            WHERE ap.id = ?
        `, [id], (readErr, assignment: any) => {
            if (readErr) {
                db.run('ROLLBACK');
                res.status(500).json({ error: readErr.message });
                return;
            }
            if (!assignment?.stock_id) {
                db.run('ROLLBACK');
                res.status(400).json({ error: 'Esta asignación no tiene una unidad física asociada' });
                return;
            }

            const pendiente = Number(assignment.cantidad_asignada || 0) - Number(assignment.cantidad_utilizada || 0) - Number(assignment.cantidad_devuelta || 0);
            if (pendiente <= 0) {
                db.run('ROLLBACK');
                res.status(400).json({ error: 'La asignación ya no tiene material pendiente' });
                return;
            }

            const cantidadFinal = estado === 'dado_baja' ? 0 : Number(assignment.stock_cantidad || 0);
            const activoFinal = estado === 'dado_baja' ? 0 : 1;

            db.run(`
                UPDATE stock
                SET cantidad = ?, estado = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND producto_id = ?
            `, [cantidadFinal, estado, activoFinal, assignment.stock_id, assignment.producto_id], (stockErr) => {
                if (stockErr) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: stockErr.message });
                    return;
                }

                const assignmentUpdate = estado === 'disponible'
                    ? `UPDATE asignaciones_proyecto SET cantidad_devuelta = cantidad_devuelta + ?, estado = 'devuelto', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
                    : estado === 'dado_baja'
                    ? `UPDATE asignaciones_proyecto SET cantidad_utilizada = cantidad_utilizada + ?, estado = 'cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
                    : `UPDATE asignaciones_proyecto SET estado = 'en_uso', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                const params = ['disponible', 'dado_baja'].includes(estado) ? [pendiente, id] : [id];

                db.run(assignmentUpdate, params, (updateErr) => {
                    if (updateErr) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: updateErr.message });
                        return;
                    }
                    db.run('COMMIT');
                    const messages: Record<string, string> = {
                        disponible: 'Material devuelto a bodega y disponible',
                        instalado: 'Material marcado como instalado',
                        en_transito: 'Material marcado en tránsito',
                        en_mantenimiento: 'Material marcado en mantenimiento',
                        dado_baja: 'Material dado de baja y descontado del inventario'
                    };
                    res.json({ message: messages[estado] });
                });
            });
        });
    });
};

export const devolverAsignacion = (req: Request, res: Response) => {
    const { asignacion_id, cantidad, observaciones } = req.body;
    if (!asignacion_id || !cantidad) {
        res.status(400).json({ error: 'Asignación y cantidad son requeridos' });
        return;
    }

    const cantidadSolicitada = Number(cantidad);
    if (Number.isNaN(cantidadSolicitada) || cantidadSolicitada <= 0) {
        res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get(`
            SELECT id, producto_id, stock_id, cantidad_asignada, cantidad_utilizada, cantidad_devuelta
            FROM asignaciones_proyecto
            WHERE id = ?
        `, [asignacion_id], (err, row: any) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            if (!row) {
                db.run('ROLLBACK');
                res.status(404).json({ error: 'Asignación no encontrada' });
                return;
            }

            const pendiente = Number(row.cantidad_asignada || 0) - Number(row.cantidad_utilizada || 0) - Number(row.cantidad_devuelta || 0);
            if (cantidadSolicitada > pendiente) {
                db.run('ROLLBACK');
                res.status(400).json({ error: 'No puedes devolver más de lo pendiente' });
                return;
            }

            db.run(`
                UPDATE stock
                SET cantidad = cantidad + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND producto_id = ?
            `, [cantidadSolicitada, row.stock_id, row.producto_id], (stockErr) => {
                if (stockErr) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: stockErr.message });
                    return;
                }

                db.run(`
                    UPDATE asignaciones_proyecto
                    SET cantidad_devuelta = cantidad_devuelta + ?,
                        estado = ?,
                        observaciones = COALESCE(?, observaciones),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [cantidadSolicitada, calcularEstadoAsignacion(Number(row.cantidad_asignada || 0), Number(row.cantidad_utilizada || 0), Number(row.cantidad_devuelta || 0) + cantidadSolicitada), observaciones || null, asignacion_id], (updateErr) => {
                    if (updateErr) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: updateErr.message });
                        return;
                    }
                    db.run('COMMIT');
                    res.json({ message: 'Material devuelto al inventario correctamente' });
                });
            });
        });
    });
};
