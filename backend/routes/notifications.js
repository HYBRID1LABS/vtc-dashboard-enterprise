/**
 * Notifications Route Handler
 * GET /api/notifications - Lista todas las notificaciones
 * GET /api/notifications/:id - Obtiene una notificación específica
 * POST /api/notifications - Crea nueva notificación
 * POST /api/notifications/:id/read - Marca como leída
 * POST /api/notifications/broadcast - Envía notificación push a conductores
 * DELETE /api/notifications/:id - Elimina notificación
 */

const { getDatabase } = require('../database');
const { v4: uuidv4 } = require('uuid');

let dbInstance = null;

/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase(dbPath) {
    dbInstance = await getDatabase(dbPath);
    console.log('[Notifications] Database initialized:', dbPath);
}

/**
 * GET /api/notifications
 * Returns: Lista de notificaciones con filtros
 */
async function getNotifications(req, res) {
    try {
        const db = await getDatabase();
        const { type, priority, status, unread = false } = req.query;
        
        let query = `
            SELECT * FROM notifications
            WHERE 1=1
        `;
        
        const params = [];
        
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (unread === 'true') {
            query += ' AND is_read = 0';
        }
        
        query += ' ORDER BY created_at DESC LIMIT 100';
        
        const stmt = db.prepare(query);
        const notifications = stmt.all(...params);
        
        res.json({
            success: true,
            count: notifications.length,
            data: notifications.map(n => ({
                id: n.id,
                type: n.type,
                priority: n.priority,
                title: n.title,
                message: n.message,
                driverId: n.driver_id,
                tripId: n.trip_id,
                isRead: n.is_read === 1,
                createdAt: n.created_at,
                readAt: n.read_at
            }))
        });
    } catch (error) {
        console.error('[Notifications] Error getting notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notifications',
            message: error.message
        });
    }
}

/**
 * GET /api/notifications/:id
 * Returns: Una notificación específica
 */
async function getNotificationById(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        
        const stmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
        const notification = stmt.get(id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: notification.id,
                type: notification.type,
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
                driverId: notification.driver_id,
                tripId: notification.trip_id,
                isRead: notification.is_read === 1,
                createdAt: notification.created_at,
                readAt: notification.read_at
            }
        });
    } catch (error) {
        console.error('[Notifications] Error getting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notification',
            message: error.message
        });
    }
}

/**
 * POST /api/notifications
 * Creates: Nueva notificación
 */
