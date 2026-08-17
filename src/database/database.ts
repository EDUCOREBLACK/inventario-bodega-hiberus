import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// ============================================
// CONFIGURACIÓN
// ============================================

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || './database/inventario.db';
const db = new sqlite3.Database(dbPath);

db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');

const resetLegacyInventoryModel = () => {
    return new Promise<void>((resolve, reject) => {
        db.all('PRAGMA table_info(stock)', (stockErr, stockCols: any[] = []) => {
            if (stockErr) {
                reject(stockErr);
                return;
            }

            db.all('PRAGMA table_info(productos)', (productErr, productCols: any[] = []) => {
                if (productErr) {
                    reject(productErr);
                    return;
                }

                const hasLegacyProduct = productCols.some((column) => ['area_id', 'ubicacion_id', 'precio_compra', 'precio_venta'].includes(column.name));
                const hasLegacyStock = stockCols.some((column) => ['cantidad_total', 'precio_compra', 'precio_venta'].includes(column.name));

                if (!hasLegacyStock && !hasLegacyProduct) {
                    resolve();
                    return;
                }

                console.warn('⚠️ Se detectó un esquema legacy de inventario. Se reiniciará la base para aplicar el modelo correcto producto vs stock.');

                db.run('PRAGMA foreign_keys = OFF');
                db.serialize(() => {
                    const dropOrder = [
                        'movimientos_detalle',
                        'movimientos',
                        'asignaciones_proyecto',
                        'stock',
                        'productos',
                        'proyectos'
                    ];

                    let index = 0;
                    const dropNext = () => {
                        if (index >= dropOrder.length) {
                            db.run('PRAGMA foreign_keys = ON');
                            resolve();
                            return;
                        }

                        const tableName = dropOrder[index];
                        db.run(`DROP TABLE IF EXISTS ${tableName}`, (dropErr) => {
                            if (dropErr) {
                                console.warn(`⚠️ No se pudo eliminar la tabla ${tableName}:`, dropErr.message);
                            }
                            index += 1;
                            dropNext();
                        });
                    };

                    dropNext();
                });
            });
        });
    });
};

const dropUnusedLegacyTables = () => {
    return new Promise<void>((resolve, reject) => {
        const legacyTables = [
            'materiales',
            'inventario',
            'inventario_legacy',
            'productos_legacy',
            'stock_legacy',
            'proveedores_legacy',
            'tipos_material_legacy',
            'clientes_legacy',
            'familias_legacy',
            'movimientos_legacy',
            'movimientos_detalle_legacy',
            'asignaciones_proyecto_legacy',
            'proyectos_legacy',
            'bodegas',
            'bodegas_legacy'
        ];

        db.run('PRAGMA foreign_keys = OFF');
        db.serialize(() => {
            let index = 0;
            const next = () => {
                if (index >= legacyTables.length) {
                    db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                    return;
                }

                const tableName = legacyTables[index];
                db.run(`DROP TABLE IF EXISTS ${tableName}`, (dropErr) => {
                    if (dropErr && !/no such table/i.test(dropErr.message)) {
                        console.warn(`⚠️ No se pudo eliminar la tabla legacy ${tableName}:`, dropErr.message);
                    }
                    index += 1;
                    next();
                });
            };

            next();
        });
    });
};

