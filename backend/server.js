/**
 * VTC Dashboard Backend - Production Server
 * Node.js + Express + WebSocket
 * 
 * Endpoints:
 * - GET  /api/drivers          → Lista conductores
 * - GET  /api/drivers/:id      → Detalle conductor
 * - PUT  /api/drivers/:id/location → Actualiza GPS
 * - GET  /api/trips            → Lista viajes
 * - GET  /api/trips/:id        → Detalle viaje
 * - POST /api/trips            → Crea viaje
 * - PUT  /api/trips/:id/status → Actualiza estado
 * - POST /api/uber/request     → Pide Uber
 * - GET  /api/uber/estimate    → Estimación precio
 * - GET  /api/uber/products    → Productos disponibles
 * 
 * WebSocket: wss://server:port/ws (updates cada 5 seg)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// Importar rutas
const driversRoutes = require('./routes/drivers');
const tripsRoutes = require('./routes/trips');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const { getDatabase } = require('./database');

// Uber API: Usar mock si no hay API key real
const UBER_API_KEY = process.env.UBER_API_KEY;
let uberRoutes;
if (UBER_API_KEY && UBER_API_KEY !== 'demo' && UBER_API_KEY.length > 10) {
    uberRoutes = require('./routes/uber');
    console.log('[Server] Uber API real configurada');
} else {
    uberRoutes = require('./uber-mock');
    console.log('[Server] Uber API MODO DEMO activado (uber-mock.js)');
}

// ===========================================
// CONFIGURACIÓN
// ===========================================

const PORT = process.env.PORT || 3000;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'];
const WS_UPDATE_INTERVAL = parseInt(process.env.WS_UPDATE_INTERVAL) || 5000;
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/vtc.db');

// ===========================================
// INICIALIZAR EXPRESS
// ===========================================

const app = express();

// Middleware
app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ===========================================
// INICIALIZAR DATABASE
// ===========================================

async function initializeDatabase() {
    const dbDir = path.dirname(DATABASE_PATH);
    
    // Crear directorio si no existe
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('[Server] Created database directory:', dbDir);
    }
    
    // Crear database si no existe
    const dbExists = fs.existsSync(DATABASE_PATH);
    
    // Inicializar rutas de database
    await driversRoutes.initDatabase(DATABASE_PATH);
    await tripsRoutes.initDatabase(DATABASE_PATH);
    await uberRoutes.initDatabase(DATABASE_PATH);
    
    // Si es nueva, ejecutar schema
    if (!dbExists) {
        console.log('[Server] Creating new database...');
        const db = await getDatabase();
        
        // Leer y ejecutar schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Ejecutar statements uno por uno (sql.js requiere esto)
            const statements = schema.split(';').filter(s => s.trim().length > 0);
            for (const stmt of statements) {
                if (stmt.trim()) {
                    try {
                        db.exec(stmt);
                    } catch (e) {
                        // Ignorar errores de statements vacíos
                    }
                }
            }
            
            db.save();
            console.log('[Server] Database schema created successfully');
        }
    } else {
        console.log('[Server] Using existing database:', DATABASE_PATH);
    }
}

// ===========================================
// INICIALIZAR UBER API
// ===========================================

function initializeUber() {
    uberRoutes.initUber({
        UBER_SERVER_TOKEN: process.env.UBER_SERVER_TOKEN || '',
        UBER_CLIENT_ID: process.env.UBER_CLIENT_ID || '',
        UBER_CLIENT_SECRET: process.env.UBER_CLIENT_SECRET || ''
    });
}

// ===========================================
// ROUTES
// ===========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Drivers endpoints
app.get('/api/drivers', driversRoutes.getAllDrivers);
app.get('/api/drivers/:id', driversRoutes.getDriverById);
app.put('/api/drivers/:id/location', driversRoutes.updateDriverLocation);
app.post('/api/drivers', driversRoutes.createDriver);

// Trips endpoints
app.get('/api/trips', tripsRoutes.getAllTrips);
app.get('/api/trips/:id', tripsRoutes.getTripById);
app.post('/api/trips', tripsRoutes.createTrip);
app.put('/api/trips/:id/status', tripsRoutes.updateTripStatus);
app.delete('/api/trips/:id', tripsRoutes.deleteTrip);

// Uber API endpoints
app.post('/api/uber/request', uberRoutes.createUberRequest);
app.get('/api/uber/estimate', uberRoutes.getUberEstimate);
app.get('/api/uber/products', uberRoutes.getUberProducts);
app.get('/api/uber/request/:id', uberRoutes.getUberRequestStatus);

// Analytics endpoints
app.get('/api/analytics', analyticsRoutes.getAnalytics);
app.get('/api/analytics/revenue', analyticsRoutes.getRevenue);
app.get('/api/analytics/heatmap', analyticsRoutes.getHeatmapData);
app.get('/api/analytics/drivers', analyticsRoutes.getDriverAnalytics);
app.get('/api/analytics/vehicles', analyticsRoutes.getVehicleAnalytics);

// Notifications endpoints
app.get('/api/notifications', notificationsRoutes.getNotifications);
app.get('/api/notifications/:id', notificationsRoutes.getNotificationById);
app.post('/api/notifications', notificationsRoutes.createNotification);
app.post('/api/notifications/:id/read', notificationsRoutes.markAsRead);
app.post('/api/notifications/broadcast', notificationsRoutes.broadcastNotification);
app.delete('/api/notifications/:id', notificationsRoutes.deleteNotification);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===========================================
// WEBSOCKET SERVER (Real-time updates)
// ===========================================

function initializeWebSocket(server) {
    const wss = new WebSocket.Server({ 
        server,
        path: '/ws'
    });
    
    const clients = new Set();
    
    wss.on('connection', (ws) => {
        console.log('[WebSocket] Client connected');
        clients.add(ws);
        
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        
        ws.on('close', () => {
            console.log('[WebSocket] Client disconnected');
            clients.delete(ws);
        });
        
        ws.on('error', (error) => {
            console.error('[WebSocket] Error:', error.message);
            clients.delete(ws);
        });
    });
    
    // Heartbeat para detectar clientes muertos
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    
    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });
    
    // Broadcast de updates periódicos
    const broadcastInterval = setInterval(async () => {
        if (clients.size === 0) return;
        
        try {
            const db = await getDatabase();
            
            const drivers = db.prepare('SELECT id, name, status, latitude, longitude, heading FROM drivers').all();
            const trips = db.prepare(`
                SELECT t.id, t.status, t.driver_id, d.name as driver_name 
                FROM trips t 
                LEFT JOIN drivers d ON t.driver_id = d.id 
                WHERE t.status IN ('requested', 'accepted', 'in_progress')
            `).all();
            
            const payload = JSON.stringify({
                type: 'update',
                timestamp: new Date().toISOString(),
                data: {
                    drivers: drivers.map(d => ({
                        id: d.id,
                        name: d.name,
                        status: d.status,
                        location: { lat: d.latitude, lng: d.longitude, heading: d.heading }
                    })),
                    activeTrips: trips.map(t => ({
                        id: t.id,
                        status: t.status,
                        driverId: t.driver_id,
                        driverName: t.driver_name
                    }))
                }
            });
            
            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            });
            
            console.log(`[WebSocket] Broadcasted update to ${clients.size} clients`);
            
        } catch (error) {
            console.error('[WebSocket] Error broadcasting:', error.message);
        }
        
    }, WS_UPDATE_INTERVAL);
    
    console.log(`[WebSocket] Real-time updates enabled (interval: ${WS_UPDATE_INTERVAL}ms)`);
    
    return { wss, broadcastInterval };
}

// ===========================================
// SIMULACIÓN DE MOVIMIENTO (Demo mode)
// ===========================================

async function startMovementSimulation() {
    setInterval(async () => {
        try {
            const db = await getDatabase();
            
            // Mover conductores "available" ligeramente
            const drivers = db.prepare("SELECT id, latitude, longitude, heading FROM drivers WHERE status = 'available'").all();
            
            drivers.forEach(driver => {
                // Pequeño movimiento aleatorio
                const deltaLat = (Math.random() - 0.5) * 0.001; // ~100m
                const deltaLng = (Math.random() - 0.5) * 0.001;
                const newHeading = (driver.heading + (Math.random() - 0.5) * 30) % 360;
                
                const updateStmt = db.prepare(`
                    UPDATE drivers 
                    SET latitude = ?, longitude = ?, heading = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                
                updateStmt.run(
                    driver.latitude + deltaLat,
                    driver.longitude + deltaLng,
                    newHeading,
                    driver.id
                );
            });
            
            console.log('[Simulation] Updated driver locations');
            
        } catch (error) {
            console.error('[Simulation] Error:', error.message);
        }
        
    }, 10000); // Cada 10 segundos
    
    console.log('[Simulation] Movement simulation started');
}

// ===========================================
// START SERVER
// ===========================================

async function startServer() {
    // Inicializar componentes
    await initializeDatabase();
    initializeUber();
    
    // Crear HTTP server
    const server = http.createServer(app);
    
    // Inicializar WebSocket
    initializeWebSocket(server);
    
    // Iniciar simulación (demo mode)
    if (process.env.NODE_ENV !== 'production') {
        await startMovementSimulation();
    }
    
    // Start listening
    server.listen(PORT, () => {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║          VTC Dashboard Backend - Production Ready        ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║  Server running on:    http://localhost:${PORT}                ║`);
        console.log(`║  WebSocket endpoint:   ws://localhost:${PORT}/ws             ║`);
        console.log(`║  Environment:          ${process.env.NODE_ENV || 'development'}                          ║`);
        console.log(`║  Database:             ${DATABASE_PATH}        ║`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  Available Endpoints:                                    ║');
        console.log('║  GET  /api/drivers          - Lista conductores          ║');
        console.log('║  GET  /api/trips            - Lista viajes activos       ║');
        console.log('║  POST /api/uber/request     - Crear petición Uber        ║');
        console.log('║  GET  /api/uber/estimate    - Estimación de precio       ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('[Server] SIGTERM received, shutting down gracefully...');
        server.close(() => {
            console.log('[Server] Process terminated');
            process.exit(0);
        });
    });
    
    return server;
}

// ===========================================
// EXPORT & START
// ===========================================

module.exports = { app, startServer };

// Si se ejecuta directamente
if (require.main === module) {
    startServer();
}
