const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/inventario.db');

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Limpiar datos transaccionales
    console.log('Limpiando tablas operativas...');
    db.run('DELETE FROM asignaciones_proyecto');
    db.run('DELETE FROM movimientos_detalle');
    db.run('DELETE FROM movimientos');
    db.run('DELETE FROM stock');
    db.run('DELETE FROM productos');
    db.run('DELETE FROM proyectos');
    db.run('DELETE FROM sqlite_sequence WHERE name IN ("asignaciones_proyecto", "movimientos_detalle", "movimientos", "stock", "productos", "proyectos")');

    // 2. Modificar tabla proyectos
    console.log('Agregando nuevos campos a proyectos...');
    db.run('ALTER TABLE proyectos ADD COLUMN especificaciones TEXT', (err) => {
        if(err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run('ALTER TABLE proyectos ADD COLUMN configuracion TEXT', (err) => {
        if(err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run('ALTER TABLE proyectos ADD COLUMN cantidad_personas INTEGER DEFAULT 0', (err) => {
        if(err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run('ALTER TABLE proyectos ADD COLUMN horas_hombre INTEGER DEFAULT 0', (err) => {
        if(err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run('ALTER TABLE proyectos ADD COLUMN costo_hora_hombre DECIMAL(15,2) DEFAULT 0', (err) => {
        if(err && !err.message.includes('duplicate column')) console.error(err);
    });

    // 3. Crear tabla de tareas
    console.log('Creando tabla proyecto_tareas...');
    db.run(`
        CREATE TABLE IF NOT EXISTS proyecto_tareas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proyecto_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            estado TEXT CHECK(estado IN ('pendiente', 'en_curso', 'realizada')) DEFAULT 'pendiente',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
        )
    `);

    db.run('DELETE FROM proyecto_tareas'); // Si existia, limpiar
    db.run('DELETE FROM sqlite_sequence WHERE name = "proyecto_tareas"');

    db.run('COMMIT', (err) => {
        if (err) console.error('Error al hacer commit:', err);
        else console.log('Base de datos saneada y migrada exitosamente.');
    });
});
