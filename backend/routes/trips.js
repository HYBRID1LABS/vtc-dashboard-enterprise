/**
 * Trips Route Handler
 * GET /api/trips - Lista todos los viajes activos
 * GET /api/trips/:id - Obtiene un viaje específico
 * POST /api/trips - Crea nuevo viaje
 * PUT /api/trips/:id/status - Actualiza estado del viaje
 */

const { getDatabase } = require('../database');
const { v4: uuidv4 } = require('uuid');

let dbInstance = null;

/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase(dbPath) {
    dbInstance = await getDatabase(dbPath);
    console.log('[Trips] Database initialized:', dbPath);
}

/**
 * GET /api/trips
 * Returns: Lista de viajes con filtros opcionales
 * Query params: ?status=in_progress&driver_id=xxx
 */
async function getAllTrips(req, res) {
    try {
        const db = await getDatabase();
        const { status, driver_id } = req.query;
        
        let query = `
            SELECT t.*, d.name as driver_name, d.vehicle_model, d.license_plate
            FROM trips t
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        
        if (driver_id) {
            query += ' AND t.driver_id = ?';
            params.push(driver_id);
        }
        
        query += ' ORDER BY t.created_at DESC';
        
        const stmt = db.prepare(query);
        const trips = stmt.all(...params);
        
        res.json({
            success: true,
            count: trips.length,
            data: trips.map(trip => ({
                id: trip.id,
                driver: trip.driver_id ? {
                    id: trip.driver_id,
                    name: trip.driver_name,
                    vehicle: trip.vehicle_model,
                    licensePlate: trip.license_plate
                } : null,
                passenger: trip.passenger_name,
                pickup: {
                    address: trip.pickup_address,
                    location: {
                        lat: trip.pickup_latitude,
                        lng: trip.pickup_longitude
                    }
                },
                dropoff: {
                    address: trip.dropoff_address,
                    location: {
                        lat: trip.dropoff_latitude,
                        lng: trip.dropoff_longitude
                    }
                },
                status: trip.status,
                pricing: {
                    estimated: trip.estimated_price,
                    actual: trip.actual_price,
                    currency: 'EUR'
                },
                distance: {
                    km: trip.distance_km,
                    durationMinutes: trip.duration_minutes
                },
                uberRequestId: trip.uber_request_id,
                timestamps: {
                    created: trip.created_at,
                    started: trip.started_at,
                    completed: trip.completed_at
                }
            }))
        });
    } catch (error) {
        console.error('[Trips] Error getting all trips:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve trips',
            message: error.message
        });
    }
}

/**
 * GET /api/trips/:id
 * Returns: Un viaje específico con detalles completos
 */
async function getTripById(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        
        const query = `
            SELECT t.*, d.name as driver_name, d.vehicle_model, d.license_plate, d.phone as driver_phone
            FROM trips t
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `;
        
        const stmt = db.prepare(query);
        const trip = stmt.get(id);
        
        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: trip.id,
                driver: trip.driver_id ? {
                    id: trip.driver_id,
                    name: trip.driver_name,
                    vehicle: trip.vehicle_model,
                    licensePlate: trip.license_plate,
                    phone: trip.driver_phone
                } : null,
                passenger: {
                    name: trip.passenger_name
                },
                route: {
                    pickup: {
                        address: trip.pickup_address,
                        location: {
                            lat: trip.pickup_latitude,
                            lng: trip.pickup_longitude
                        }
                    },
                    dropoff: {
                        address: trip.dropoff_address,
                        location: {
                            lat: trip.dropoff_latitude,
                            lng: trip.dropoff_longitude
                        }
                    }
                },
                status: trip.status,
                pricing: {
                    estimated: trip.estimated_price,
                    actual: trip.actual_price,
                    currency: 'EUR'
                },
                distance: {
                    km: trip.distance_km,
                    durationMinutes: trip.duration_minutes
                },
                uberRequestId: trip.uber_request_id,
                timestamps: {
                    created: trip.created_at,
                    started: trip.started_at,
                    completed: trip.completed_at
                }
            }
        });
    } catch (error) {
        console.error('[Trips] Error getting trip by ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve trip',
            message: error.message
        });
    }
}

/**
 * POST /api/trips
 * Creates: Nuevo viaje (puede estar vinculado a Uber API)
 */
async function createTrip(req, res) {
    try {
        const db = await getDatabase();
        const {
            driver_id,
            passenger_name,
            pickup_address,
            dropoff_address,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            estimated_price,
            distance_km,
            duration_minutes,
            uber_request_id
        } = req.body;
        
        // Validaciones mínimas
        if (!pickup_address || !dropoff_address) {
            return res.status(400).json({
                success: false,
                error: 'Pickup and dropoff addresses are required'
            });
        }
        
        const id = uuidv4();
        
        const stmt = db.prepare(`
            INSERT INTO trips (
                id, driver_id, passenger_name, pickup_address, dropoff_address,
                pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude,
                status, estimated_price, distance_km, duration_minutes, uber_request_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)
        `);
        
        stmt.run(
            id,
            driver_id || null,
            passenger_name || null,
            pickup_address,
            dropoff_address,
            pickup_latitude || null,
            pickup_longitude || null,
            dropoff_latitude || null,
            dropoff_longitude || null,
            estimated_price || null,
            distance_km || null,
            duration_minutes || null,
            uber_request_id || null
        );
        
        res.status(201).json({
            success: true,
            message: 'Trip created successfully',
            data: {
                id,
                status: 'requested',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Trips] Error creating trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create trip',
            message: error.message
        });
    }
}

/**
 * PUT /api/trips/:id/status
 * Updates: Estado del viaje (requested → accepted → in_progress → completed)
 */
async function updateTripStatus(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        const { status, driver_id, actual_price, started_at, completed_at } = req.body;
        
        // Validar estado
        const validStatuses = ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        
        // Verificar que el viaje existe
        const checkStmt = db.prepare('SELECT id, status FROM trips WHERE id = ?');
        const trip = checkStmt.get(id);
        
        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }
        
        // Construir update
        const updateFields = [];
        const updateValues = [];
        
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
            
            // Auto-set timestamps según estado
            if (status === 'in_progress' && !started_at) {
                updateFields.push('started_at = CURRENT_TIMESTAMP');
            } else if (status === 'completed' && !completed_at) {
                updateFields.push('completed_at = CURRENT_TIMESTAMP');
            }
        }
        
        if (driver_id !== undefined) {
            updateFields.push('driver_id = ?');
            updateValues.push(driver_id);
        }
        
        if (actual_price !== undefined) {
            updateFields.push('actual_price = ?');
            updateValues.push(actual_price);
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        
        const updateStmt = db.prepare(`
            UPDATE trips 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `);
        
        updateStmt.run(...updateValues);
        
        // Obtener datos actualizados
        const stmt = db.prepare('SELECT * FROM trips WHERE id = ?');
        const updatedTrip = stmt.get(id);
        
        res.json({
            success: true,
            message: 'Trip status updated successfully',
            data: {
                id: updatedTrip.id,
                status: updatedTrip.status,
                driver_id: updatedTrip.driver_id,
                started_at: updatedTrip.started_at,
                completed_at: updatedTrip.completed_at
            }
        });
    } catch (error) {
        console.error('[Trips] Error updating trip status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update trip status',
            message: error.message
        });
    }
}

/**
 * DELETE /api/trips/:id
 * Deletes: Un viaje (solo si está en estado cancelled o completed)
 */
async function deleteTrip(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        
        // Verificar estado
        const checkStmt = db.prepare('SELECT status FROM trips WHERE id = ?');
        const trip = checkStmt.get(id);
        
        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }
        
        if (!['cancelled', 'completed'].includes(trip.status)) {
            return res.status(400).json({
                success: false,
                error: 'Can only delete cancelled or completed trips'
            });
        }
        
        const deleteStmt = db.prepare('DELETE FROM trips WHERE id = ?');
        deleteStmt.run(id);
        
        res.json({
            success: true,
            message: 'Trip deleted successfully'
        });
    } catch (error) {
        console.error('[Trips] Error deleting trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete trip',
            message: error.message
        });
    }
}

module.exports = {
    initDatabase,
    getAllTrips,
    getTripById,
    createTrip,
    updateTripStatus,
    deleteTrip
};
