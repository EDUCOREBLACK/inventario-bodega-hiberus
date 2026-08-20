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
