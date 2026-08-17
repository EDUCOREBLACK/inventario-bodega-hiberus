import { Request, Response } from 'express';
import db from '../database/database';

export const getClientes = (req: Request, res: Response) => {
  db.all('SELECT * FROM clientes ORDER BY nombre ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

export const getClienteById = (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(row);
  });
};

export const createCliente = (req: Request, res: Response) => {
  const { codigo, nombre, rut, direccion, telefono, email, contacto_nombre, sector, tipo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  db.run(`
    INSERT INTO clientes (empresa_id, codigo, nombre, rut, direccion, telefono, email, contacto_nombre, sector, tipo, estado)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `, [codigo || `CLI-${Date.now()}`, nombre, rut || null, direccion || null, telefono || null, email || null, contacto_nombre || null, sector || null, tipo || 'empresa'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Cliente creado' });
  });
};

export const updateCliente = (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, rut, direccion, telefono, email, contacto_nombre, sector, tipo, estado } = req.body;

  db.run(`
    UPDATE clientes SET
      codigo = COALESCE(?, codigo),
      nombre = COALESCE(?, nombre),
      rut = COALESCE(?, rut),
      direccion = COALESCE(?, direccion),
      telefono = COALESCE(?, telefono),
      email = COALESCE(?, email),
      contacto_nombre = COALESCE(?, contacto_nombre),
      sector = COALESCE(?, sector),
      tipo = COALESCE(?, tipo),
      estado = COALESCE(?, estado),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [codigo, nombre, rut, direccion, telefono, email, contacto_nombre, sector, tipo, estado, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente actualizado' });
  });
};

export const deleteCliente = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM clientes WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  });
};
