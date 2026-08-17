import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/database';

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registrar nuevo usuario
export const register = async (req: Request, res: Response) => {
    const { nombre, apellido, email, password, telefono, departamento } = req.body;
    const emailNormalizado = String(email || '').trim().toLowerCase();

    if (!nombre?.trim() || !EMAIL_PATTERN.test(emailNormalizado) || typeof password !== 'string' || password.length < 12) {
        res.status(400).json({ error: 'Nombre, email válido y una contraseña de al menos 12 caracteres son requeridos' });
        return;
    }

    try {
        // Verificar si el email ya existe
        db.get('SELECT id FROM usuarios WHERE email = ?', [emailNormalizado], async (err, row: any) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row) {
                res.status(400).json({ error: 'El email ya está registrado' });
                return;
            }

            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(`
                INSERT INTO usuarios (empresa_id, nombre, apellido, email, password_hash, rol, telefono, departamento, activo)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [nombre.trim(), String(apellido || '').trim(), emailNormalizado, hashedPassword, 'operador', String(telefono || '').trim(), String(departamento || '').trim()],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.status(201).json({
                    id: this.lastID,
                    message: 'Usuario registrado exitosamente'
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

// Login de usuario
export const login = (req: Request, res: Response) => {
    const { email, password } = req.body;
    const emailNormalizado = String(email || '').trim().toLowerCase();

    if (!EMAIL_PATTERN.test(emailNormalizado) || typeof password !== 'string' || !password) {
        res.status(400).json({ error: 'Email y contraseña son requeridos' });
        return;
    }

    db.get(`
        SELECT id, nombre, apellido, email, password_hash, rol, empresa_id, activo
        FROM usuarios WHERE email = ?
    `, [emailNormalizado], async (err, user: any) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!user) {
            res.status(401).json({ error: 'Credenciales incorrectas' });
            return;
        }
        if (!user.activo) {
            res.status(401).json({ error: 'Usuario desactivado' });
            return;
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            res.status(401).json({ error: 'Credenciales incorrectas' });
            return;
        }

        if (!JWT_SECRET) {
            res.status(500).json({ error: 'El servidor no tiene configurada la clave JWT.' });
            return;
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                rol: user.rol,
                empresa_id: user.empresa_id
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Actualizar último login
        db.run('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        res.json({
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol,
                empresa_id: user.empresa_id
            }
        });
    });
};

// Obtener perfil del usuario autenticado
export const getPerfil = (req: Request, res: Response) => {
    const usuario = (req as any).usuario;
    if (!usuario) {
        res.status(401).json({ error: 'No autenticado' });
        return;
    }

    db.get(`
        SELECT id, nombre, apellido, email, rol, telefono, departamento, activo, created_at
        FROM usuarios WHERE id = ?
    `, [usuario.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
};