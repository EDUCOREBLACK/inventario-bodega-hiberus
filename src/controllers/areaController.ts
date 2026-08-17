import { Request, Response } from 'express';
import db from '../database/database';

export const getAreas = (req: Request, res: Response) => {
  db.all(`
    SELECT id, sucursal_id, codigo, nombre, descripcion, tipo, capacidad, estado, created_at
    FROM areas
    ORDER BY nombre ASC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

export const createArea = (req: Request, res: Response) => {
  const { sucursal_id, codigo, nombre, descripcion, tipo, capacidad } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del área es requerido' });

  db.run(`
    INSERT INTO areas (sucursal_id, codigo, nombre, descripcion, tipo, capacidad, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'activo')
  `, [sucursal_id || 1, codigo || `AREA-${Date.now()}`, nombre, descripcion || null, tipo || 'zona', capacidad || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const newAreaId = this.lastID;
    // Asignar automáticamente la nueva Área a los productos que no la tengan
    db.run(`UPDATE productos SET area_id = ? WHERE area_id IS NULL`, [newAreaId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      res.status(201).json({ id: newAreaId, message: 'Área creada y asignada a productos sin área' });
    });
  });
};

export const updateArea = (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion, tipo, capacidad, estado } = req.body;

  db.run(`
    UPDATE areas SET
      codigo = COALESCE(?, codigo),
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      tipo = COALESCE(?, tipo),
      capacidad = COALESCE(?, capacidad),
      estado = COALESCE(?, estado),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [codigo, nombre, descripcion, tipo, capacidad, estado, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Área no encontrada' });
    res.json({ message: 'Área actualizada' });
  });
};

export const deleteArea = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM areas WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Área no encontrada' });
    res.json({ message: 'Área eliminada' });
  });
};
