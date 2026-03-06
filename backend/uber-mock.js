/**
 * Uber API Mock - Modo Demo
 * Simula respuestas realistas de Uber API sin necesidad de API key real
 * 
 * Usar en producción: Reemplazar con uber.js real
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Datos mock realistas de Uber
 */
const UBER_PRODUCTS = [
    {
        product_id: 'uberx',
        display_name: 'UberX',
        capacity: 4,
        description: 'Affordable, everyday rides',
        image: 'https://d1a3f4spazzrp4.cloudfront.net/uber-products/uberx.png'
    },
    {
        product_id: 'uberxl',
        display_name: 'UberXL',
        capacity: 6,
        description: 'Affordable rides for groups up to 6',
        image: 'https://d1a3f4spazzrp4.cloudfront.net/uber-products/uberxl.png'
    },
    {
        product_id: 'uberblack',
        display_name: 'UberBLACK',
        capacity: 4,
        description: 'Luxury rides with professional drivers',
        image: 'https://d1a3f4spazzrp4.cloudfront.net/uber-products/uberblack.png'
    },
    {
        product_id: 'ubervan',
        display_name: 'UberVAN',
        capacity: 8,
        description: 'Premium vans for large groups',
        image: 'https://d1a3f4spazzrp4.cloudfront.net/uber-products/ubervan.png'
    }
];

/**
 * GET /api/uber/products - Mock
 * Retorna lista de productos Uber
 */
function getProducts(req, res) {
    console.log('[Uber Mock] GET /api/uber/products');
    
    // Simular delay de red (200-500ms)
    setTimeout(() => {
        res.json({
            success: true,
            data: UBER_PRODUCTS,
            mock: true,
            timestamp: new Date().toISOString()
        });
    }, Math.random() * 300 + 200);
}

/**
 * GET /api/uber/estimate - Mock
 * Retorna estimación de precio entre dos puntos
 */
function getEstimate(req, res) {
    const { start_latitude, start_longitude, end_latitude, end_longitude } = req.query;
    
    console.log('[Uber Mock] GET /api/uber/estimate', { start_latitude, start_longitude });
    
    // Calcular distancia aproximada (fórmula Haversine simplificada)
    const distance = calculateDistance(
        parseFloat(start_latitude),
        parseFloat(start_longitude),
        parseFloat(end_latitude),
        parseFloat(end_longitude)
    );
    
    // Calcular duración estimada (minutos)
    const duration = Math.round(distance * 3.5); // ~3.5 min por km en ciudad
    
    // Calcular precios por producto
    const estimates = UBER_PRODUCTS.map(product => {
        const baseFare = product.product_id === 'uberblack' ? 5.0 : 
                        product.product_id === 'ubervan' ? 6.0 : 2.5;
        const perKm = product.product_id === 'uberblack' ? 2.5 : 
                     product.product_id === 'ubervan' ? 2.8 : 1.2;
        const perMinute = 0.25;
        
        const estimatedPrice = baseFare + (distance * perKm) + (duration * perMinute);
        
        return {
            product_id: product.product_id,
            display_name: product.display_name,
            estimate: `${Math.round(estimatedPrice)}€`,
            low_estimate: Math.round(estimatedPrice * 0.9),
            high_estimate: Math.round(estimatedPrice * 1.1),
            currency: 'EUR',
            duration: duration,
            distance: distance.toFixed(2) + ' km'
        };
    });
    
    setTimeout(() => {
        res.json({
            success: true,
            data: estimates,
            mock: true,
            timestamp: new Date().toISOString()
        });
    }, Math.random() * 300 + 200);
}

/**
 * POST /api/uber/request - Mock
 * Crea un viaje simulado
 */
function createRequest(req, res) {
    const { product_id, start_latitude, start_longitude, end_latitude, end_longitude, passenger_name } = req.body;
    
    console.log('[Uber Mock] POST /api/uber/request', { product_id, passenger_name });
    
    // Generar IDs únicos
    const requestId = `mock-${uuidv4().substring(0, 8)}`;
    const tripId = `trip-${uuidv4().substring(0, 8)}`;
    
    // Calcular precio
    const distance = calculateDistance(
        parseFloat(start_latitude),
        parseFloat(start_longitude),
        parseFloat(end_latitude),
        parseFloat(end_longitude)
    );
    const duration = Math.round(distance * 3.5);
    const estimatedPrice = 2.5 + (distance * 1.2) + (duration * 0.25);
    
    // Simular asignación de conductor
    const driverEta = Math.floor(Math.random() * 8) + 2; // 2-10 minutos
    
    setTimeout(() => {
        res.json({
            success: true,
            data: {
                request_id: requestId,
                trip_id: tripId,
                status: 'accepted',
                product: {
                    product_id: product_id || 'uberx',
                    display_name: 'UberX'
                },
                driver: {
                    name: 'Carlos M.',
                    rating: 4.8,
                    vehicle: 'Toyota Prius Blanco',
                    license_plate: '1234-ABC',
                    phone: '+34 600 XXX XXX',
                    location: {
                        latitude: start_latitude + (Math.random() - 0.5) * 0.02,
                        longitude: start_longitude + (Math.random() - 0.5) * 0.02
                    }
                },
                pickup: {
                    latitude: start_latitude,
                    longitude: start_longitude,
                    eta: driverEta
                },
                dropoff: {
                    latitude: end_latitude,
                    longitude: end_longitude
                },
                price: {
                    estimated: Math.round(estimatedPrice * 100) / 100,
                    currency: 'EUR'
                },
                passenger: passenger_name || 'Anónimo'
            },
            mock: true,
            timestamp: new Date().toISOString()
        });
    }, Math.random() * 500 + 300);
}

/**
 * GET /api/uber/status - Mock
 * Retorna estado del viaje
 */
function getStatus(req, res) {
    const { trip_id } = req.query;
    
    console.log('[Uber Mock] GET /api/uber/status', { trip_id });
    
    // Estados posibles del viaje
    const statuses = ['accepted', 'driver_assigned', 'driver_arrived', 'in_progress', 'completed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    setTimeout(() => {
        res.json({
            success: true,
            data: {
                trip_id: trip_id || 'trip-mock-123',
                status: randomStatus,
                driver: {
                    name: 'Carlos M.',
                    rating: 4.8,
                    vehicle: 'Toyota Prius Blanco',
                    license_plate: '1234-ABC',
                    location: {
                        latitude: 40.4168 + (Math.random() - 0.5) * 0.02,
                        longitude: -3.7038 + (Math.random() - 0.5) * 0.02,
                        heading: Math.floor(Math.random() * 360)
                    }
                },
                eta: randomStatus === 'completed' ? 0 : Math.floor(Math.random() * 15) + 1,
                mock: true
            },
            timestamp: new Date().toISOString()
        });
    }, Math.random() * 200 + 100);
}

/**
 * Helper: Calcular distancia entre dos puntos (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100; // Distancia en km con 2 decimales
}

/**
 * Exportar router Express
 */
module.exports = function(router) {
    console.log('[Uber Mock] Routes initialized - MODO DEMO ACTIVO');
    
    router.get('/uber/products', getProducts);
    router.get('/uber/estimate', getEstimate);
    router.post('/uber/request', createRequest);
    router.get('/uber/status', getStatus);
    
    return router;
};
