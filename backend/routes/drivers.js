/**
 * Drivers Route Handler
 * GET /api/drivers - Lista todos los conductores con su estado y GPS
 * GET /api/drivers/:id - Obtiene un conductor específico
 * PUT /api/drivers/:id/location - Actualiza ubicación GPS
 */

const { getDatabase } = require('../database');
const { v4: uuidv4 } = require('uuid');

let dbInstance = null;

/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase(dbPath) {
    dbInstance = await getDatabase(dbPath);
    console.log('[Drivers] Database initialized:', dbPath);
}

/**
 * GET /api/drivers
 * Returns: Array de conductores con estado en tiempo real
 */
async function getAllDrivers(req, res) {
    try {
        const db = await getDatabase();
        const statusFilter = req.query.status; // optional: ?status=available
        
        let query = 'SELECT * FROM drivers';
        let params = [];
        
        if (statusFilter) {
            query += ' WHERE status = ?';
            params = [statusFilter];
        }
        
        query += ' ORDER BY rating DESC, total_trips DESC';
        
        const stmt = db.prepare(query);
        const drivers = stmt.all(...params);
        
        res.json({
            success: true,
            count: drivers.length,
            data: drivers.map(driver => ({
                id: driver.id,
                name: driver.name,
                vehicle: `${driver.vehicle_color} ${driver.vehicle_model}`,
                licensePlate: driver.license_plate,
                status: driver.status,
                location: {
                    lat: driver.latitude,
                    lng: driver.longitude,
                    heading: driver.heading
                },
                rating: driver.rating,
                totalTrips: driver.total_trips,
                lastUpdate: driver.updated_at
            }))
        });
    } catch (error) {
        console.error('[Drivers] Error getting all drivers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve drivers',
            message: error.message
        });
    }
}

/**
 * GET /api/drivers/:id
 * Returns: Un conductor específico
 */
async function getDriverById(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        
        const stmt = db.prepare('SELECT * FROM drivers WHERE id = ?');
        const driver = stmt.get(id);
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicle: {
                    model: driver.vehicle_model,
                    color: driver.vehicle_color,
                    licensePlate: driver.license_plate
                },
                status: driver.status,
                location: {
                    lat: driver.latitude,
                    lng: driver.longitude,
                    heading: driver.heading
                },
                rating: driver.rating,
                totalTrips: driver.total_trips,
                createdAt: driver.created_at,
                lastUpdate: driver.updated_at
            }
        });
    } catch (error) {
        console.error('[Drivers] Error getting driver by ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve driver',
            message: error.message
        });
    }
}

/**
 * PUT /api/drivers/:id/location
 * Updates: Ubicación GPS del conductor (simula movimiento en tiempo real)
 */
async function updateDriverLocation(req, res) {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        const { latitude, longitude, heading, status } = req.body;
        
        // Validaciones básicas
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }
        
        // Verificar que el conductor existe
        const checkStmt = db.prepare('SELECT id FROM drivers WHERE id = ?');
        const driver = checkStmt.get(id);
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found'
            });
        }
        
        // Actualizar ubicación
        const updateFields = [];
        const updateValues = [];
        
        updateFields.push('latitude = ?');
        updateValues.push(latitude);
        
        updateFields.push('longitude = ?');
        updateValues.push(longitude);
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        if (heading !== undefined) {
            updateFields.push('heading = ?');
            updateValues.push(heading);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        updateValues.push(id);
        
        const updateStmt = db.prepare(`
            UPDATE drivers 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `);
        
        updateStmt.run(...updateValues);
        
        // Obtener datos actualizados
        const stmt = db.prepare('SELECT * FROM drivers WHERE id = ?');
        const updatedDriver = stmt.get(id);
        
        res.json({
            success: true,
            message: 'Location updated successfully',
            data: {
                id: updatedDriver.id,
                location: {
                    lat: updatedDriver.latitude,
                    lng: updatedDriver.longitude,
                    heading: updatedDriver.heading
                },
                status: updatedDriver.status,
                lastUpdate: updatedDriver.updated_at
            }
        });
    } catch (error) {
        console.error('[Drivers] Error updating location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
            message: error.message
        });
    }
}

/**
 * POST /api/drivers
 * Creates: Nuevo conductor (para testing o registro real)
 */
async function createDriver(req, res) {
    try {
        const db = await getDatabase();
        const { 
            name, 
            email, 
            phone, 
            vehicle_model, 
            vehicle_color, 
            license_plate,
            latitude,
            longitude 
        } = req.body;
        
        // Validaciones
        if (!name || !vehicle_model || !license_plate) {
            return res.status(400).json({
                success: false,
                error: 'Name, vehicle_model, and license_plate are required'
            });
        }
        
        const id = uuidv4();
        const lat = latitude || 40.4168; // Madrid por defecto
        const lng = longitude || -3.7038;
        
        const stmt = db.prepare(`
            INSERT INTO drivers (
                id, name, email, phone, vehicle_model, vehicle_color, 
                license_plate, latitude, longitude, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
        `);
        
        stmt.run(
            id, name, email || null, phone || null,
            vehicle_model, vehicle_color || 'Unknown',
            license_plate, lat, lng
        );
        
        res.status(201).json({
            success: true,
            message: 'Driver created successfully',
            data: { id, name, status: 'available' }
        });
    } catch (error) {
        console.error('[Drivers] Error creating driver:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create driver',
            message: error.message
        });
    }
}

module.exports = {
    initDatabase,
    getAllDrivers,
    getDriverById,
    updateDriverLocation,
    createDriver
};
