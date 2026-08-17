# Inventario Bodega Hiberus

Sistema de gestión de inventario y bodega. Desarrollado con Node.js, Express, SQLite y React.

## Requisitos
- Node.js v16+
- NPM o Yarn

## Configuración del Entorno
Renombra el archivo `.env.example` a `.env` y ajusta las variables de configuración si es necesario (el puerto por defecto es 5001 para el backend).

## Instalación y Ejecución

### Backend
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor (desarrollo):
   ```bash
   npm run dev
   ```

### Frontend
1. Entrar a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar la aplicación web:
   ```bash
   npm start
   ```

## Notas de Producción
- La base de datos es SQLite (`database/inventario.db`). Al inicializarse por primera vez creará la estructura y un usuario administrador.
- Actualmente se encuentra saneada y lista para uso con datos de catálogos base.
