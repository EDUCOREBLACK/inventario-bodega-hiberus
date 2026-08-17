import { Request, Response } from 'express';
import db from '../database/database';

export const getMarcas = (req: Request, res: Response) => {
    db.all(`
        SELECT id, nombre, descripcion, sitio_web, contacto, created_at
        FROM marcas
        ORDER BY nombre ASC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
};

export const createMarca = (req: Request, res: Response) => {
    const { nombre, descripcion, sitio_web, contacto } = req.body;
    if (!nombre) {
        res.status(400).json({ error: 'El nombre de la marca es requerido' });
        return;
    }

    db.run(`
        INSERT INTO marcas (nombre, descripcion, sitio_web, contacto)
        VALUES (?, ?, ?, ?)
    `, [nombre, descripcion || '', sitio_web || '', contacto || ''], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Marca creada correctamente' });
    });
};

export const updateMarca = (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, descripcion, sitio_web, contacto } = req.body;

    db.run(`
        UPDATE marcas SET
            nombre = COALESCE(?, nombre),
            descripcion = COALESCE(?, descripcion),
            sitio_web = COALESCE(?, sitio_web),
            contacto = COALESCE(?, contacto),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [nombre, descripcion, sitio_web, contacto, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Marca no encontrada' });
            return;
        }
        res.json({ message: 'Marca actualizada correctamente' });
    });
};

export const deleteMarca = (req: Request, res: Response) => {
    const { id } = req.params;
    db.run('DELETE FROM marcas WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Marca no encontrada' });
            return;
        }
        res.json({ message: 'Marca eliminada correctamente' });
    });
};
