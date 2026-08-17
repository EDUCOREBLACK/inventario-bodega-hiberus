import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { initDatabase } from './database/database';
import routes from './routes';
import { logger } from './middleware/logger';

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origen no permitido por CORS'));
    }
}));
app.use(express.json({ limit: '1mb' }));
app.use(logger);

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.use('/api', routes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Inventario de Bodega Hiberus',
        version: '1.0.0',
        estado: 'funcionando'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Iniciar servidor
const startServer = async () => {
    try {
        await initDatabase();
        console.log('✅ Base de datos inicializada correctamente');
        console.log('📁 Ubicación:', process.env.DB_PATH || './database/inventario.db');
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📊 Health Check: http://localhost:${PORT}/health`);
            console.log(`📋 API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();