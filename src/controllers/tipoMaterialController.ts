import { Request, Response } from 'express';
import db from '../database/database';

export const getTiposMaterial = (req: Request, res: Response) => {
    db.all(`
        SELECT id, familia_id, nombre, descripcion, requiere_serial, requiere_metraje, requiere_vencimiento, unidad_medida_default
        FROM tipos_material
        ORDER BY nombre ASC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

export const createTipoMaterial = (req: Request, res: Response) => {
    const { familia_id, nombre, descripcion, requiere_serial, requiere_metraje, requiere_vencimiento, unidad_medida_default } = req.body;
    if (!nombre) {
        res.status(400).json({ error: 'El nombre es requerido' });
        return;
    }

    db.run(`
        INSERT INTO tipos_material (familia_id, nombre, descripcion, requiere_serial, requiere_metraje, requiere_vencimiento, unidad_medida_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [familia_id || 1, nombre, descripcion || '', requiere_serial || 0, requiere_metraje || 0, requiere_vencimiento || 0, unidad_medida_default || 'unidad'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Tipo de material creado correctamente' });
    });
};

export const updateTipoMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    const { familia_id, nombre, descripcion, requiere_serial, requiere_metraje, requiere_vencimiento, unidad_medida_default } = req.body;

    db.run(`
        UPDATE tipos_material SET
            familia_id = COALESCE(?, familia_id),
            nombre = COALESCE(?, nombre),
            descripcion = COALESCE(?, descripcion),
            requiere_serial = COALESCE(?, requiere_serial),
            requiere_metraje = COALESCE(?, requiere_metraje),
            requiere_vencimiento = COALESCE(?, requiere_vencimiento),
            unidad_medida_default = COALESCE(?, unidad_medida_default),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [familia_id, nombre, descripcion, requiere_serial, requiere_metraje, requiere_vencimiento, unidad_medida_default, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Tipo de material no encontrado' });
            return;
        }
        res.json({ message: 'Tipo de material actualizado correctamente' });
    });
};

export const deleteTipoMaterial = (req: Request, res: Response) => {
    const { id } = req.params;
    db.run('DELETE FROM tipos_material WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Tipo de material no encontrado' });
            return;
        }
        res.json({ message: 'Tipo de material eliminado correctamente' });
    });
};
