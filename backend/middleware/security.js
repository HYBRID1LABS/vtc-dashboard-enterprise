/**
 * Security Headers Middleware Configuration
 * 
 * Implements comprehensive security headers using Helmet:
 * - Content-Security-Policy
 * - X-Frame-Options (DENY)
 * - X-Content-Type-Options (nosniff)
 * - Strict-Transport-Security (HSTS)
 * - X-XSS-Protection
 * - Referrer-Policy
 */

const helmet = require('helmet');

// ===========================================
// SECURITY HEADERS CONFIGURATION
// ===========================================

const securityMiddleware = helmet({
    // Content-Security-Policy
    // Controls which resources can be loaded
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some CSS
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket connections
            fontSrc: ["'self'"],
            objectSrc: ["'none'"], // Prevent Flash/plugins
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"], // No iframes allowed
            upgradeInsecureRequests: [], // Force HTTPS
        },
    },
    
    // X-Frame-Options: DENY
    // Prevents clickjacking attacks by disallowing iframe embedding
    frameguard: {
        action: 'deny'
    },
    
    // X-Content-Type-Options: nosniff
    // Prevents MIME type sniffing
    noSniff: true,
    
    // Strict-Transport-Security (HSTS)
    // Forces HTTPS connections
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    
    // X-XSS-Protection
    // Legacy XSS filter (modern browsers use CSP instead)
    xssFilter: true,
    
    // Referrer-Policy
    // Controls referrer information sent with requests
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    
    // Additional security headers
    
    // Prevent DNS prefetching to protect user privacy
    dnsPrefetchControl: {
        allow: false
    },
    
    // Disable IE's download feature that can be exploited
    ieNoOpen: true,
    
    // Set Content-Type header explicitly
    contentTypeOptions: {
        action: 'nosniff'
    }
});

// ===========================================
// CUSTOM SECURITY HEADERS
// Additional headers not covered by Helmet
// ===========================================

const customSecurityHeaders = (req, res, next) => {
    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Remove server header (information disclosure)
    res.removeHeader('X-Powered-By');
    
    // Additional security header
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
};

// ===========================================
// COMBINED SECURITY MIDDLEWARE
// Export as a single middleware stack
// ===========================================

const securityHeaders = [securityMiddleware, customSecurityHeaders];

module.exports = {
    securityHeaders,
    securityMiddleware,
    customSecurityHeaders
};
