import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

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

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            try {
                createTables();
                insertSampleData()
                    .then(() => {
                        console.log('✅ Base de datos inicializada correctamente');
                        resolve(true);
                    })
                    .catch((err) => {
                        console.error('❌ Error al insertar datos:', err);
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
    console.log('📦 Creando estructura de base de datos...');

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
    `);

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
    `);

    // 3. ubicaciones
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
    `);

    // 4. familias
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
    `);

    // 5. tipos_material
    db.run(`
        CREATE TABLE IF NOT EXISTS tipos_material (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            familia_id INTEGER NOT NULL,
            codigo TEXT NOT NULL,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            requiere_serial BOOLEAN DEFAULT 0,
            requiere_metraje BOOLEAN DEFAULT 0,
            requiere_vencimiento BOOLEAN DEFAULT 0,
            unidad_medida_default TEXT DEFAULT 'unidad',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE,
            UNIQUE(familia_id, codigo)
        )
    `);

    // 6. marcas
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
    `);

    // 7. proveedores
    db.run(`
        CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
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
    `);

    // 8. unidades_medida
    db.run(`
        CREATE TABLE IF NOT EXISTS unidades_medida (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            simbolo TEXT,
            categoria TEXT CHECK(categoria IN ('longitud', 'peso', 'volumen', 'unidad', 'otro')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 9. clientes
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
    `);

    // 10. usuarios
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
    `);

    // 11. productos
    db.run(`
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            sku TEXT NOT NULL,
            tipo_material_id INTEGER NOT NULL,
            marca_id INTEGER,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            modelo TEXT,
            especificaciones TEXT,
            unidad_medida_id INTEGER,
            peso DECIMAL(10,3),
            dimensiones TEXT,
            color TEXT,
            imagen_principal_url TEXT,
            estado TEXT DEFAULT 'activo',
            requiere_serial BOOLEAN DEFAULT 0,
            requiere_metraje BOOLEAN DEFAULT 0,
            requiere_vencimiento BOOLEAN DEFAULT 0,
            stock_minimo INTEGER DEFAULT 0,
            stock_maximo INTEGER DEFAULT 999999,
            precio_compra DECIMAL(15,2),
            precio_venta DECIMAL(15,2),
            moneda TEXT DEFAULT 'USD',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
            FOREIGN KEY (tipo_material_id) REFERENCES tipos_material(id),
            FOREIGN KEY (marca_id) REFERENCES marcas(id),
            FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
            UNIQUE(empresa_id, sku)
        )
    `);

    // 12. lotes
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
    `);

    // 13. stock
    db.run(`
        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            ubicacion_id INTEGER NOT NULL,
            lote_id INTEGER,
            lote TEXT,
            serial_number TEXT UNIQUE,
            cantidad INTEGER NOT NULL DEFAULT 0,
            cantidad_reservada INTEGER DEFAULT 0,
            cantidad_disponible INTEGER DEFAULT 0,
            metraje DECIMAL(15,2),
            fecha_vencimiento DATE,
            estado TEXT CHECK(estado IN ('disponible', 'reservado', 'instalado', 'en_mantenimiento', 'dado_baja', 'en_transito')) DEFAULT 'disponible',
            ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
            FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
            FOREIGN KEY (lote_id) REFERENCES lotes(id)
        )
    `);

    // 14. imagenes_producto
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
    `);

    // 15. tipos_movimiento
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
    `);

    // 16. movimientos
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
    `);

    // 17. movimientos_detalle
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
            costo_total DECIMAL(15,2),
            serial_number TEXT,
            lote TEXT,
            ubicacion_origen_id INTEGER,
            ubicacion_destino_id INTEGER,
            observaciones TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE,
            FOREIGN KEY (stock_id) REFERENCES stock(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
            FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id)
        )
    `);

    // 18. proyectos
    db.run(`
        CREATE TABLE IF NOT EXISTS proyectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            codigo TEXT NOT NULL,
            nombre TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('interno', 'externo')),
            cliente_id INTEGER,
            responsable_id INTEGER,
            descripcion TEXT,
            fecha_inicio DATE,
            fecha_fin DATE,
            presupuesto DECIMAL(15,2),
            estado TEXT DEFAULT 'activo',
            prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )
    `);

    // 19. asignaciones_proyecto
    db.run(`
        CREATE TABLE IF NOT EXISTS asignaciones_proyecto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proyecto_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            stock_id INTEGER NOT NULL,
            cantidad_asignada INTEGER NOT NULL,
            cantidad_utilizada INTEGER DEFAULT 0,
            cantidad_devuelta INTEGER DEFAULT 0,
            metraje_asignado DECIMAL(15,2),
            metraje_utilizado DECIMAL(15,2),
            metraje_devuelto DECIMAL(15,2),
            fecha_asignacion DATE NOT NULL,
            fecha_uso DATE,
            fecha_devolucion DATE,
            estado TEXT CHECK(estado IN ('asignado', 'en_uso', 'devuelto', 'consumido')) DEFAULT 'asignado',
            observaciones TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (stock_id) REFERENCES stock(id)
        )
    `);

    // 20. auditoria
    db.run(`
        CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tabla TEXT NOT NULL,
            registro_id INTEGER NOT NULL,
            accion TEXT CHECK(accion IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
            usuario_id INTEGER,
            campo TEXT,
            valor_anterior TEXT,
            valor_nuevo TEXT,
            ip_origen TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 21. alertas
    db.run(`
        CREATE TABLE IF NOT EXISTS alertas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            tipo TEXT CHECK(tipo IN ('stock_bajo', 'vencimiento', 'movimiento', 'seguridad', 'sistema')),
            prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
            mensaje TEXT NOT NULL,
            origen TEXT,
            leido BOOLEAN DEFAULT 0,
            fecha_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
        )
    `);

    // 22. parametros
    db.run(`
        CREATE TABLE IF NOT EXISTS parametros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            clave TEXT NOT NULL,
            valor TEXT,
            tipo_dato TEXT CHECK(tipo_dato IN ('string', 'integer', 'boolean', 'decimal', 'json')),
            descripcion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
            UNIQUE(empresa_id, clave)
        )
    `);

    // ÍNDICES
    console.log('📊 Creando índices...');
    db.run(`CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_productos_empresa ON productos(empresa_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_stock_producto ON stock(producto_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_stock_ubicacion ON stock(ubicacion_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_stock_serial ON stock(serial_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_stock_lote ON stock(lote_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha_movimiento)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movimientos_empresa ON movimientos(empresa_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movimientos_detalle_movimiento ON movimientos_detalle(movimiento_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_asignaciones_proyecto ON asignaciones_proyecto(proyecto_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_asignaciones_stock ON asignaciones_proyecto(stock_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria(tabla, registro_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_proyectos_empresa ON proyectos(empresa_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_lotes_codigo ON lotes(codigo)`);

    console.log('✅ Tablas e índices creados correctamente');
};

