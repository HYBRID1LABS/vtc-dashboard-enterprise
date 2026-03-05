/**
 * Uber API Integration Route Handler
 * POST /api/uber/request - Crea petición de viaje vía Uber API
 * GET /api/uber/estimate - Obtiene estimación de precio
 * GET /api/uber/products - Lista productos disponibles
 * 
 * DOCUMENTACIÓN OFICIAL UBER API:
 * https://developer.uber.com/docs/riders/guides/authentication/introduction
 */

const axios = require('axios');
const { getDatabase } = require('../database');
const { v4: uuidv4 } = require('uuid');

let dbInstance = null;
let uberConfig = {};

/**
 * Inicializa configuración de Uber API
 */
function initUber(config) {
    uberConfig = {
        serverToken: config.UBER_SERVER_TOKEN,
        clientId: config.UBER_CLIENT_ID,
        clientSecret: config.UBER_CLIENT_SECRET,
        baseUrl: 'https://api.uber.com/v1'
    };
    console.log('[Uber] API configuration loaded');
}

/**
 * Inicializa database para logging
 */
async function initDatabase(dbPath) {
    dbInstance = await getDatabase(dbPath);
    console.log('[Uber] Database initialized for logging:', dbPath);
}

/**
 * Helper: Log de requests a Uber API
 */
async function logUberRequest(endpoint, method, requestData, responseData, statusCode, errorMessage = null) {
    try {
        const db = await getDatabase();
        const id = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO uber_requests (
                id, endpoint, method, request_data, response_data, 
                status_code, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            id,
            endpoint,
            method,
            JSON.stringify(requestData),
            JSON.stringify(responseData),
            statusCode,
            errorMessage
        );
    } catch (error) {
        console.error('[Uber] Failed to log request:', error.message);
    }
}

/**
 * Helper: Headers de autenticación
 */
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${uberConfig.serverToken}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'es-ES'
    };
}

/**
 * POST /api/uber/request
 * Crea una petición de viaje real vía Uber API
 * 
 * Body:
 * {
 *   product_id: "uberx",
 *   start_latitude: 40.4168,
 *   start_longitude: -3.7038,
 *   end_latitude: 40.4936,
 *   end_longitude: -3.5668,
 *   passenger_name: "Juan Pérez"
 * }
 */
async function createUberRequest(req, res) {
    try {
        const {
            product_id,
            start_latitude,
            start_longitude,
            end_latitude,
            end_longitude,
            passenger_name
        } = req.body;
        
        // Validaciones
        if (!product_id || !start_latitude || !start_longitude || !end_latitude || !end_longitude) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: product_id, start_latitude, start_longitude, end_latitude, end_longitude'
            });
        }
        
        // Verificar configuración
        if (!uberConfig.serverToken) {
            return res.status(503).json({
                success: false,
                error: 'Uber API not configured. Please set UBER_SERVER_TOKEN in environment variables.',
                docs: 'See docs/API.md for setup instructions'
            });
        }
        
        // Preparar request a Uber API
        const uberEndpoint = '/v1/requests';
        const requestData = {
            product_id,
            start_latitude,
            start_longitude,
            end_latitude,
            end_longitude,
            passenger_name: passenger_name || 'VTC Dashboard User'
        };
        
        console.log('[Uber] Creating request:', requestData);
        
        // SIMULACIÓN (si no hay token real)
        if (uberConfig.serverToken === 'demo' || uberConfig.serverToken === '') {
            console.log('[Uber] DEMO MODE - Simulating request');
            
            const mockResponse = {
                request_id: uuidv4(),
                status: 'processing',
                product_id,
                pickup: {
                    latitude: start_latitude,
                    longitude: start_longitude,
                    eta: 5
                },
                dropoff: {
                    latitude: end_latitude,
                    longitude: end_longitude
                },
                price: {
                    currency: 'EUR',
                    amount: 25.50
                },
                created_at: new Date().toISOString()
            };
            
            await logUberRequest(uberEndpoint, 'POST', requestData, mockResponse, 200);
            
            return res.status(201).json({
                success: true,
                message: 'Uber request created (DEMO MODE)',
                data: mockResponse,
                demo: true,
                note: 'Configure UBER_SERVER_TOKEN to use real API'
            });
        }
        
        // REQUEST REAL a Uber API
        const response = await axios.post(
            `${uberConfig.baseUrl}${uberEndpoint}`,
            requestData,
            { headers: getAuthHeaders() }
        );
        
        await logUberRequest(uberEndpoint, 'POST', requestData, response.data, response.status);
        
        res.status(201).json({
            success: true,
            message: 'Uber request created successfully',
            data: response.data
        });
        
    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.message;
        
        console.error('[Uber] Error creating request:', errorMessage);
        
        await logUberRequest(
            '/v1/requests',
            'POST',
            req.body,
            error.response?.data || {},
            statusCode,
            errorMessage
        );
        
        res.status(statusCode).json({
            success: false,
            error: 'Failed to create Uber request',
            message: errorMessage,
            uber_status: statusCode
        });
    }
}

