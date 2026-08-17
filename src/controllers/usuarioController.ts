import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/database';

// Listar usuarios
export const getUsuarios = (req: Request, res: Response) => {
    db.all(`
        SELECT id, nombre, apellido, email, rol, telefono, departamento, activo, created_at, ultimo_login
        FROM usuarios
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

// Obtener usuario por ID
export const getUsuarioById = (req: Request, res: Response) => {
    const { id } = req.params;
    db.get(`
        SELECT id, nombre, apellido, email, rol, telefono, departamento, activo, created_at
        FROM usuarios WHERE id = ?
    `, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json(row);
    });
};

// Crear usuario (admin)
export const createUsuario = async (req: Request, res: Response) => {
    const { nombre, apellido, email, password, rol, telefono, departamento } = req.body;

    if (!nombre || !email || !password) {
        res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        return;
    }

    try {
        db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row: any) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row) {
                res.status(400).json({ error: 'El email ya está registrado' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(`
                INSERT INTO usuarios (empresa_id, nombre, apellido, email, password_hash, rol, telefono, departamento, activo)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [nombre, apellido || '', email, hashedPassword, rol || 'operador', telefono || '', departamento || ''],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.status(201).json({
                    id: this.lastID,
                    message: 'Usuario creado exitosamente'
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

// Actualizar usuario
export const updateUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, apellido, email, rol, telefono, departamento, activo, password } = req.body;

    let query = `
        UPDATE usuarios SET
            nombre = COALESCE(?, nombre),
            apellido = COALESCE(?, apellido),
            email = COALESCE(?, email),
            rol = COALESCE(?, rol),
            telefono = COALESCE(?, telefono),
            departamento = COALESCE(?, departamento),
            activo = COALESCE(?, activo),
            updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [nombre, apellido, email, rol, telefono, departamento, activo];

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += `, password_hash = ?`;
        params.push(hashedPassword);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json({ message: 'Usuario actualizado exitosamente' });
    });
};

// Eliminar usuario
export const deleteUsuario = (req: Request, res: Response) => {
    const { id } = req.params;
    db.run('DELETE FROM usuarios WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        res.json({ message: 'Usuario eliminado exitosamente' });
    });
};