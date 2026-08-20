const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/inventario.db');
db.all(`
        SELECT 
            ap.id,
            ap.proyecto_id,
            ap.producto_id,
            ap.stock_id,
            ap.cantidad_asignada,
            ap.cantidad_utilizada,
            ap.cantidad_devuelta,
            ap.estado,
            ap.observaciones,
            ap.created_at as fecha_asignacion,
            COALESCE(p.modelo, p.nombre) as material_nombre,
            tm.nombre as tipo,
            m.nombre as marca,
            s.serial_number,
            s.metraje,
            s.estado as stock_estado,
            a.nombre as area_nombre,
            (ap.cantidad_asignada - ap.cantidad_utilizada - ap.cantidad_devuelta) as cantidad_pendiente
        FROM asignaciones_proyecto ap
        JOIN productos p ON ap.producto_id = p.id
        LEFT JOIN tipos_material tm ON p.tipo_material_id = tm.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN stock s ON ap.stock_id = s.id
        LEFT JOIN areas a ON s.area_id = a.id
        WHERE ap.proyecto_id = 2
        ORDER BY ap.created_at DESC, ap.id DESC
    `, (err, rows) => {
        if(err) console.error(err);
        else console.log(rows);
    });
