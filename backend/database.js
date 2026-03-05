/**
 * Database Wrapper - sql.js (SQLite in-memory with file persistence)
 * Compatible con Node.js 25+
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class Database {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        this.initialized = false;
    }

    async init() {
        const SQL = await initSqlJs();
        
        // Cargar database existente o crear nueva
        if (fs.existsSync(this.dbPath)) {
            const fileBuffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(fileBuffer);
            console.log('[Database] Loaded existing database:', this.dbPath);
        } else {
            this.db = new SQL.Database();
            console.log('[Database] Created new in-memory database');
        }
        
        this.initialized = true;
        return this;
    }

    save() {
        if (!this.db) return;
        
        const data = this.db.export();
        const buffer = Buffer.from(data);
        
        // Crear directorio si no existe
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(this.dbPath, buffer);
    }

    exec(sql) {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.exec(sql);
    }

    prepare(sql) {
        if (!this.db) throw new Error('Database not initialized');
        
        return {
            all: (...params) => {
                const stmt = this.db.prepare(sql);
                stmt.bind(params);
                const results = [];
                
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                
                stmt.free();
                return results;
            },
            
            get: (...params) => {
                const stmt = this.db.prepare(sql);
                stmt.bind(params);
                
                let result = null;
                if (stmt.step()) {
                    result = stmt.getAsObject();
                }
                
                stmt.free();
                return result;
            },
            
            run: (...params) => {
                this.db.run(sql, params);
                this.save(); // Auto-save después de writes
                return {
                    changes: this.db.getRowsModified()
                };
            }
        };
    }

    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}

// Singleton pattern
let dbInstance = null;

async function getDatabase(dbPath) {
    if (!dbInstance) {
        dbInstance = new Database(dbPath);
        await dbInstance.init();
    }
    return dbInstance;
}

module.exports = { Database, getDatabase };
