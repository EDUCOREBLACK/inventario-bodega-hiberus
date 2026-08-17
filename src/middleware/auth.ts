import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
    usuario?: {
        id: number;
        email: string;
        nombre: string;
        rol: string;
        empresa_id: number;
    };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const allowLocalDev = process.env.ALLOW_LOCAL_AUTH === 'true';

    if (!token && allowLocalDev) {
        req.usuario = {
            id: 1,
            email: 'admin@hiberus.cl',
            nombre: 'Administrador',
            rol: 'admin',
            empresa_id: 1
        };
        next();
        return;
    }

    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        return;
    }

    if (!JWT_SECRET) {
        res.status(500).json({ error: 'El servidor no tiene configurada la clave JWT.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.usuario = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

export const verificarRol = (rolesPermitidos: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const usuario = req.usuario;
        if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
            res.status(403).json({ error: 'No tienes permisos para esta acción.' });
            return;
        }
        next();
    };
};