const migrateLegacyProveedorSchema = () => {
    return new Promise<void>((resolve, reject) => {
        db.all('PRAGMA table_info(proveedores)', (err, columns: any[] = []) => {
            if (err) {
                reject(err);
                return;
            }

            const hasLegacyCodigo = columns.some((column) => column.name === 'codigo');
            if (!hasLegacyCodigo) {
                resolve();
                return;
            }

            console.warn('⚠️ Se detectó el campo legacy codigo en proveedores. Se migra la tabla para removerlo.');

            db.serialize(() => {
                db.run('ALTER TABLE proveedores RENAME TO proveedores_legacy', (renameErr) => {
                    if (renameErr) {
                        reject(renameErr);
                        return;
                    }

                    db.run(`
                        CREATE TABLE proveedores (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nombre TEXT NOT NULL,
                            rut TEXT,
                            direccion TEXT,
                            telefono TEXT,
                            email TEXT,
                            contacto_nombre TEXT,
                            contacto_telefono TEXT,
                            contacto_email TEXT,
                            condiciones_pago TEXT,
                            plazo_entrega INTEGER,
                            calificacion INTEGER DEFAULT 5,
                            estado TEXT DEFAULT 'activo',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (createErr) => {
                        if (createErr) {
                            reject(createErr);
                            return;
                        }

                        db.run(`
                            INSERT INTO proveedores (
                                id, nombre, rut, direccion, telefono, email, contacto_nombre,
                                contacto_telefono, contacto_email, condiciones_pago, plazo_entrega,
                                calificacion, estado, created_at, updated_at
                            )
                            SELECT
                                id, nombre, rut, direccion, telefono, email, contacto_nombre,
                                contacto_telefono, contacto_email, condiciones_pago, plazo_entrega,
                                COALESCE(calificacion, 5), COALESCE(estado, 'activo'),
                                created_at, updated_at
                            FROM proveedores_legacy
                        `, (insertErr) => {
                            if (insertErr) {
                                reject(insertErr);
                                return;
                            }

                            db.run('DROP TABLE proveedores_legacy', (dropErr) => {
                                if (dropErr) {
                                    reject(dropErr);
                                    return;
                                }
                                resolve();
                            });
                        });
                    });
                });
            });
        });
    });
};

const migrateLegacyTipoMaterialSchema = () => {
    return new Promise<void>((resolve, reject) => {
        db.all('PRAGMA table_info(tipos_material)', (err, columns: any[] = []) => {
            if (err) {
                reject(err);
                return;
            }

            const hasLegacyCodigo = columns.some((column) => column.name === 'codigo');
            if (!hasLegacyCodigo) {
                resolve();
                return;
            }

            console.warn('⚠️ Se detectó el campo legacy codigo en tipos_material. Se migra la tabla para removerlo.');

            db.serialize(() => {
                db.run('ALTER TABLE tipos_material RENAME TO tipos_material_legacy', (renameErr) => {
                    if (renameErr) {
                        reject(renameErr);
                        return;
                    }

                    db.run(`
                        CREATE TABLE tipos_material (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            familia_id INTEGER NOT NULL,
                            nombre TEXT NOT NULL,
                            descripcion TEXT,
                            requiere_serial BOOLEAN DEFAULT 0,
                            requiere_metraje BOOLEAN DEFAULT 0,
                            requiere_vencimiento BOOLEAN DEFAULT 0,
                            unidad_medida_default TEXT DEFAULT 'unidad',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE,
                            UNIQUE(familia_id, nombre)
                        )
                    `, (createErr) => {
                        if (createErr) {
                            reject(createErr);
                            return;
                        }

                        db.run(`
                            INSERT INTO tipos_material (
                                id, familia_id, nombre, descripcion,
                                requiere_serial, requiere_metraje, requiere_vencimiento,
                                unidad_medida_default, created_at, updated_at
                            )
                            SELECT
                                id, familia_id, nombre, descripcion,
                                COALESCE(requiere_serial, 0), COALESCE(requiere_metraje, 0),
                                COALESCE(requiere_vencimiento, 0), COALESCE(unidad_medida_default, 'unidad'),
                                created_at, updated_at
                            FROM tipos_material_legacy
                        `, (insertErr) => {
                            if (insertErr) {
                                reject(insertErr);
                                return;
                            }

                            db.run('DROP TABLE tipos_material_legacy', (dropErr) => {
                                if (dropErr) {
                                    reject(dropErr);
                                    return;
                                }
                                resolve();
                            });
                        });
                    });
                });
            });
        });
    });
};

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

const ensureDefaultUnits = () => {
    return new Promise<void>((resolve, reject) => {
        db.run(`
            INSERT OR IGNORE INTO unidades_medida (codigo, nombre, simbolo, categoria)
            VALUES
                ('UN', 'Unidad', 'u', 'unidad'),
                ('M', 'Metro', 'm', 'longitud')
        `, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

const ensureTableColumns = (tableName: string, requiredColumns: Array<{ name: string; definition: string }>) => {
    return new Promise<void>((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns: any[] = []) => {
            if (err) {
                reject(err);
                return;
            }

            const existing = new Set(columns.map((column) => column.name));
            const missing = requiredColumns.filter((column) => !existing.has(column.name));

            if (missing.length === 0) {
                resolve();
                return;
            }

            db.serialize(() => {
                let index = 0;
                const next = () => {
                    if (index >= missing.length) {
                        resolve();
                        return;
                    }

                    const column = missing[index];
                    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`, (alterErr) => {
                        if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
                            reject(alterErr);
                            return;
                        }
                        index += 1;
                        next();
                    });
                };

                next();
            });
        });
    });
};

export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            try {
                Promise.resolve()
                    .then(() => {
                        if (process.env.RESET_LEGACY_INVENTORY === 'true') {
                            return resetLegacyInventoryModel();
                        }
                    })
                    .then(() => {
                        if (process.env.CLEANUP_LEGACY_TABLES === 'true') {
                            return dropUnusedLegacyTables();
                        }
                    })
                    .then(() => createTables())
                    .then(() => ensureDefaultUnits())
                    .then(() => migrateLegacyProveedorSchema())
                    .then(() => migrateLegacyTipoMaterialSchema())
                    .then(() => ensureTableColumns('productos', [{ name: 'modelo', definition: 'TEXT' }]))
                    .then(() => ensureTableColumns('proyectos', [
                        { name: 'cliente_id', definition: 'INTEGER' }
                    ]))
                    .then(() => ensureTableColumns('areas', [
                        { name: 'descripcion', definition: 'TEXT' }
                    ]))
                    .then(() => ensureTableColumns('stock', [
                        { name: 'metraje', definition: 'DECIMAL(15,2) DEFAULT 0' },
                        { name: 'serial_number', definition: 'TEXT' }
                    ]))
                    .then(() => insertSampleData())
                    .then(() => {
                        console.log('✅ Base de datos inicializada correctamente');
                        resolve(true);
                    })
                    .catch((err) => {
                        console.error('❌ Error al inicializar la base de datos:', err);
                        reject(err);
                    });
            } catch (error) {
                console.error('❌ Error al crear tablas:', error);
                reject(error);
            }
        });
    });
};

