/**
 * Analytics Route Handler
 * GET /api/analytics - Métricas y analíticas generales
 * GET /api/analytics/revenue - Ingresos por período
 * GET /api/analytics/heatmap - Datos para heatmaps
 * GET /api/analytics/drivers - Estadísticas por conductor
 * GET /api/analytics/vehicles - Estadísticas por vehículo
 */

const { getDatabase } = require('../database');

let dbInstance = null;

/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase(dbPath) {
    dbInstance = await getDatabase(dbPath);
    console.log('[Analytics] Database initialized:', dbPath);
}

/**
 * GET /api/analytics
 * Returns: Métricas generales del dashboard
 */
async function getAnalytics(req, res) {
    try {
        const db = await getDatabase();
        const { period = 'month' } = req.query;
        
        // Calcular fecha inicio según período
        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }
        
        const startDateStr = startDate.toISOString();
        
        // Ingresos totales
        const revenueQuery = `
            SELECT COALESCE(SUM(actual_price), 0) as total_revenue
            FROM trips
            WHERE status = 'completed'
            AND completed_at >= ?
        `;
        const revenueResult = db.prepare(revenueQuery).get(startDateStr);
        
        // Viajes totales
        const tripsQuery = `
            SELECT COUNT(*) as total_trips
            FROM trips
            WHERE created_at >= ?
        `;
        const tripsResult = db.prepare(tripsQuery).get(startDateStr);
        
        // Conductores activos
        const driversQuery = `
            SELECT COUNT(*) as active_drivers
            FROM drivers
            WHERE status = 'available' OR status = 'busy'
        `;
        const driversResult = db.prepare(driversQuery).get();
        
        // Ticket promedio
        const avgTicketQuery = `
            SELECT COALESCE(AVG(actual_price), 0) as avg_ticket
            FROM trips
            WHERE status = 'completed'
            AND completed_at >= ?
        `;
        const avgTicketResult = db.prepare(avgTicketQuery).get(startDateStr);
        
        // Horas productivas
        const hoursQuery = `
            SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
            FROM trips
            WHERE status = 'completed'
            AND completed_at >= ?
        `;
        const hoursResult = db.prepare(hoursQuery).get(startDateStr);
        
        const totalHours = hoursResult.total_minutes / 60;
        const productiveHours = totalHours;
        const totalAvailableHours = driversResult.active_drivers * 168; // horas por mes
        const occupancyRate = totalAvailableHours > 0 ? (productiveHours / totalAvailableHours) * 100 : 0;
        
        res.json({
            success: true,
            data: {
                revenue: parseFloat(revenueResult.total_revenue),
                trips: tripsResult.total_trips,
                activeDrivers: driversResult.active_drivers,
                avgTicket: parseFloat(avgTicketResult.avg_ticket),
                totalHours: Math.round(totalHours),
                occupancyRate: Math.round(occupancyRate * 10) / 10,
                period: period
            }
        });
    } catch (error) {
        console.error('[Analytics] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analytics',
            message: error.message
        });
    }
}

/**
 * GET /api/analytics/revenue
 * Returns: Ingresos desglosados por día/semana/mes
 */
async function getRevenue(req, res) {
    try {
        const db = await getDatabase();
        const { period = 'month', groupBy = 'day' } = req.query;
        
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = '%Y-%m-%d %H:00';
                break;
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                dateFormat = '%Y-%W';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }
        
        const query = `
            SELECT 
                strftime('${dateFormat}', completed_at) as period,
                COALESCE(SUM(actual_price), 0) as revenue,
                COUNT(*) as trips
            FROM trips
            WHERE status = 'completed'
            GROUP BY period
            ORDER BY period DESC
            LIMIT 100
        `;
        
        const stmt = db.prepare(query);
        const results = stmt.all();
        
        res.json({
            success: true,
            data: results.map(r => ({
                period: r.period,
                revenue: parseFloat(r.revenue),
                trips: r.trips
            }))
        });
    } catch (error) {
        console.error('[Analytics] Error getting revenue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve revenue data',
            message: error.message
        });
    }
}

/**
 * GET /api/analytics/heatmap
 * Returns: Datos para mapa de calor de demanda
 */