/**
 * GET /api/uber/estimate
 * Obtiene estimación de precio para una ruta
 * 
 * Query: ?start_lat=40.4168&start_lng=-3.7038&end_lat=40.4936&end_lng=-3.5668
 */
async function getUberEstimate(req, res) {
    try {
        const { start_lat, start_lng, end_lat, end_lng } = req.query;
        
        // Validaciones
        if (!start_lat || !start_lng || !end_lat || !end_lng) {
            return res.status(400).json({
                success: false,
                error: 'Missing query params: start_lat, start_lng, end_lat, end_lng'
            });
        }
        
        // Verificar configuración
        if (!uberConfig.serverToken) {
            return res.status(503).json({
                success: false,
                error: 'Uber API not configured',
                docs: 'See docs/API.md for setup instructions'
            });
        }
        
        const uberEndpoint = '/v1/estimates/price';
        const requestData = {
            start_latitude: start_lat,
            start_longitude: start_lng,
            end_latitude: end_lat,
            end_longitude: end_lng
        };
        
        // SIMULACIÓN (si no hay token real)
        if (uberConfig.serverToken === 'demo' || uberConfig.serverToken === '') {
            console.log('[Uber] DEMO MODE - Simulating estimate');
            
            const mockResponse = {
                prices: [
                    {
                        product_id: 'uberx',
                        currency_code: 'EUR',
                        display_name: 'UberX',
                        estimate: '15-20 EUR',
                        low_estimate: 15.00,
                        high_estimate: 20.00,
                        minimum: 5.00,
                        duration: 15
                    },
                    {
                        product_id: 'uberblack',
                        currency_code: 'EUR',
                        display_name: 'UberBLACK',
                        estimate: '30-40 EUR',
                        low_estimate: 30.00,
                        high_estimate: 40.00,
                        minimum: 15.00,
                        duration: 15
                    }
                ]
            };
            
            await logUberRequest(uberEndpoint, 'GET', requestData, mockResponse, 200);
            
            return res.json({
                success: true,
                data: mockResponse,
                demo: true,
                note: 'Configure UBER_SERVER_TOKEN to use real API'
            });
        }
        
        // REQUEST REAL a Uber API
        const response = await axios.get(
            `${uberConfig.baseUrl}${uberEndpoint}`,
            {
                headers: getAuthHeaders(),
                params: requestData
            }
        );
        
        await logUberRequest(uberEndpoint, 'GET', requestData, response.data, response.status);
        
        res.json({
            success: true,
            data: response.data
        });
        
    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.message;
        
        console.error('[Uber] Error getting estimate:', errorMessage);
        
        await logUberRequest(
            '/v1/estimates/price',
            'GET',
            req.query,
            error.response?.data || {},
            statusCode,
            errorMessage
        );
        
        res.status(statusCode).json({
            success: false,
            error: 'Failed to get Uber estimate',
            message: errorMessage
        });
    }
}

