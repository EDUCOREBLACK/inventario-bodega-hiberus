import { Request, Response } from 'express';
import db from '../database/database';

export const getProveedores = (req: Request, res: Response) => {
  db.all('SELECT * FROM proveedores ORDER BY nombre ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

export const getProveedorById = (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT * FROM proveedores WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(row);
  });
};

export const createProveedor = (req: Request, res: Response) => {
  const { nombre, rut, direccion, telefono, email, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago, plazo_entrega } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  db.run(`
    INSERT INTO proveedores (nombre, rut, direccion, telefono, email, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago, plazo_entrega, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
  `, [nombre, rut || null, direccion || null, telefono || null, email || null, contacto_nombre || null, contacto_telefono || null, contacto_email || null, condiciones_pago || null, plazo_entrega || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Proveedor creado' });
  });
};

export const updateProveedor = (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, rut, direccion, telefono, email, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago, plazo_entrega, estado } = req.body;

  db.run(`
    UPDATE proveedores SET
      nombre = COALESCE(?, nombre),
      rut = COALESCE(?, rut),
      direccion = COALESCE(?, direccion),
      telefono = COALESCE(?, telefono),
      email = COALESCE(?, email),
      contacto_nombre = COALESCE(?, contacto_nombre),
      contacto_telefono = COALESCE(?, contacto_telefono),
      contacto_email = COALESCE(?, contacto_email),
      condiciones_pago = COALESCE(?, condiciones_pago),
      plazo_entrega = COALESCE(?, plazo_entrega),
      estado = COALESCE(?, estado),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [nombre, rut, direccion, telefono, email, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago, plazo_entrega, estado, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor actualizado' });
  });
};

export const deleteProveedor = (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM proveedores WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  });
};
