import { Request, Response } from 'express';
import db from '../database/database';

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

const parseSerialList = (raw: any): string[] => {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(/\r?\n|,/) 
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

// ============================================
// CRUD BÁSICO DE MATERIALES
// ============================================

// Obtener todos los materiales (productos)
export const getMateriales = (req: Request, res: Response) => {
    const { search, tipo, marca, stock_min, stock_max } = req.query;
    
    let query = `
        SELECT 
            p.*,
            tm.nombre as tipo_nombre,
            m.nombre as marca_nombre,
            pr.nombre as proveedor_nombre,
            COALESCE((SELECT SUM(s.cantidad) FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso'))))), 0) as stock_total,
            COALESCE((SELECT AVG(s.metraje) FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso'))))), p.metraje, 0) as metraje_unitario,
            COALESCE((SELECT s.ubicacion_id FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso')))) ORDER BY s.id LIMIT 1), NULL) as ubicacion_id
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    if (tipo) {
        query += ` AND tm.nombre = ?`;
        params.push(tipo);
    }
    if (marca) {
        query += ` AND m.nombre = ?`;
        params.push(marca);
    }

    query += ` ORDER BY p.created_at DESC`;

    db.all(query, params, (err, rows) => {
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
            pr.nombre as proveedor_nombre,
            COALESCE((SELECT SUM(s.cantidad) FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso'))))), 0) as stock_total,
            COALESCE((SELECT AVG(s.metraje) FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso'))))), p.metraje, 0) as metraje_unitario,
            COALESCE((SELECT s.ubicacion_id FROM stock s WHERE s.producto_id = p.id AND s.activo = 1 AND s.cantidad > 0 AND (s.estado = 'disponible' OR (s.estado = 'en_mantenimiento' AND NOT EXISTS (SELECT 1 FROM asignaciones_proyecto ap WHERE ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso')))) ORDER BY s.id LIMIT 1), NULL) as ubicacion_id
        FROM productos p
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE p.id = ?
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

// Crear un nuevo material (producto maestro)
export const createMaterial = (req: Request, res: Response) => {
    const {
        tipo_material_id, marca_id, proveedor_id, nombre,
        descripcion, modelo, unidad_medida_id,
        stock_minimo, precio_unitario, ubicacion_id,
        area_id, cantidad_inicial, metraje_inicial,
        estado, requiere_serial, requiere_metraje,
        serial_number, numero_serie, metraje
    } = req.body;

    const nombreFinal = (nombre || modelo || '').toString().trim();
    const modeloFinal = (modelo || nombre || '').toString().trim();
    const cantidadInicial = Number(cantidad_inicial || 0);
    const metrajeFinal = parseInt(metraje || 0, 10) || 0;
    const cantidadItems = Math.max(0, Math.round(cantidadInicial));

    if (!tipo_material_id || !nombreFinal) {
        res.status(400).json({ error: 'Tipo y modelo son requeridos' });
        return;
    }

    const unidadValida = (() => {
        const value = Number(unidad_medida_id);
        return Number.isFinite(value) && value > 0 ? value : null;
    })();

    db.serialize(() => {
        const resolveFk = (table: string, value: any) => {
            const cleaned = Number(value);
            if (!Number.isFinite(cleaned) || cleaned <= 0) return null;
            return new Promise<number | null>((resolveFkValue) => {
                db.get(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [cleaned], (err, row: any) => {
                    if (err) {
                        resolveFkValue(null);
                        return;
                    }
                    resolveFkValue(row ? Number(row.id) : null);
                });
            });
        };

        db.run('BEGIN TRANSACTION');

        Promise.all([
            resolveFk('tipos_material', tipo_material_id),
            resolveFk('marcas', marca_id),
            resolveFk('proveedores', proveedor_id),
            resolveFk('ubicaciones', ubicacion_id),
            resolveFk('areas', area_id)
        ]).then(([tipoId, marcaId, proveedorId, ubicacionIdValid, areaIdValid]) => {
            const safeTipoId = tipoId ?? null;
            const safeMarcaId = marcaId ?? null;
            const safeProveedorId = proveedorId ?? null;
            const safeAreaId = areaIdValid ?? null;
            const safeUbicacionId = ubicacionIdValid ?? 1;

            db.run(`
                INSERT INTO productos (
                    empresa_id, tipo_material_id, marca_id, proveedor_id,
                    nombre, descripcion, modelo, unidad_medida_id,
                    requiere_serial, requiere_metraje,
                    stock_minimo, precio_unitario, metraje,
                    numero_serie, moneda, estado
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?)
            `, [
                safeTipoId, safeMarcaId, safeProveedorId,
                nombreFinal, descripcion, modeloFinal, unidadValida,
                requiere_serial !== undefined ? (requiere_serial ? 1 : 0) : 0,
                requiere_metraje !== undefined ? (requiere_metraje ? 1 : 0) : 0,
                Number(stock_minimo || 0),
                Number(precio_unitario || 0),
                metrajeFinal,
                (numero_serie || serial_number || null),
                estado || 'activo'
            ], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }

                const productoId = this.lastID;

                const crearStockMasivo = () => {
                    if (cantidadItems <= 0 && metrajeFinal <= 0 && !(numero_serie || serial_number)) {
                        db.run('COMMIT');
                        res.status(201).json({
                            id: productoId,
                            message: 'Material creado exitosamente'
                        });
                        return;
                    }

                    const filas: Array<[number, number | null, number, number, number, number, string | null, string]> = [];
                    const seriales = (numero_serie || serial_number || '').toString().split(/\r?\n|,/).map((item: string) => item.trim()).filter(Boolean);
                    const unidadesAcrear = Math.max(1, cantidadItems || seriales.length || 1);

                    for (let index = 0; index < unidadesAcrear; index += 1) {
                        const serialAsignado = seriales[index] || null;
                        const cantidadUnidad = 1;
                        const metrajeUnidad = requiere_metraje ? metrajeFinal : 0;
                        filas.push([
                            productoId,
                            safeAreaId,
                            1,
                            safeUbicacionId,
                            cantidadUnidad,
                            metrajeUnidad,
                            serialAsignado,
                            'disponible'
                        ]);
                    }

                    const stmt = `
                        INSERT INTO stock (producto_id, area_id, sucursal_id, ubicacion_id, cantidad, metraje, serial_number, estado)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    db.serialize(() => {
                        let pending = filas.length;
                        if (pending === 0) {
                            db.run('COMMIT');
                            res.status(201).json({ id: productoId, message: 'Material creado exitosamente con stock inicial' });
                            return;
                        }

                        filas.forEach((fila) => {
                            db.run(stmt, fila, (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                pending -= 1;
                                if (pending === 0) {
                                    db.run('COMMIT');
                                    res.status(201).json({
                                        id: productoId,
                                        message: `Material creado exitosamente con ${unidadesAcrear} unidades registradas`
                                    });
                                }
                            });
                        });
                    });
                };

                crearStockMasivo();
            });
        }).catch((err) => {
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message || 'Error validando referencias del producto' });
        });
    });
};

