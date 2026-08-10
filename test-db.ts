import { initDatabase } from './src/database/database';

console.log('🧪 Probando base de datos...');

initDatabase()
    .then(() => {
        console.log('✅ Base de datos funcionando correctamente');
        console.log('📁 Ubicación: ./database/inventario.db');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