// ============================================
// CREAR TABLAS
// ============================================

const createTables = () => {
    return new Promise<void>((resolve, reject) => {
        console.log('📦 Creando estructura de base de datos...');

        db.serialize(() => {
            // 1. empresas
            db.run(`
                CREATE TABLE IF NOT EXISTS empresas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    rut TEXT UNIQUE,
                    razon_social TEXT,
                    direccion TEXT,
                    telefono TEXT,
                    email TEXT,
                    sitio_web TEXT,
                    sector TEXT,
                    logo_url TEXT,
                    estado TEXT DEFAULT 'activo',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 2. sucursales
                db.run(`
                    CREATE TABLE IF NOT EXISTS sucursales (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        empresa_id INTEGER NOT NULL,
                        codigo TEXT NOT NULL,
                        nombre TEXT NOT NULL,
                        direccion TEXT,
                        telefono TEXT,
                        email TEXT,
                        tipo TEXT CHECK(tipo IN ('bodega', 'oficina', 'tienda', 'datacenter')),
                        estado TEXT DEFAULT 'activo',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                        UNIQUE(empresa_id, codigo)
                    )
                `, (err2) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }

                    // 3. areas
                    db.run(`
                        CREATE TABLE IF NOT EXISTS areas (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            sucursal_id INTEGER NOT NULL,
                            codigo TEXT NOT NULL,
                            nombre TEXT NOT NULL,
                            descripcion TEXT,
                            tipo TEXT DEFAULT 'departamento',
                            capacidad INTEGER,
                            estado TEXT DEFAULT 'activo',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
                            UNIQUE(sucursal_id, codigo)
                        )
                    `, (err3) => {
                        if (err3) {
                            reject(err3);
                            return;
                        }

                        db.run(`
                            CREATE TABLE IF NOT EXISTS ubicaciones (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                sucursal_id INTEGER NOT NULL,
                                codigo TEXT NOT NULL,
                                nombre TEXT NOT NULL,
                                tipo TEXT CHECK(tipo IN ('rack', 'estante', 'cajon', 'piso', 'area', 'otro')),
                                nivel TEXT,
                                posicion TEXT,
                                capacidad INTEGER,
                                padre_id INTEGER,
                                estado TEXT DEFAULT 'activo',
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
                                FOREIGN KEY (padre_id) REFERENCES ubicaciones(id) ON DELETE CASCADE,
                                UNIQUE(sucursal_id, codigo)
                            )
                        `, (err4) => {
                            if (err4) {
                                reject(err4);
                                return;
                            }

                            db.run(`
                                CREATE TABLE IF NOT EXISTS familias (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    codigo TEXT UNIQUE NOT NULL,
                                    nombre TEXT NOT NULL,
                                    descripcion TEXT,
                                    nivel INTEGER DEFAULT 0,
                                    padre_id INTEGER,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    FOREIGN KEY (padre_id) REFERENCES familias(id) ON DELETE CASCADE
                                )
                            `, (err5) => {
                                if (err5) {
                                    reject(err5);
                                    return;
                                }

                                db.run(`
                                    CREATE TABLE IF NOT EXISTS tipos_material (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        familia_id INTEGER NOT NULL,
                                        nombre TEXT NOT NULL,
                                        descripcion TEXT,
                                        requiere_serial BOOLEAN DEFAULT 0,
                                        requiere_metraje BOOLEAN DEFAULT 0,
                                        requiere_vencimiento BOOLEAN DEFAULT 0,
                                        unidad_medida_default TEXT DEFAULT 'unidad',
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE,
                                        UNIQUE(familia_id, nombre)
                                    )
                                `, (err6) => {
                                    if (err6) {
                                        reject(err6);
                                        return;
                                    }

                                    db.run(`
                                        CREATE TABLE IF NOT EXISTS marcas (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            nombre TEXT NOT NULL UNIQUE,
                                            descripcion TEXT,
                                            sitio_web TEXT,
                                            contacto TEXT,
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                        )
                                    `, (err7) => {
                                        if (err7) {
                                            reject(err7);
                                            return;
                                        }

                                        db.run(`
                                            CREATE TABLE IF NOT EXISTS proveedores (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                nombre TEXT NOT NULL,
                                                rut TEXT,
                                                direccion TEXT,
                                                telefono TEXT,
                                                email TEXT,
                                                contacto_nombre TEXT,
                                                contacto_telefono TEXT,
                                                contacto_email TEXT,
                                                condiciones_pago TEXT,
                                                plazo_entrega INTEGER,
                                                calificacion INTEGER DEFAULT 5,
                                                estado TEXT DEFAULT 'activo',
                                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                            )
                                        `, (err8) => {
                                            if (err8) {
                                                reject(err8);
                                                return;
                                            }

                                            db.run(`
                                                CREATE TABLE IF NOT EXISTS unidades_medida (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    codigo TEXT UNIQUE NOT NULL,
                                                    nombre TEXT NOT NULL,
                                                    simbolo TEXT,
                                                    categoria TEXT CHECK(categoria IN ('longitud', 'peso', 'volumen', 'unidad', 'otro')),
                                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                                )
                                            `, (err9) => {
                                                if (err9) {
                                                    reject(err9);
                                                    return;
                                                }

                                                db.run(`
                                                    CREATE TABLE IF NOT EXISTS clientes (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        empresa_id INTEGER NOT NULL,
                                                        codigo TEXT NOT NULL,
                                                        nombre TEXT NOT NULL,
                                                        rut TEXT,
                                                        direccion TEXT,
                                                        telefono TEXT,
                                                        email TEXT,
                                                        contacto_nombre TEXT,
                                                        sector TEXT,
                                                        tipo TEXT CHECK(tipo IN ('empresa', 'persona', 'gobierno')),
                                                        estado TEXT DEFAULT 'activo',
                                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                                                        UNIQUE(empresa_id, codigo)
                                                    )
                                                `, (err10) => {
                                                    if (err10) {
                                                        reject(err10);
                                                        return;
                                                    }

                                                    db.run(`
                                                        CREATE TABLE IF NOT EXISTS usuarios (
                                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                            empresa_id INTEGER NOT NULL,
                                                            nombre TEXT NOT NULL,
                                                            apellido TEXT NOT NULL,
                                                            email TEXT UNIQUE NOT NULL,
                                                            password_hash TEXT NOT NULL,
                                                            rol TEXT CHECK(rol IN ('admin', 'gerente', 'supervisor', 'operador', 'auditor', 'invitado')) DEFAULT 'operador',
                                                            telefono TEXT,
                                                            departamento TEXT,
                                                            activo BOOLEAN DEFAULT 1,
                                                            ultimo_login DATETIME,
                                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
                                                        )
                                                    `, (err11) => {
                                                        if (err11) {
                                                            reject(err11);
                                                            return;
                                                        }

                                                        db.run(`
                                                                CREATE TABLE IF NOT EXISTS productos (
                                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                    empresa_id INTEGER NOT NULL,
                                                                    tipo_material_id INTEGER NOT NULL,
                                                                    marca_id INTEGER,
                                                                    proveedor_id INTEGER,
                                                                    nombre TEXT NOT NULL,
                                                                    descripcion TEXT,
                                                                    modelo TEXT,
                                                                    especificaciones TEXT,
                                                                    unidad_medida_id INTEGER,
                                                                    peso DECIMAL(10,3),
                                                                    dimensiones TEXT,
                                                                    color TEXT,
                                                                    imagen_principal_url TEXT,
                                                                    precio_unitario DECIMAL(15,2) DEFAULT 0,
                                                                    metraje DECIMAL(15,2) DEFAULT 0,
                                                                    numero_serie TEXT,
                                                                    estado TEXT DEFAULT 'activo',
                                                                    requiere_serial BOOLEAN DEFAULT 0,
                                                                    requiere_metraje BOOLEAN DEFAULT 0,
                                                                    stock_minimo INTEGER DEFAULT 0,
                                                                    stock_maximo INTEGER DEFAULT 999999,
                                                                    moneda TEXT DEFAULT 'USD',
                                                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                                                                    FOREIGN KEY (tipo_material_id) REFERENCES tipos_material(id),
                                                                    FOREIGN KEY (marca_id) REFERENCES marcas(id),
                                                                    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
                                                                    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id)
                                                                )
                                                        `, (err12) => {
                                                            if (err12) {
                                                                reject(err12);
                                                                return;
                                                            }

                                                            db.run(`
                                                                CREATE TABLE IF NOT EXISTS lotes (
                                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                    codigo TEXT UNIQUE NOT NULL,
                                                                    descripcion TEXT,
                                                                    proveedor_id INTEGER,
                                                                    fecha_ingreso DATE,
                                                                    documento TEXT,
                                                                    observaciones TEXT,
                                                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
                                                                )
                                                            `, (err13) => {
                                                                if (err13) {
                                                                    reject(err13);
                                                                    return;
                                                                }

                                                                db.run(`
                                                                        CREATE TABLE IF NOT EXISTS stock (
                                                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                            producto_id INTEGER NOT NULL,
                                                                            area_id INTEGER,
                                                                            sucursal_id INTEGER NOT NULL,
                                                                            ubicacion_id INTEGER NOT NULL,
                                                                            lote_id INTEGER,
                                                                            lote TEXT,
                                                                            serial_number TEXT,
                                                                            cantidad INTEGER NOT NULL DEFAULT 0,
                                                                            metraje DECIMAL(15,2) DEFAULT 0,
                                                                            estado TEXT CHECK(estado IN ('disponible', 'reservado', 'instalado', 'en_mantenimiento', 'dado_baja', 'en_transito')) DEFAULT 'disponible',
                                                                            estado_fisico TEXT DEFAULT 'bueno',
                                                                            fecha_ingreso DATE,
                                                                            observaciones TEXT,
                                                                            activo BOOLEAN DEFAULT 1,
                                                                            ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
                                                                            FOREIGN KEY (area_id) REFERENCES areas(id),
                                                                            FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
                                                                            FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
                                                                            FOREIGN KEY (lote_id) REFERENCES lotes(id)
                                                                        )
                                                                `, (err14) => {
                                                                    if (err14) {
                                                                        reject(err14);
                                                                        return;
                                                                    }

                                                                    db.run(`
                                                                        CREATE TABLE IF NOT EXISTS imagenes_producto (
                                                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                            producto_id INTEGER NOT NULL,
                                                                            nombre_archivo TEXT NOT NULL,
                                                                            ruta TEXT NOT NULL,
                                                                            es_principal BOOLEAN DEFAULT 0,
                                                                            orden INTEGER DEFAULT 0,
                                                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
                                                                        )
                                                                    `, (err15) => {
                                                                        if (err15) {
                                                                            reject(err15);
                                                                            return;
                                                                        }

                                                                        db.run(`
                                                                            CREATE TABLE IF NOT EXISTS tipos_movimiento (
                                                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                                codigo TEXT UNIQUE NOT NULL,
                                                                                nombre TEXT NOT NULL,
                                                                                signo INTEGER DEFAULT 1,
                                                                                afecta_stock BOOLEAN DEFAULT 1,
                                                                                requiere_aprobacion BOOLEAN DEFAULT 0,
                                                                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                                                            )
                                                                        `, (err16) => {
                                                                            if (err16) {
                                                                                reject(err16);
                                                                                return;
                                                                            }

                                                                            db.run(`
                                                                                CREATE TABLE IF NOT EXISTS movimientos (
                                                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                                    empresa_id INTEGER NOT NULL,
                                                                                    sucursal_id INTEGER NOT NULL,
                                                                                    tipo_movimiento_id INTEGER NOT NULL,
                                                                                    documento_numero TEXT,
                                                                                    documento_tipo TEXT CHECK(documento_tipo IN ('factura', 'guia', 'orden_compra', 'nota_credito', 'ajuste', 'otro')),
                                                                                    fecha_movimiento DATE NOT NULL,
                                                                                    fecha_contable DATE,
                                                                                    responsable_id INTEGER,
                                                                                    proyecto_id INTEGER,
                                                                                    descripcion TEXT,
                                                                                    estado TEXT CHECK(estado IN ('borrador', 'pendiente', 'aprobado', 'ejecutado', 'cancelado', 'revertido')) DEFAULT 'borrador',
                                                                                    observaciones TEXT,
                                                                                    referencia_externa TEXT,
                                                                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                                                                                    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
                                                                                    FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
                                                                                    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE SET NULL
                                                                                )
                                                                            `, (err17) => {
                                                                                if (err17) {
                                                                                    reject(err17);
                                                                                    return;
                                                                                }

                                                                                db.run(`
                                                                                    CREATE TABLE IF NOT EXISTS movimientos_detalle (
                                                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                                        movimiento_id INTEGER NOT NULL,
                                                                                        stock_id INTEGER NOT NULL,
                                                                                        producto_id INTEGER NOT NULL,
                                                                                        cantidad INTEGER NOT NULL,
                                                                                        cantidad_anterior INTEGER,
                                                                                        cantidad_nueva INTEGER,
                                                                                        metraje DECIMAL(15,2),
                                                                                        metraje_anterior DECIMAL(15,2),
                                                                                        metraje_nuevo DECIMAL(15,2),
                                                                                        precio_unitario DECIMAL(15,2),
                                                                                        ubicacion_origen_id INTEGER,
                                                                                        ubicacion_destino_id INTEGER,
                                                                                        observaciones TEXT,
                                                                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                        FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE,
                                                                                        FOREIGN KEY (stock_id) REFERENCES stock(id),
                                                                                        FOREIGN KEY (producto_id) REFERENCES productos(id)
                                                                                    )
                                                                                `, (err18) => {
                                                                                    if (err18) {
                                                                                        reject(err18);
                                                                                        return;
                                                                                    }

                                                                                    db.run(`
                                                                                        CREATE TABLE IF NOT EXISTS proyectos (
                                                                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                                            empresa_id INTEGER NOT NULL,
                                                                                            codigo TEXT NOT NULL,
                                                                                            nombre TEXT NOT NULL,
                                                                                            descripcion TEXT,
                                                                                            tipo TEXT CHECK(tipo IN ('interno', 'externo', 'cliente')) DEFAULT 'interno',
                                                                                            cliente_id INTEGER,
                                                                                            fecha_inicio DATE,
                                                                                            fecha_fin DATE,
                                                                                            estado TEXT CHECK(estado IN ('activo', 'pausado', 'finalizado', 'cancelado')) DEFAULT 'activo',
                                                                                            responsable_id INTEGER,
                                                                                            presupuesto DECIMAL(15,2),
                                                                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                                                                                            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
                                                                                        )
                                                                                    `, (err19) => {
                                                                                        if (err19) {
                                                                                            reject(err19);
                                                                                            return;
                                                                                        }

                                                                                        db.run(`
                                                                                            CREATE TABLE IF NOT EXISTS asignaciones_proyecto (
                                                                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                                                proyecto_id INTEGER NOT NULL,
                                                                                                producto_id INTEGER NOT NULL,
                                                                                                stock_id INTEGER,
                                                                                                cantidad_asignada INTEGER NOT NULL DEFAULT 0,
                                                                                                cantidad_utilizada INTEGER NOT NULL DEFAULT 0,
                                                                                                cantidad_devuelta INTEGER NOT NULL DEFAULT 0,
                                                                                                estado TEXT CHECK(estado IN ('pendiente', 'en_uso', 'devuelto', 'cancelado')) DEFAULT 'pendiente',
                                                                                                observaciones TEXT,
                                                                                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                                                                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
                                                                                                FOREIGN KEY (producto_id) REFERENCES productos(id),
                                                                                                FOREIGN KEY (stock_id) REFERENCES stock(id)
                                                                                            )
                                                                                        `, (err20) => {
                                                                                            if (err20) {
                                                                                                reject(err20);
                                                                                                return;
                                                                                            }

                                                                                            console.log('✅ Tablas e índices creados correctamente');
                                                                                            resolve();
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

// ============================================
// DATOS DE EJEMPLO
// ============================================

const insertSampleData = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM empresas', async (err, row: any) => {
            if (err) {
                reject(err);
                return;
            }

            if (row.count > 0) {
                console.log('✅ Los datos de ejemplo ya existen');
                await ensureAdminUser();
                resolve(true);
                return;
            }

            console.log('📝 Insertando datos de ejemplo...');

            try {
                // 1. Empresa
                db.run(`
                    INSERT INTO empresas (nombre, rut, razon_social, sector) 
                    VALUES ('Hiberus Chile', '76.123.456-7', 'Hiberus Chile S.A.', 'Tecnología')
                `);

                // 2. Sucursales
                db.run(`
                    INSERT INTO sucursales (empresa_id, codigo, nombre, direccion, tipo) 
                    VALUES 
                        (1, 'SM001', 'San Martin', 'Av. San Martin 123, Santiago', 'bodega'),
                        (1, 'PAI001', 'Paine', 'Ruta 5 Sur km 45', 'datacenter'),
                        (1, 'APO001', 'Apoquindo', 'Av. Apoquindo 456, Las Condes', 'oficina')
                `);

                // 3. Ubicaciones - Bodega San Martin (Piso 19)
                db.run(`
                    INSERT INTO ubicaciones (sucursal_id, codigo, nombre, tipo) 
                    VALUES 
                        (1, 'P19', 'Piso 19', 'piso'),
                        (1, 'SM-CAJA', 'Cajas San Martin', 'area')
                `);

                // Estantes del Piso 19
                db.run(`
                    INSERT INTO ubicaciones (sucursal_id, codigo, nombre, tipo, padre_id) 
                    VALUES 
                        (1, 'P19-E1', 'Estante 1 - Cables DAC', 'estante', 
                        (SELECT id FROM ubicaciones WHERE codigo = 'P19' AND sucursal_id = 1)),
                        (1, 'P19-E2', 'Estante 2 - Fibra Optica', 'estante',
                        (SELECT id FROM ubicaciones WHERE codigo = 'P19' AND sucursal_id = 1)),
                        (1, 'P19-E3', 'Estante 3 - Transceptores', 'estante',
                        (SELECT id FROM ubicaciones WHERE codigo = 'P19' AND sucursal_id = 1))
                `);

                // Cajas de San Martin
                db.run(`
                    INSERT INTO ubicaciones (sucursal_id, codigo, nombre, tipo, padre_id) 
                    VALUES 
                        (1, 'SM-CAJA-1', 'Caja 1 - Fibras', 'cajon',
                        (SELECT id FROM ubicaciones WHERE codigo = 'SM-CAJA' AND sucursal_id = 1)),
                        (1, 'SM-CAJA-2', 'Caja 2 - UTP', 'cajon',
                        (SELECT id FROM ubicaciones WHERE codigo = 'SM-CAJA' AND sucursal_id = 1)),
                        (1, 'SM-CAJA-3', 'Caja 3 - Fuentes', 'cajon',
                        (SELECT id FROM ubicaciones WHERE codigo = 'SM-CAJA' AND sucursal_id = 1))
                `);

                // Ubicaciones - Datacenter Paine
                db.run(`
                    INSERT INTO ubicaciones (sucursal_id, codigo, nombre, tipo) 
                    VALUES 
                        (2, 'DC-PAI', 'Datacenter Paine', 'area')
                `);

                // Racks de Paine
                db.run(`
                    INSERT INTO ubicaciones (sucursal_id, codigo, nombre, tipo, padre_id) 
                    VALUES 
                        (2, 'DC-PAI-R01', 'Rack 01 - Servidores', 'rack',
                        (SELECT id FROM ubicaciones WHERE codigo = 'DC-PAI' AND sucursal_id = 2)),
                        (2, 'DC-PAI-R02', 'Rack 02 - Switches', 'rack',
                        (SELECT id FROM ubicaciones WHERE codigo = 'DC-PAI' AND sucursal_id = 2))
                `);

                // 8. Unidades de medida
                db.run(`
                    INSERT OR IGNORE INTO unidades_medida (codigo, nombre, simbolo, categoria) 
                    VALUES 
                        ('UN', 'Unidad', 'u', 'unidad'),
                        ('M', 'Metro', 'm', 'longitud')
                `);

                // 9. Tipos de movimiento
                db.run(`
                    INSERT INTO tipos_movimiento (codigo, nombre, signo, afecta_stock) 
                    VALUES 
                        ('ENT', 'Entrada', 1, 1),
                        ('SAL', 'Salida', -1, 1),
                        ('DEV', 'Devolucion', 1, 1),
                        ('AJU', 'Ajuste', 1, 1),
                        ('TRAS', 'Traslado', 0, 1)
                `);

                // 10. Proyectos
                db.run(`
                    INSERT INTO proyectos (empresa_id, codigo, nombre, tipo, descripcion, fecha_inicio, fecha_fin, estado) 
                    VALUES 
                        (1, 'PROJ-001', 'Backbone DCSM', 'interno', 'Instalacion backbone en DCSM', '2026-07-01', '2026-09-30', 'activo'),
                        (1, 'PROJ-002', 'Instalacion Paine', 'externo', 'Instalacion servidores y switches en Paine', '2026-06-01', '2026-08-31', 'activo')
                `);

                console.log('✅ Datos maestros insertados correctamente');
                
                // Esperar un poco para que se completen las inserciones
                setTimeout(async () => {
                    try {
                        await ensureAdminUser();
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                }, 500);

            } catch (error) {
                console.error('❌ Error insertando datos:', error);
                reject(error);
            }
        });
    });
};

const seedCatalogDefaults = () => {
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                INSERT OR IGNORE INTO familias (codigo, nombre, descripcion, nivel)
                VALUES
                    ('CAB', 'Cableado', 'Todo tipo de cables', 0),
                    ('EQ', 'Equipos', 'Equipos activos y pasivos', 0),
                    ('OPT', 'Optica', 'Transceptores y componentes opticos', 0),
                    ('PWR', 'Energia', 'Fuentes de poder y distribucion', 0),
                    ('LIB', 'Librerias', 'Librerias de cintas', 0),
                    ('SPARE', 'Repuestos', 'Repuestos y componentes', 0)
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.run(`
                    INSERT OR IGNORE INTO unidades_medida (codigo, nombre, simbolo, categoria)
                    VALUES
                        ('UN', 'Unidad', 'u', 'unidad'),
                        ('M', 'Metro', 'm', 'longitud')
                `, (unitsErr) => {
                    if (unitsErr) {
                        reject(unitsErr);
                        return;
                    }

                    db.run(`
                        INSERT OR IGNORE INTO marcas (nombre, descripcion)
                        VALUES
                            ('HPE', 'Equipos de red'),
                            ('Juniper', 'Networking'),
                            ('Cisco', 'Networking'),
                            ('Dell', 'Hardware'),
                            ('Huawei', 'Networking'),
                            ('Aruba', 'Networking'),
                            ('Eaton', 'Energía'),
                            ('Vertiv', 'Infraestructura'),
                            ('TRIMEX', 'Cableado e infraestructura'),
                            ('AFC 3M', 'Cableado'),
                            ('Generico', 'Genérico'),
                            ('JONHON', 'Cableado'),
                            ('FINISAR', 'Optica'),
                            ('AXCEN', 'Optica'),
                            ('ESTEC', 'It / networking'),
                            ('FORTINET', 'Equipos de comunicaciones')
                    `, (err2) => {
                        if (err2) {
                            reject(err2);
                            return;
                        }

                        db.run(`
                            INSERT OR IGNORE INTO proveedores (nombre, contacto_nombre, email, telefono, estado)
                            VALUES
                                ('NEC Chile', 'Juan Perez', 'juan@nec.cl', NULL, 'activo'),
                                ('HPE Chile', 'Maria Lopez', 'maria@hpe.com', NULL, 'activo'),
                                ('Rom Mayer', 'Carlos Rom', 'carlos@rom.cl', NULL, 'activo'),
                                ('Transworld', 'Pedro Soto', 'pedro@transworld.cl', NULL, 'activo'),
                                ('CISCO Chile', 'Ana Torres', 'ana@cisco.cl', NULL, 'activo'),
                                ('DELL Chile', 'Luis Fuentes', 'luis@dell.cl', NULL, 'activo'),
                                ('HUAWEI Chile', 'Jorge Rios', 'jorge@huawei.cl', NULL, 'activo'),
                                ('EATON Chile', 'Fernando Diaz', 'fernando@eaton.cl', NULL, 'activo'),
                                ('VERTIV Chile', 'Claudio Mora', 'claudio@vertiv.cl', NULL, 'activo'),
                                ('JONHON', 'Ricardo Campos', 'ricardo@jonhon.cl', NULL, 'activo')
                        `, (err3) => {
                            if (err3) {
                                reject(err3);
                                return;
                            }

                            const typeInserts = [
                                ["'CAB'", "'Cable DAC'", "'Cable directo de acceso'", 0, 1],
                                ["'CAB'", "'Fibra Optica'", "'Cable de fibra optica'", 0, 1],
                                ["'CAB'", "'Fibra MPO'", "'Fibra MPO'", 0, 1],
                                ["'CAB'", "'UTP'", "'Cable UTP'", 0, 1],
                                ["'EQ'", "'Servidor'", "'Servidor'", 1, 0],
                                ["'EQ'", "'Switch'", "'Switch de red'", 1, 0],
                                ["'OPT'", "'Transceptor SFP'", "'Transceptor SFP'", 1, 0],
                                ["'OPT'", "'Transceptor QSFP'", "'Transceptor QSFP'", 1, 0],
                                ["'PWR'", "'Fuente de Poder'", "'Fuente de poder'", 1, 0],
                                ["'PWR'", "'STS/ATS'", "'STS/ATS'", 1, 0],
                                ["'LIB'", "'Libreria'", "'Libreria'", 1, 0],
                                ["'SPARE'", "'Spare'", "'Repuesto general'", 1, 0],
                                ["'PWR'", "'MIC'", "'MIC'", 1, 0]
                            ];

                            let index = 0;
                            const insertNextType = () => {
                                if (index >= typeInserts.length) {
                                    console.log('✅ Catálogos base cargados correctamente');
                                    resolve();
                                    return;
                                }

                                const [familiaCode, nombre, descripcion, serial, metraje] = typeInserts[index];
                                db.run(`
                                    INSERT INTO tipos_material (familia_id, nombre, descripcion, requiere_serial, requiere_metraje)
                                    SELECT (SELECT id FROM familias WHERE codigo = ${familiaCode}), ${nombre}, ${descripcion}, ?, ?
                                    WHERE NOT EXISTS (
                                        SELECT 1 FROM tipos_material WHERE familia_id = (SELECT id FROM familias WHERE codigo = ${familiaCode}) AND nombre = ${nombre}
                                    )
                                `, [serial, metraje], (insertErr) => {
                                    if (insertErr) {
                                        reject(insertErr);
                                        return;
                                    }
                                    index += 1;
                                    insertNextType();
                                });
                            };

                            insertNextType();
                        });
                    });
                });
            });
        });
    });
};

const ensureAdminUser = () => {
    return new Promise<void>((resolve, reject) => {
        db.get('SELECT id FROM usuarios WHERE email = ?', ['admin@hiberus.cl'], async (err, row: any) => {
            if (err) {
                reject(err);
                return;
            }

            if (row) {
                resolve();
                return;
            }

            try {
                const passwordHash = await bcrypt.hash('123456', 10);
                db.run(`
                    INSERT INTO usuarios (empresa_id, nombre, apellido, email, password_hash, rol, telefono, departamento, activo)
                    VALUES (1, 'Administrador', 'Hiberus', 'admin@hiberus.cl', ?, 'admin', '+56900000000', 'TI', 1)
                `, [passwordHash], (insertErr) => {
                    if (insertErr) {
                        reject(insertErr);
                        return;
                    }
                    console.log('✅ Usuario administrador creado correctamente');
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    });
};

export default db;