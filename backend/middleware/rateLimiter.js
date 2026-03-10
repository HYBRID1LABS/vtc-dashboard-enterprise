/**
 * Rate Limiting Middleware Configuration
 * 
 * Provides rate limiting for:
 * - General API endpoints: 100 req/15min
 * - Auth endpoints: 5 req/15min (brute force protection)
 * - WebSocket: 50 msg/min
 */

const rateLimit = require('express-rate-limit');

// ===========================================
// GENERAL API RATE LIMITER
// 100 requests per 15 minutes
// ===========================================

const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((15 * 60) / 60) // minutes
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    // Custom key generator (use IP by default)
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    // Skip rate limiting for health checks
    skip: (req) => {
        return req.path === '/health';
    },
    
    // Handler when limit is exceeded
    handler: (req, res) => {
        console.warn(`[Rate Limit] Exceeded limit for ${req.ip} on ${req.path}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil((15 * 60) / 60) + ' minutes'
        });
    }
});

// ===========================================
// AUTH RATE LIMITER
// 5 requests per 15 minutes (brute force protection)
// ===========================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
        retryAfter: Math.ceil((15 * 60) / 60) // minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    // Handler when limit is exceeded
    handler: (req, res) => {
        console.warn(`[Rate Limit] AUTH - Exceeded limit for ${req.ip} on ${req.path}`);
        res.status(429).json({
            success: false,
            error: 'Too many login attempts, please try again later.',
            retryAfter: Math.ceil((15 * 60) / 60) + ' minutes'
        });
    }
});

// ===========================================
// STRICT RATE LIMITER
// 30 requests per 15 minutes (for sensitive operations)
// ===========================================

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please slow down.',
        retryAfter: Math.ceil((15 * 60) / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    handler: (req, res) => {
        console.warn(`[Rate Limit] STRICT - Exceeded limit for ${req.ip} on ${req.path}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests, please slow down.',
            retryAfter: Math.ceil((15 * 60) / 60) + ' minutes'
        });
    }
});

// ===========================================
// WEB_SOCKET RATE LIMITER HELPER
// 50 messages per minute per connection
// ===========================================

function createWebSocketRateLimiter(ws, maxMessages = 50, windowMs = 60 * 1000) {
    const messageCount = new Map();
    const windowStart = Date.now();
    
    return function rateLimitCheck() {
        const now = Date.now();
        
        // Reset window if expired
        if (now - windowStart > windowMs) {
            messageCount.clear();
            windowStart = now;
        }
        
        const clientId = ws._socket.remoteAddress || 'unknown';
        const count = messageCount.get(clientId) || 0;
        
        if (count >= maxMessages) {
            console.warn(`[WebSocket Rate Limit] Client ${clientId} exceeded ${maxMessages} msg/min`);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Too many messages, please slow down.',
                retryAfter: Math.ceil((windowMs - (now - windowStart)) / 1000) + ' seconds'
            }));
            return false; // Rate limit exceeded
        }
        
        messageCount.set(clientId, count + 1);
        return true; // OK to send
    };
}

module.exports = {
    generalApiLimiter,
    authLimiter,
    strictLimiter,
    createWebSocketRateLimiter
};