/**
 * GET /api/uber/products
 * Lista productos disponibles en una ubicación
 * 
 * Query: ?latitude=40.4168&longitude=-3.7038
 */
async function getUberProducts(req, res) {
    try {
        const { latitude, longitude } = req.query;
        
        // Validaciones
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Missing query params: latitude, longitude'
            });
        }
        
        // Verificar configuración
        if (!uberConfig.serverToken) {
            return res.status(503).json({
                success: false,
                error: 'Uber API not configured',
                docs: 'See docs/API.md for setup instructions'
            });
        }
        
        const uberEndpoint = '/v1/products';
        const requestData = {
            latitude,
            longitude
        };
        
        // SIMULACIÓN (si no hay token real)
        if (uberConfig.serverToken === 'demo' || uberConfig.serverToken === '') {
            console.log('[Uber] DEMO MODE - Simulating products');
            
            const mockResponse = {
                products: [
                    {
                        product_id: 'uberx',
                        display_name: 'UberX',
                        capacity: 4,
                        image: 'https://d1wke57f0s0n9i.cloudfront.net/images/uberx.png'
                    },
                    {
                        product_id: 'uberblack',
                        display_name: 'UberBLACK',
                        capacity: 4,
                        image: 'https://d1wke57f0s0n9i.cloudfront.net/images/uberblack.png'
                    },
                    {
                        product_id: 'ubervan',
                        display_name: 'UberVAN',
                        capacity: 6,
                        image: 'https://d1wke57f0s0n9i.cloudfront.net/images/ubervan.png'
                    }
                ]
            };
            
            await logUberRequest(uberEndpoint, 'GET', requestData, mockResponse, 200);
            
            return res.json({
                success: true,
                data: mockResponse,
                demo: true,
                note: 'Configure UBER_SERVER_TOKEN to use real API'
            });
        }
        
        // REQUEST REAL a Uber API
        const response = await axios.get(
            `${uberConfig.baseUrl}${uberEndpoint}`,
            {
                headers: getAuthHeaders(),
                params: requestData
            }
        );
        
        await logUberRequest(uberEndpoint, 'GET', requestData, response.data, response.status);
        
        res.json({
            success: true,
            data: response.data
        });
        
    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.message;
        
        console.error('[Uber] Error getting products:', errorMessage);
        
        await logUberRequest(
            '/v1/products',
            'GET',
            req.query,
            error.response?.data || {},
            statusCode,
            errorMessage
        );
        
        res.status(statusCode).json({
            success: false,
            error: 'Failed to get Uber products',
            message: errorMessage
        });
    }
}

/**
 * GET /api/uber/request/:id
 * Obtiene estado de una petición existente
 */
async function getUberRequestStatus(req, res) {
    try {
        const { id } = req.params;
        
        // Verificar configuración
        if (!uberConfig.serverToken) {
            return res.status(503).json({
                success: false,
                error: 'Uber API not configured'
            });
        }
        
        const uberEndpoint = `/v1/requests/${id}`;
        
        // SIMULACIÓN
        if (uberConfig.serverToken === 'demo' || uberConfig.serverToken === '') {
            const mockResponse = {
                request_id: id,
                status: 'accepted',
                driver: {
                    name: 'Carlos M.',
                    rating: 4.8,
                    vehicle: 'Toyota Prius - 1234 ABC',
                    location: {
                        latitude: 40.4180,
                        longitude: -3.7050
                    },
                    eta: 3
                }
            };
            
            return res.json({
                success: true,
                data: mockResponse,
                demo: true
            });
        }
        
        // REQUEST REAL
        const response = await axios.get(
            `${uberConfig.baseUrl}${uberEndpoint}`,
            { headers: getAuthHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data
        });
        
    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.message;
        
        res.status(statusCode).json({
            success: false,
            error: 'Failed to get request status',
            message: errorMessage
        });
    }
}

module.exports = {
    initUber,
    initDatabase,
    createUberRequest,
    getUberEstimate,
    getUberProducts,
    getUberRequestStatus
};