async function createNotification(req, res) {
    try {
        const db = await getDatabase();
        const { type, priority, title, message, driverId, tripId, metadata } = req.body;
        
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const stmt = db.prepare(`
            INSERT INTO notifications (id, type, priority, title, message, driver_id, trip_id, metadata, created_at, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);
        
        stmt.run(
            id,
            type || 'general',
            priority || 'medium',
            title,
            message,
            driverId || null,
            tripId || null,
            metadata ? JSON.stringify(metadata) : null,
            now
        );
        
        // TODO: Enviar notificación push si hay driverId
        if (driverId) {
            await sendPushNotification(driverId, title, message);
        }
        
        res.status(201).json({
            success: true,
            data: {
                id,
                type,
                priority,
                title,
                message,
                driverId,
                tripId,
                createdAt: now
            }
        });
    } catch (error) {
        console.error('[Notifications] Error creating notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create notification',
            message: error.message
        });
    }
}

/**
 * POST /api/notifications/:id/read
 * Marks: Notificación como leída
 */
async function markAsRead(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        const now = new Date().toISOString();
        
        const stmt = db.prepare(`
            UPDATE notifications
            SET is_read = 1, read_at = ?
            WHERE id = ?
        `);
        
        stmt.run(now, id);
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('[Notifications] Error marking as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read',
            message: error.message
        });
    }
}

/**
 * POST /api/notifications/broadcast
 * Sends: Notificación push a múltiples conductores
 */
async function broadcastNotification(req, res) {
    try {
        const db = await getDatabase();
        const { title, message, priority = 'medium', driverIds, filters } = req.body;
        
        let targetDrivers = [];
        
        if (driverIds && driverIds.length > 0) {
            targetDrivers = driverIds;
        } else if (filters) {
            // Filtrar conductores por criterios
            let query = 'SELECT id FROM drivers WHERE 1=1';
            const params = [];
            
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }
            
            if (filters.zone) {
                // Filtrar por zona (requiere cálculo de distancia)
                const { lat, lng, radius } = filters.zone;
                query += ` AND (
                    6371 * acos(
                        cos(radians(?)) * cos(radians(latitude)) *
                        cos(radians(longitude) - radians(?)) +
                        sin(radians(?)) * sin(radians(latitude))
                    ) <= ?
                )`;
                params.push(lat, lng, lat, radius);
            }
            
            const stmt = db.prepare(query);
            const results = stmt.all(...params);
            targetDrivers = results.map(r => r.id);
        } else {
            // Todos los conductores activos
            const stmt = db.prepare("SELECT id FROM drivers WHERE status IN ('available', 'busy')");
            const results = stmt.all();
            targetDrivers = results.map(r => r.id);
        }
        
        // Crear notificación para cada conductor
        const now = new Date().toISOString();
        const insertStmt = db.prepare(`
            INSERT INTO notifications (id, type, priority, title, message, driver_id, created_at, is_read)
            VALUES (?, 'broadcast', ?, ?, ?, ?, ?, 0)
        `);
        
        const notificationIds = [];
        
        db.transaction(() => {
            for (const driverId of targetDrivers) {
                const id = uuidv4();
                insertStmt.run(id, priority, title, message, driverId, now);
                notificationIds.push(id);
            }
        })();
        
        // Enviar push notifications
        await sendBulkPushNotifications(targetDrivers, title, message);
        
        res.json({
            success: true,
            data: {
                sent: targetDrivers.length,
                notificationIds,
                timestamp: now
            }
        });
    } catch (error) {
        console.error('[Notifications] Error broadcasting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to broadcast notification',
            message: error.message
        });
    }
}

/**
 * DELETE /api/notifications/:id
 * Deletes: Una notificación
 */
async function deleteNotification(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        
        const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
        stmt.run(id);
        
        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('[Notifications] Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification',
            message: error.message
        });
    }
}

/**
 * Helper: Enviar notificación push a un conductor
 */
async function sendPushNotification(driverId, title, message) {
    // TODO: Implementar con Firebase Cloud Messaging, OneSignal, o similar
    console.log(`[Notifications] Push to driver ${driverId}: ${title} - ${message}`);
    
    // Mock implementation
    return {
        success: true,
        messageId: uuidv4()
    };
}

/**
 * Helper: Enviar notificaciones push masivas
 */
async function sendBulkPushNotifications(driverIds, title, message) {
    console.log(`[Notifications] Bulk push to ${driverIds.length} drivers: ${title}`);
    
    // TODO: Implementar con servicio de push notifications
    return {
        success: true,
        sent: driverIds.length
    };
}

/**
 * Helper: Crear notificación automática por evento del sistema
 */
async function createSystemNotification(type, data) {
    try {
        const db = await getDatabase();
        
        const templates = {
            lowBattery: {
                priority: 'critical',
                title: '🔋 Batería Baja',
                message: (d) => `${d.driverName} reporta batería al ${d.percentage}%. Ubicación: ${d.location}`
            },
            mechanicalIssue: {
                priority: 'high',
                title: '🔧 Falla Mecánica',
                message: (d) => `${d.driverName} reporta: ${d.issue}. Vehículo: ${d.vehicle}`
            },
            accident: {
                priority: 'critical',
                title: '⚠️ Accidente Reportado',
                message: (d) => `${d.driverName} reporta accidente en ${d.location}. Estado: ${d.status}`
            },
            trafficIncident: {
                priority: 'high',
                title: '🚗 Incidencia de Tráfico',
                message: (d) => `${d.description}. Impacto: ${d.affectedDrivers} conductores.`
            },
            lowRating: {
                priority: 'medium',
                title: '📋 Valoración Baja',
                message: (d) => `${d.driverName} recibe ${d.rating}⭐ de pasajero. Motivo: ${d.reason}`
            },
            maintenanceReminder: {
                priority: 'low',
                title: '📝 Recordatorio de Mantenimiento',
                message: (d) => `${d.vehicleCount} vehículos próximos a revisión ITV. Fecha límite: ${d.deadline}`
            }
        };
        
        const template = templates[type];
        if (!template) {
            throw new Error(`Unknown notification type: ${type}`);
        }
        
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const stmt = db.prepare(`
            INSERT INTO notifications (id, type, priority, title, message, created_at, is_read)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `);
        
        stmt.run(
            id,
            type,
            template.priority,
            template.title,
            template.message(data),
            now
        );
        
        return { success: true, id };
    } catch (error) {
        console.error('[Notifications] Error creating system notification:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initDatabase,
    getNotifications,
    getNotificationById,
    createNotification,
    markAsRead,
    broadcastNotification,
    deleteNotification,
    createSystemNotification,
    sendPushNotification,
    sendBulkPushNotifications
};