// ============================================
// DATOS DE EJEMPLO
// ============================================

const insertSampleData = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM empresas', (err, row: any) => {
            if (err) {
                reject(err);
                return;
            }

            if (row.count > 0) {
                console.log('✅ Los datos de ejemplo ya existen');
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

                // 4. Familias
                db.run(`
                    INSERT INTO familias (codigo, nombre, descripcion, nivel) 
                    VALUES 
                        ('CAB', 'Cableado', 'Todo tipo de cables', 0),
                        ('EQ', 'Equipos', 'Equipos activos y pasivos', 0),
                        ('OPT', 'Optica', 'Transceptores y componentes opticos', 0),
                        ('PWR', 'Energia', 'Fuentes de poder y distribucion', 0),
                        ('LIB', 'Librerias', 'Librerias de cintas', 0),
                        ('SPARE', 'Repuestos', 'Repuestos y componentes', 0)
                `);

                // 5. Tipos de material
                db.run(`
                    INSERT INTO tipos_material (familia_id, codigo, nombre, requiere_serial, requiere_metraje) 
                    VALUES 
                        ((SELECT id FROM familias WHERE codigo = 'CAB'), 'DAC', 'Cable DAC', 0, 1),
                        ((SELECT id FROM familias WHERE codigo = 'CAB'), 'FIB', 'Fibra Optica', 0, 1),
                        ((SELECT id FROM familias WHERE codigo = 'CAB'), 'MPO', 'Fibra MPO', 0, 1),
                        ((SELECT id FROM familias WHERE codigo = 'CAB'), 'UTP', 'UTP', 0, 1),
                        ((SELECT id FROM familias WHERE codigo = 'EQ'), 'SRV', 'Servidor', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'EQ'), 'SW', 'Switch', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'OPT'), 'SFP', 'Transceptor SFP', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'OPT'), 'QSFP', 'Transceptor QSFP', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'PWR'), 'PSU', 'Fuente de Poder', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'PWR'), 'STS', 'STS/ATS', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'LIB'), 'LIB', 'Libreria', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'SPARE'), 'SPARE', 'Spare', 1, 0),
                        ((SELECT id FROM familias WHERE codigo = 'PWR'), 'MIC', 'MIC', 1, 0)
                `);

                // 6. Marcas
                db.run(`
                    INSERT INTO marcas (nombre) 
                    VALUES 
                        ('HPE'), ('Juniper'), ('Cisco'), ('Dell'), 
                        ('Huawei'), ('Aruba'), ('Eaton'), ('Vertiv'), 
                        ('TRIMEX'), ('AFC 3M'), ('Generico'), ('JONHON'),
                        ('FINISAR'), ('AXCEN'), ('ESTEC')
                `);

                // 7. Proveedores
                db.run(`
                    INSERT INTO proveedores (codigo, nombre, contacto_nombre, email) 
                    VALUES 
                        ('PROV001', 'NEC Chile', 'Juan Perez', 'juan@nec.cl'),
                        ('PROV002', 'HPE Chile', 'Maria Lopez', 'maria@hpe.com'),
                        ('PROV003', 'Rom Mayer', 'Carlos Rom', 'carlos@rom.cl'),
                        ('PROV004', 'Transworld', 'Pedro Soto', 'pedro@transworld.cl'),
                        ('PROV005', 'CISCO Chile', 'Ana Torres', 'ana@cisco.cl'),
                        ('PROV006', 'DELL Chile', 'Luis Fuentes', 'luis@dell.cl'),
                        ('PROV007', 'HUAWEI Chile', 'Jorge Rios', 'jorge@huawei.cl'),
                        ('PROV008', 'EATON Chile', 'Fernando Diaz', 'fernando@eaton.cl'),
                        ('PROV009', 'VERTIV Chile', 'Claudio Mora', 'claudio@vertiv.cl'),
                        ('PROV010', 'JONHON', 'Ricardo Campos', 'ricardo@jonhon.cl')
                `);

                // 8. Unidades de medida
                db.run(`
                    INSERT INTO unidades_medida (codigo, nombre, simbolo, categoria) 
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
                setTimeout(() => resolve(true), 500);

            } catch (error) {
                console.error('❌ Error insertando datos:', error);
                reject(error);
            }
        });
    });
};

export default db;