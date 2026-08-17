import { Request, Response } from 'express';
import db from '../database/database';

export const getSucursales = (req: Request, res: Response) => {
  db.all('SELECT * FROM sucursales ORDER BY nombre ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

export const getSucursalById = (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT * FROM sucursales WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json(row);
  });
};

export const createSucursal = (req: Request, res: Response) => {
  const { codigo, nombre, direccion, telefono, email, tipo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  db.run(`
    INSERT INTO sucursales (empresa_id, codigo, nombre, direccion, telefono, email, tipo, estado)
    VALUES (1, ?, ?, ?, ?, ?, ?, 'activo')
  `, [codigo || `SUC-${Date.now()}`, nombre, direccion || null, telefono || null, email || null, tipo || 'bodega'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Sucursal creada' });
  });
};

export const updateSucursal = (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, direccion, telefono, email, tipo, estado } = req.body;

  db.run(`
    UPDATE sucursales SET
      codigo = COALESCE(?, codigo),
      nombre = COALESCE(?, nombre),
      direccion = COALESCE(?, direccion),
      telefono = COALESCE(?, telefono),
      email = COALESCE(?, email),
      tipo = COALESCE(?, tipo),
      estado = COALESCE(?, estado),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [codigo, nombre, direccion, telefono, email, tipo, estado, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json({ message: 'Sucursal actualizada' });
  });
};

export const deleteSucursal = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM sucursales WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json({ message: 'Sucursal eliminada' });
  });
};