// Actualizar un material
export const updateMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        tipo_material_id, marca_id, proveedor_id, nombre,
        descripcion, modelo, unidad_medida_id,
        requiere_serial, requiere_metraje,
        stock_minimo, precio_unitario,
        estado, serial_number, numero_serie, metraje,
        cantidad_inicial, metraje_inicial,
        area_id, ubicacion_id
    } = req.body;

    db.get('SELECT * FROM productos WHERE id = ?', [id], (fetchErr, currentMaterial: any) => {
        if (fetchErr) {
            res.status(500).json({ error: fetchErr.message });
            return;
        }
        if (!currentMaterial) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }

        const nombreFinal = ((nombre ?? modelo ?? currentMaterial.nombre ?? currentMaterial.modelo) || '').toString().trim();
        const modeloFinal = ((modelo ?? nombre ?? currentMaterial.modelo ?? currentMaterial.nombre) || '').toString().trim();
        // Priorizar metraje (campo editado)
        const metrajeFinal = (metraje !== undefined && metraje !== null && metraje !== '')
            ? parseInt(metraje, 10)
            : parseInt(currentMaterial.metraje ?? 0, 10);
        const ubicacionId = Number(ubicacion_id ?? currentMaterial.ubicacion_id ?? 1);
        const areaId = area_id !== undefined ? Number(area_id) : (currentMaterial.area_id ?? null);

        db.run(`
            UPDATE productos SET
                tipo_material_id = COALESCE(?, tipo_material_id),
                marca_id = COALESCE(?, marca_id),
                proveedor_id = COALESCE(?, proveedor_id),
                nombre = COALESCE(?, nombre),
                descripcion = COALESCE(?, descripcion),
                modelo = COALESCE(?, modelo),
                unidad_medida_id = COALESCE(?, unidad_medida_id),
                requiere_serial = COALESCE(?, requiere_serial),
                requiere_metraje = COALESCE(?, requiere_metraje),
                stock_minimo = COALESCE(?, stock_minimo),
                precio_unitario = COALESCE(?, precio_unitario),
                numero_serie = COALESCE(?, numero_serie),
                metraje = ?,
                estado = COALESCE(?, estado),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            tipo_material_id ?? currentMaterial.tipo_material_id,
            marca_id ?? currentMaterial.marca_id,
            proveedor_id ?? currentMaterial.proveedor_id,
            nombreFinal || currentMaterial.nombre,
            descripcion ?? currentMaterial.descripcion,
            modeloFinal || currentMaterial.modelo,
            unidad_medida_id ?? currentMaterial.unidad_medida_id,
            requiere_serial ?? currentMaterial.requiere_serial,
            requiere_metraje ?? currentMaterial.requiere_metraje,
            stock_minimo ?? currentMaterial.stock_minimo,
            precio_unitario ?? currentMaterial.precio_unitario,
            (numero_serie || serial_number || currentMaterial.numero_serie || null),
            metrajeFinal,
            estado ?? currentMaterial.estado,
            id
        ], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Material no encontrado' });
                return;
            }

            // Propagar metraje a todas las unidades de stock de este producto
            db.run(
                `UPDATE stock SET metraje = ?, updated_at = CURRENT_TIMESTAMP WHERE producto_id = ?`,
                [metrajeFinal, id],
                (stockErr) => {
                    if (stockErr) {
                        console.error('Error propagando metraje a stock:', stockErr.message);
                    }
                    res.json({ message: 'Material actualizado exitosamente' });
                }
            );
        });
    });
};


// Eliminar un material
export const deleteMaterial = (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify product exists and check its status
    db.get('SELECT estado FROM productos WHERE id = ?', [id], (productErr, productRow: any) => {
        if (productErr) {
            res.status(500).json({ error: productErr.message });
            return;
        }
        if (!productRow) {
            res.status(404).json({ error: 'Material no encontrado' });
            return;
        }
        if (productRow.estado !== 'disponible') {
            res.status(400).json({ error: 'Sólo se puede eliminar un material con estado disponible' });
            return;
        }
        // Check for stock with serial numbers
        db.get('SELECT COUNT(*) as serialCount FROM stock WHERE producto_id = ? AND serial_number IS NOT NULL', [id], (serialErr, serialRow: any) => {
            if (serialErr) {
                res.status(500).json({ error: serialErr.message });
                return;
            }
            if (serialRow.serialCount > 0) {
                res.status(400).json({ error: 'No se puede eliminar el material porque existen unidades con número de serie' });
                return;
            }
            // Check for any physical stock
            db.get('SELECT COUNT(*) as total FROM stock WHERE producto_id = ?', [id], (stockErr, stockRow: any) => {
                if (stockErr) {
                    res.status(500).json({ error: stockErr.message });
                    return;
                }
                if (Number(stockRow?.total || 0) > 0) {
                    // Soft delete: mark as inactivo
                    db.run(`
                        UPDATE productos
                        SET estado = 'inactivo', updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [id], function(updateErr) {
                        if (updateErr) {
                            res.status(500).json({ error: updateErr.message });
                            return;
                        }
                        res.status(409).json({
                            error: 'No se puede eliminar este material porque tiene stock físico o unidades registradas. Se marcó como inactivo.'
                        });
                    });
                    return;
                }
                // Hard delete when no stock at all
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
            });
        });
    });
};

