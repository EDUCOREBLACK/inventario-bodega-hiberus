export const actualizarUnidadStock = (req: Request, res: Response) => {
    const { id, stockId } = req.params;
    const { serial_number, metraje, estado, ubicacion_id, area_id } = req.body;
    const serialFinal = typeof serial_number === 'string' ? serial_number.trim() : serial_number;
    const metrajeFinal = metraje === undefined || metraje === null ? null : Number(metraje);

    if (!stockId) {
        res.status(400).json({ error: 'Falta el identificador de la unidad' });
        return;
    }

    db.get('SELECT id, estado, cantidad FROM stock WHERE id = ? AND producto_id = ?', [stockId, id], (err, row: any) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ error: 'Unidad no encontrada' }); return; }

        const currentEstado = row.estado;

        const updateUnit = () => {
            db.run(`
                UPDATE stock
                SET serial_number = COALESCE(?, serial_number),
                    metraje = COALESCE(?, metraje),
                    estado = COALESCE(?, estado),
                    ubicacion_id = COALESCE(?, ubicacion_id),
                    area_id = COALESCE(?, area_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND producto_id = ?
            `, [
                serialFinal || null, metrajeFinal, estado || null, 
                ubicacion_id === undefined ? null : Number(ubicacion_id || null),
                area_id === undefined ? null : Number(area_id || null),
                stockId, id
            ], function(err) {
                if (err) { res.status(500).json({ error: err.message }); return; }
                if (this.changes === 0) { res.status(404).json({ error: 'No se pudo actualizar la unidad' }); return; }

                if (estado === 'disponible' && currentEstado !== 'disponible') {
                    // Unassign from project if previously assigned
                    db.run(`
                        UPDATE asignaciones_proyecto 
                        SET estado = 'devuelto', cantidad_devuelta = cantidad_asignada, cantidad_utilizada = 0
                        WHERE stock_id = ? AND estado IN ('pendiente', 'en_uso')
                    `, [stockId], () => {
                        res.json({ message: 'Unidad actualizada y liberada correctamente' });
                    });
                } else {
                    res.json({ message: 'Unidad actualizada correctamente' });
                }
            });
        };

        if (serialFinal) {
            db.get('SELECT id FROM stock WHERE serial_number = ? AND id != ?', [serialFinal, stockId], (err2, duplicate: any) => {
                if (err2) { res.status(500).json({ error: err2.message }); return; }
                if (duplicate) { res.status(400).json({ error: 'Ese número de serie ya existe en otra unidad' }); return; }
                updateUnit();
            });
        } else {
            updateUnit();
        }
    });
};
