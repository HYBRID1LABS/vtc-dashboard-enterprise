/**
 * Security Implementation Tests
 * Basic load testing for rate limiting and security headers
 * 
 * Usage:
 *   node tests/security.test.js
 * 
 * Prerequisites:
 *   - Server running on http://localhost:3000
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testSecurityHeaders() {
    console.log('\n📋 TEST 1: Security Headers');
    console.log('=' .repeat(50));
    
    const response = await makeRequest('/health');
    
    const requiredHeaders = [
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'content-security-policy',
        'x-xss-protection',
        'referrer-policy',
        'cache-control'
    ];
    
    let passed = 0;
    let failed = 0;
    
    requiredHeaders.forEach(header => {
        if (response.headers[header]) {
            console.log(`✅ ${header}: ${response.headers[header]}`);
            passed++;
        } else {
            console.log(`❌ ${header}: MISSING`);
            failed++;
        }
    });
    
    console.log(`\nResult: ${passed}/${requiredHeaders.length} headers present`);
    return failed === 0;
}

async function testRateLimiting() {
    console.log('\n📋 TEST 2: Rate Limiting (100 req/15min)');
    console.log('=' .repeat(50));
    
    let rateLimited = false;
    let totalRequests = 0;
    
    // Make 110 requests (should trigger rate limit at 101)
    for (let i = 1; i <= 110; i++) {
        const response = await makeRequest('/api/drivers');
        totalRequests++;
        
        if (response.statusCode === 429) {
            console.log(`✅ Rate limit triggered at request #${i}`);
            console.log(`   Response: ${response.body}`);
            rateLimited = true;
            break;
        }
        
        if (i % 20 === 0) {
            console.log(`   Made ${i} requests...`);
        }
    }
    
    if (!rateLimited) {
        console.log(`❌ Rate limit NOT triggered after ${totalRequests} requests`);
        return false;
    }
    
    console.log(`✅ Rate limiting working correctly`);
    return true;
}

async function testWebSocketConnection() {
    console.log('\n📋 TEST 3: WebSocket Connection');
    console.log('=' .repeat(50));
    
    return new Promise((resolve) => {
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:3000/ws');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            console.log(`❌ WebSocket error: ${error.message}`);
            resolve(false);
        });
        
        ws.on('close', () => {
            console.log('✅ WebSocket connection closed');
            resolve(true);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            console.log('❌ WebSocket connection timeout');
            resolve(false);
        }, 5000);
    });
}

async function runAllTests() {
    console.log('🚀 Security Implementation Tests');
    console.log('Base URL:', BASE_URL);
    console.log('=' .repeat(50));
    
    const results = {
        securityHeaders: false,
        rateLimiting: false,
        webSocket: false
    };
    
    try {
        results.securityHeaders = await testSecurityHeaders();
        results.rateLimiting = await testRateLimiting();
        results.webSocket = await testWebSocketConnection();
        
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(50));
        console.log(`Security Headers: ${results.securityHeaders ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Rate Limiting:    ${results.rateLimiting ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`WebSocket:        ${results.webSocket ? '✅ PASS' : '❌ FAIL'}`);
        console.log('=' .repeat(50));
        
        const allPassed = Object.values(results).every(r => r === true);
        
        if (allPassed) {
            console.log('\n✅ All tests passed! Security implementation complete.');
        } else {
            console.log('\n❌ Some tests failed. Review implementation.');
        }
        
        return allPassed;
        
    } catch (error) {
        console.error('\n❌ Test execution error:', error.message);
        console.error('Make sure the server is running on http://localhost:3000');
        return false;
    }
}

// ===========================================
// RUN TESTS
// ===========================================

runAllTests();