// ============================================
// GESTIÓN DE STOCK
// ============================================

// Ver stock de un material por ubicación
export const getMaterialStock = (req: Request, res: Response) => {
    const { id } = req.params;
    db.all(`
        SELECT 
            s.*,
            u.nombre as ubicacion_nombre,
            l.codigo as lote_codigo,
            l.descripcion as lote_descripcion,
            ap.proyecto_id as proyecto_asignado_id
        FROM stock s
        LEFT JOIN ubicaciones u ON s.ubicacion_id = u.id
        LEFT JOIN lotes l ON s.lote_id = l.id
        LEFT JOIN asignaciones_proyecto ap ON ap.stock_id = s.id AND ap.estado IN ('pendiente', 'en_uso')
        WHERE s.producto_id = ? AND s.activo = 1 AND s.cantidad > 0
        ORDER BY s.cantidad DESC
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

// Ajustar stock manualmente
export const bulkUpdateMaterials = (req: Request, res: Response) => {
    const { ids, precio_unitario, metraje } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'Se requiere una lista de IDs de materiales' });
        return;
    }
    // Ensure only allowed fields are present
    if (precio_unitario === undefined && metraje === undefined) {
        res.status(400).json({ error: 'Debe proporcionar al menos precio_unitario o metraje para actualizar' });
        return;
    }
    const fields: string[] = [];
    const params: any[] = [];
    if (precio_unitario !== undefined) {
        fields.push('precio_unitario = ?');
        params.push(Number(precio_unitario) || 0);
    }
    if (metraje !== undefined) {
        fields.push('metraje = ?');
        params.push(Number(metraje) || 0);
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE productos SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    params.push(...ids);
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // After updating productos, propagate metraje to stock if provided
    if (metraje !== undefined) {
        const stockSql = `UPDATE stock SET metraje = ? WHERE producto_id IN (${placeholders})`;
        const stockParams = [Number(metraje) || 0, ...ids];
        db.run(stockSql, stockParams, function(stockErr) {
            if (stockErr) {
                // Log error but do not fail the whole operation
                console.error('Error actualizando metraje en stock:', stockErr.message);
            }
        });
    }
    res.json({ message: 'Materiales actualizados exitosamente', affectedRows: this.changes });
    });
};
export const addStock = (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad, metraje, seriales, ubicacion_id } = req.body;
    
    const cantidadFinal = Math.max(1, Number(cantidad || 1));
    const metrajeFinal = Math.max(0, Number(metraje || 0));
    const ubicacionFinal = Number(ubicacion_id || 1);
    const serialesList = Array.isArray(seriales) ? seriales.filter(Boolean) : (typeof seriales === 'string' ? seriales.split(',').map(s=>s.trim()).filter(Boolean) : []);

    db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Producto no encontrado' });

        if (serialesList.length > 0) {
            const inserts = serialesList.map((serial: string) => new Promise<void>((resolve, reject) => {
                db.run(`
                    INSERT INTO stock (producto_id, ubicacion_id, cantidad, metraje, serial_number, estado, activo)
                    VALUES (?, ?, 1, ?, ?, 'disponible', 1)
                `, [id, ubicacionFinal, metrajeFinal, serial], (err) => err ? reject(err) : resolve());
            }));
            
            Promise.all(inserts)
                .then(() => res.json({ message: 'Stock agregado correctamente' }))
                .catch((e) => res.status(500).json({ error: e.message }));
        } else {
            db.run(`
                INSERT INTO stock (producto_id, ubicacion_id, cantidad, metraje, serial_number, estado, activo)
                VALUES (?, ?, ?, ?, NULL, 'disponible', 1)
            `, [id, ubicacionFinal, cantidadFinal, metrajeFinal], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Stock agregado correctamente' });
            });
        }
    });
};


export const actualizarUnidadStock = (req: Request, res: Response) => {
    const { id, stockId } = req.params;
const { serial_number, metraje, estado, ubicacion_id, area_id } = req.body;
        const serialFinal = typeof serial_number === 'string' ? serial_number.trim() : serial_number;
    const metrajeFinal = metraje === undefined || metraje === null ? null : Number(metraje);

    if (!stockId) {
        res.status(400).json({ error: 'Falta el identificador de la unidad' });
        return;
    }

    db.get(`
        SELECT id FROM stock WHERE id = ? AND producto_id = ?
    `, [stockId, id], (err, row: any) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }

        if (serialFinal) {
            db.get(`
                SELECT id FROM stock WHERE serial_number = ? AND id != ?
            `, [serialFinal, stockId], (err2, duplicate: any) => {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                if (duplicate) {
                    res.status(400).json({ error: 'Ese número de serie ya existe en otra unidad' });
                    return;
                }

                updateUnit();
            });
        } else {
            updateUnit();
        }
    });

    const updateUnit = () => {
        // if (['reservado', 'instalado', 'en_transito'].includes(estado)) {
        //     res.status(400).json({ error: 'Las unidades solo pueden quedar reservadas, instaladas o en tránsito desde su proyecto asignado.' });
        //     return;
        // }

        const persistUnit = () => db.run(`
            UPDATE stock
            SET serial_number = COALESCE(?, serial_number),
                metraje = COALESCE(?, metraje),
                estado = COALESCE(?, estado),
                cantidad = CASE WHEN ? = 'dado_baja' THEN 0 ELSE cantidad END,
                activo = CASE WHEN ? = 'dado_baja' THEN 0 ELSE activo END,
                ubicacion_id = COALESCE(?, ubicacion_id),
                area_id = COALESCE(?, area_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND producto_id = ?
        `, [
            serialFinal || null,
            metrajeFinal,
            estado || null,
            estado || null,
            estado || null,
            ubicacion_id === undefined ? null : Number(ubicacion_id || null),
            area_id === undefined ? null : Number(area_id || null),
            stockId,
            id
        ], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (this.changes === 0) {
                res.status(404).json({ error: 'No se pudo actualizar la unidad' });
                return;
            }

            if (estado !== 'disponible') {
                res.json({ message: 'Unidad actualizada correctamente' });
                return;
            }

            res.json({ message: 'Unidad actualizada correctamente' });
        });

        if (!estado) {
            persistUnit();
            return;
        }

        db.get(`
            SELECT ap.id
            FROM asignaciones_proyecto ap
            JOIN stock s ON s.id = ap.stock_id
            WHERE ap.stock_id = ?
              AND ap.producto_id = ?
                            AND ap.estado IN ('pendiente', 'en_uso')
            LIMIT 1
        `, [stockId, id], (assignmentErr, assignment: any) => {
            if (assignmentErr) {
                res.status(500).json({ error: assignmentErr.message });
                return;
            }
            if (assignment) {
                res.status(409).json({ error: 'Esta unidad está vinculada a un proyecto. Cambia su estado desde la lista de materiales del proyecto.' });
                return;
            }
            persistUnit();
        });
    };
};

export const deleteUnidadStock = (req: Request, res: Response) => {
    const { id, stockId } = req.params;
    const { cantidad, motivo } = req.body || {};

    db.get(`
        SELECT * FROM stock WHERE id = ? AND producto_id = ?
    `, [stockId, id], (error, row: any) => {
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Unidad de stock no encontrada' });
            return;
        }

        const cantidadActual = Number(row.cantidad || 1);
        const metrajeActual = Number(row.metraje || 0);
        const cantidadAEliminar = Number(cantidad ?? cantidadActual);
        const cantidadFinal = Math.max(0, cantidadActual - (Number.isFinite(cantidadAEliminar) && cantidadAEliminar > 0 ? cantidadAEliminar : cantidadActual));

        if (row.serial_number || cantidadActual <= 1 || cantidadAEliminar >= cantidadActual) {
            db.run(`
                UPDATE stock
                SET cantidad = 0,
                    estado = 'dado_baja',
                    activo = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND producto_id = ?
            `, [stockId, id], function(deleteErr) {
                if (deleteErr) {
                    res.status(500).json({ error: deleteErr.message });
                    return;
                }

                if (this.changes === 0) {
                    res.status(404).json({ error: 'No se pudo eliminar la unidad de stock' });
                    return;
                }

                res.json({
                    message: 'Unidad dada de baja correctamente',
                    eliminado: true
                });
            });
            return;
        }

        db.run(`
            UPDATE stock
            SET cantidad = ?,
                metraje = CASE WHEN ? > 0 THEN ? ELSE metraje END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND producto_id = ?
        `, [cantidadFinal, cantidadFinal, Math.max(0, metrajeActual), stockId, id], function(updateErr) {
            if (updateErr) {
                res.status(500).json({ error: updateErr.message });
                return;
            }

            if (this.changes === 0) {
                res.status(404).json({ error: 'No se pudo descontar la cantidad solicitada' });
                return;
            }

            res.json({
                message: 'Cantidad eliminada correctamente',
                cantidad_eliminada: cantidadAEliminar,
                cantidad_restante: cantidadFinal,
                eliminado: false
            });
        });
    });
};

// ============================================
// IMÁGENES
// ============================================

export const uploadImage = (req: MulterRequest, res: Response) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        res.status(400).json({ error: 'No se ha subido ninguna imagen' });
        return;
    }

    const imageUrl = `/uploads/${file.filename}`;

    db.run(`
        INSERT INTO imagenes_producto (producto_id, nombre_archivo, ruta, es_principal)
        VALUES (?, ?, ?, ?)
    `, [id, file.filename, imageUrl, 1], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.run(`
            UPDATE productos SET imagen_principal_url = ? WHERE id = ?
        `, [imageUrl, id], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({
                message: 'Imagen subida exitosamente',
                imageUrl: imageUrl,
                id: this.lastID
            });
        });
    });
};

export const getImages = (req: Request, res: Response) => {
    const { id } = req.params;
    db.all(`
        SELECT * FROM imagenes_producto WHERE producto_id = ? ORDER BY es_principal DESC, orden ASC
    `, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

export default db;