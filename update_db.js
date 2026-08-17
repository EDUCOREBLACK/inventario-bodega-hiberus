const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/inventario.db');

db.serialize(() => {
    db.run("UPDATE productos SET metraje = 3 WHERE nombre LIKE '%CAT6%3MTS%'", function() {
        console.log('Productos actualizados:', this.changes);
    });
    db.run("UPDATE stock SET metraje = 3 WHERE producto_id IN (SELECT id FROM productos WHERE nombre LIKE '%CAT6%3MTS%')", function() {
        console.log('Stock actualizado:', this.changes);
    });
});