async function getHeatmapData(req, res) {
    try {
        const db = await getDatabase();
        const { days = 7 } = req.query;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const startDateStr = startDate.toISOString();
        
        // Obtener puntos de recogida agrupados por zona
        const query = `
            SELECT 
                pickup_latitude as lat,
                pickup_longitude as lng,
                COUNT(*) as intensity,
                AVG(actual_price) as avg_price
            FROM trips
            WHERE pickup_latitude IS NOT NULL
            AND pickup_longitude IS NOT NULL
            AND created_at >= ?
            GROUP BY 
                ROUND(pickup_latitude, 3),
                ROUND(pickup_longitude, 3)
            ORDER BY intensity DESC
            LIMIT 500
        `;
        
        const stmt = db.prepare(query);
        const results = stmt.all(startDateStr);
        
        // Formatear para heatmap [lat, lng, intensity]
        const heatmapData = results.map(r => [
            parseFloat(r.lat),
            parseFloat(r.lng),
            r.intensity / Math.max(...results.map(x => x.intensity)) // Normalizar 0-1
        ]);
        
        res.json({
            success: true,
            data: {
                heatmap: heatmapData,
                zones: results.map(r => ({
                    lat: parseFloat(r.lat),
                    lng: parseFloat(r.lng),
                    trips: r.intensity,
                    avgPrice: parseFloat(r.avg_price)
                })),
                period: `${days} days`
            }
        });
    } catch (error) {
        console.error('[Analytics] Error getting heatmap data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve heatmap data',
            message: error.message
        });
    }
}

/**
 * GET /api/analytics/drivers
 * Returns: Estadísticas por conductor
 */
async function getDriverAnalytics(req, res) {
    try {
        const db = await getDatabase();
        const { period = 'month' } = req.query;
        
        let startDate = new Date();
        if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'year') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }
        
        const startDateStr = startDate.toISOString();
        
        const query = `
            SELECT 
                d.id,
                d.name,
                d.vehicle_model,
                d.license_plate,
                COUNT(t.id) as total_trips,
                COALESCE(SUM(t.actual_price), 0) as total_revenue,
                COALESCE(AVG(t.actual_price), 0) as avg_ticket,
                d.rating,
                COALESCE(SUM(t.duration_minutes), 0) as total_minutes
            FROM drivers d
            LEFT JOIN trips t ON d.id = t.driver_id 
                AND t.status = 'completed'
                AND t.completed_at >= ?
            GROUP BY d.id
            ORDER BY total_revenue DESC
        `;
        
        const stmt = db.prepare(query);
        const results = stmt.all(startDateStr);
        
        res.json({
            success: true,
            data: results.map(r => ({
                id: r.id,
                name: r.name,
                vehicle: `${r.vehicle_model} (${r.license_plate})`,
                trips: r.total_trips,
                revenue: parseFloat(r.total_revenue),
                avgTicket: parseFloat(r.avg_ticket),
                rating: r.rating,
                hoursWorked: Math.round(r.total_minutes / 60)
            }))
        });
    } catch (error) {
        console.error('[Analytics] Error getting driver analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve driver analytics',
            message: error.message
        });
    }
}

/**
 * GET /api/analytics/vehicles
 * Returns: Estadísticas por vehículo
 */
async function getVehicleAnalytics(req, res) {
    try {
        const db = await getDatabase();
        const { period = 'month' } = req.query;
        
        let startDate = new Date();
        if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        }
        
        const startDateStr = startDate.toISOString();
        
        const query = `
            SELECT 
                d.vehicle_model,
                d.vehicle_color,
                d.vehicle_type,
                COUNT(t.id) as total_trips,
                COALESCE(SUM(t.actual_price), 0) as total_revenue,
                COALESCE(SUM(t.distance_km), 0) as total_distance,
                COALESCE(AVG(t.actual_price), 0) as avg_ticket
            FROM drivers d
            LEFT JOIN trips t ON d.id = t.driver_id
                AND t.status = 'completed'
                AND t.completed_at >= ?
            WHERE d.vehicle_type IS NOT NULL
            GROUP BY d.vehicle_type
            ORDER BY total_revenue DESC
        `;
        
        const stmt = db.prepare(query);
        const results = stmt.all(startDateStr);
        
        res.json({
            success: true,
            data: results.map(r => ({
                type: r.vehicle_type,
                model: r.vehicle_model,
                trips: r.total_trips,
                revenue: parseFloat(r.total_revenue),
                avgTicket: parseFloat(r.avg_ticket),
                distance: Math.round(r.total_distance)
            }))
        });
    } catch (error) {
        console.error('[Analytics] Error getting vehicle analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve vehicle analytics',
            message: error.message
        });
    }
}

module.exports = {
    initDatabase,
    getAnalytics,
    getRevenue,
    getHeatmapData,
    getDriverAnalytics,
    getVehicleAnalytics
};
