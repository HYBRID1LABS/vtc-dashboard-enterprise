// init-db.js - Inicializa la base de datos SQLite en Railway
const fs = require('fs');
const path = require('path');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'database', 'vtc.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

// Asegurar que el directorio existe
const dbDir = path.dirname(databasePath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ Directorio creado: ${dbDir}`);
}

// Leer y ejecutar schema
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Si la DB ya existe, la eliminamos para recrearla limpia
    if (fs.existsSync(databasePath)) {
        fs.unlinkSync(databasePath);
        console.log('🗑️  DB anterior eliminada');
    }
    
    // Guardar schema como archivo .sql para referencia
    fs.writeFileSync(databasePath + '.sql', schema);
    console.log('✅ Schema guardado para referencia');
    
    // Nota: En producción, init-sql.sh ejecutará esto
    console.log('✅ init-db.js completado - schema listo para ejecutar');
} else {
    console.error('❌ schema.sql no encontrado');
    process.exit(1);
}
