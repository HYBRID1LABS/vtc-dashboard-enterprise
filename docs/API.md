# VTC Dashboard Backend - API Documentation

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Uber API Integration](#uber-api-integration)
4. [WebSocket Real-time](#websocket-real-time)
5. [Deploy a Producción](#deploy-a-producción)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
cd /Users/ft/.openclaw/workspace/vtc/backend
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar template
cp .env.example .env

# Editar .env con tus credentials
nano .env
```

### 3. Inicializar database

La database se crea automáticamente al primer start. Si necesitas resetear:

```bash
rm ../database/vtc.db
npm start
```

---

## 🌐 Endpoints Disponibles

### **Drivers (Conductores)**

#### `GET /api/drivers`
Lista todos los conductores con estado GPS en tiempo real.

**Query params opcionales:**
- `?status=available` - Filtrar por estado (available, busy, offline)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "driver-001",
      "name": "Carlos Mendoza",
      "vehicle": "Blanco Toyota Prius",
      "licensePlate": "1234-ABC",
      "status": "available",
      "location": {
        "lat": 40.4168,
        "lng": -3.7038,
        "heading": 45
      },
      "rating": 4.8,
      "totalTrips": 156,
      "lastUpdate": "2026-03-05T08:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/drivers/:id`
Obtiene detalles completos de un conductor.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "driver-001",
    "name": "Carlos Mendoza",
    "email": "carlos@vtc.com",
    "phone": "+34 600 000 001",
    "vehicle": {
      "model": "Toyota Prius",
      "color": "Blanco",
      "licensePlate": "1234-ABC"
    },
    "status": "available",
    "location": { ... },
    "rating": 4.8,
    "totalTrips": 156
  }
}
```

---

#### `PUT /api/drivers/:id/location`
Actualiza ubicación GPS del conductor (para simular movimiento).

**Body:**
```json
{
  "latitude": 40.4200,
  "longitude": -3.6950,
  "heading": 120,
  "status": "busy"
}
```

---

### **Trips (Viajes)**

#### `GET /api/trips`
Lista viajes activos con filtros opcionales.

**Query params:**
- `?status=in_progress` - Filtrar por estado
- `?driver_id=driver-001` - Filtrar por conductor

**Estados válidos:** `requested`, `accepted`, `in_progress`, `completed`, `cancelled`

---

#### `POST /api/trips`
Crea un nuevo viaje.

**Body:**
```json
{
  "passenger_name": "Juan Pérez",
  "pickup_address": "Puerta del Sol, Madrid",
  "dropoff_address": "Aeropuerto T4",
  "pickup_latitude": 40.4168,
  "pickup_longitude": -3.7038,
  "dropoff_latitude": 40.4936,
  "dropoff_longitude": -3.5668,
  "estimated_price": 35.50,
  "distance_km": 15.2,
  "duration_minutes": 25
}
```

---

#### `PUT /api/trips/:id/status`
Actualiza estado del viaje.

**Body:**
```json
{
  "status": "accepted",
  "driver_id": "driver-001"
}
```

---

### **Uber API**

#### `POST /api/uber/request`
Crea petición de viaje vía Uber API.

**Body:**
```json
{
  "product_id": "uberx",
  "start_latitude": 40.4168,
  "start_longitude": -3.7038,
  "end_latitude": 40.4936,
  "end_longitude": -3.5668,
  "passenger_name": "Juan Pérez"
}
```

**Response (DEMO mode):**
```json
{
  "success": true,
  "message": "Uber request created (DEMO MODE)",
  "data": {
    "request_id": "uuid-generado",
    "status": "processing",
    "product_id": "uberx",
    "pickup": {
      "latitude": 40.4168,
      "longitude": -3.7038,
      "eta": 5
    },
    "price": {
      "currency": "EUR",
      "amount": 25.50
    }
  },
  "demo": true,
  "note": "Configure UBER_SERVER_TOKEN to use real API"
}
```

---

#### `GET /api/uber/estimate`
Obtiene estimación de precio.

**Query params:**
```
?start_lat=40.4168&start_lng=-3.7038&end_lat=40.4936&end_lng=-3.5668
```

---

#### `GET /api/uber/products`
Lista productos Uber disponibles en una zona.

**Query params:**
```
?latitude=40.4168&longitude=-3.7038
```

---

## 🚗 Uber API Integration

### Cómo obtener credentials

1. **Crear cuenta desarrollador:**
   - Ve a https://developer.uber.com/
   - Click en "Get Started" → "Sign Up"
   - Completa registro

2. **Crear aplicación:**
   - Dashboard → "Create Application"
   - Nombre: "VTC Dashboard"
   - Tipo: "Business"

3. **Obtener credentials:**
   - Ve a "Settings" de tu app
   - Copia:
     - **Server Token** (para server-to-server)
     - **Client ID** (para OAuth)
     - **Client Secret** (para OAuth)

4. **Configurar permisos:**
   - Solicita acceso a:
     - `request` - Crear viajes
     - `estimate` - Obtener estimaciones
     - `products` - Listar productos

   ⚠️ **Nota:** Uber requiere aprobación manual para producción. En desarrollo usa modo DEMO.

### OAuth 2.0 Flow (para producción)

```javascript
// 1. Redirect usuario a Uber para autorización
const authUrl = `https://login.uber.com/oauth/v2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=request+estimate`;

// 2. Uber redirige con code
// 3. Exchange code por token
const tokenResponse = await axios.post('https://login.uber.com/oauth/v2/token', {
  code,
  grant_type: 'authorization_code',
  redirect_uri: REDIRECT_URI,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET
});

// 4. Usar access_token para requests
```

---

## 🔌 WebSocket Real-time

### Conexión

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to real-time updates');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'update') {
    console.log('Drivers updated:', message.data.drivers);
    console.log('Active trips:', message.data.activeTrips);
    
    // Actualizar UI del dashboard
    updateDashboard(message.data);
  }
});
```

### Payload structure

```json
{
  "type": "update",
  "timestamp": "2026-03-05T08:15:00.000Z",
  "data": {
    "drivers": [
      {
        "id": "driver-001",
        "name": "Carlos Mendoza",
        "status": "available",
        "location": { "lat": 40.4168, "lng": -3.7038, "heading": 45 }
      }
    ],
    "activeTrips": [
      {
        "id": "trip-001",
        "status": "in_progress",
        "driverId": "driver-002",
        "driverName": "María García"
      }
    ]
  }
}
```

**Update interval:** 5 segundos (configurable via `WS_UPDATE_INTERVAL`)

---

## 🚀 Deploy a Producción

### Opción A: Railway (Recomendado)

1. **Preparar repo:**
   ```bash
   cd /Users/ft/.openclaw/workspace/vtc
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Deploy en Railway:**
   - Ve a https://railway.app/
   - "New Project" → "Deploy from GitHub repo"
   - Selecciona tu repo
   - Configura env vars en Railway Dashboard

3. **Configurar env vars en Railway:**
   ```
   NODE_ENV=production
   UBER_SERVER_TOKEN=tu-token
   DATABASE_URL=postgresql://... (Railway auto-provee PostgreSQL)
   PORT=3000
   CORS_ORIGINS=https://tu-dominio.com
   ```

4. **Deploy:**
   - Railway detecta `package.json` y deploya automáticamente
   - URL: `https://vtc-dashboard-production.up.railway.app`

---

### Opción B: Vercel

1. **Adaptar para serverless:**
   ```bash
   npm install -g vercel
   ```

2. **Crear `vercel.json`:**
   ```json
   {
     "version": 2,
     "builds": [{ "src": "backend/server.js", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "backend/server.js" }]
   }
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

---

### Opción C: Heroku

1. **Crear `Procfile`:**
   ```
   web: node backend/server.js
   ```

2. **Deploy:**
   ```bash
   heroku create vtc-dashboard
   heroku config:set UBER_SERVER_TOKEN=tu-token
   git push heroku main
   ```

---

### Base de Datos en Producción

**Recomendado: Supabase (PostgreSQL gratuito)**

1. Crear proyecto en https://supabase.com
2. Obtener connection string
3. Setear `DATABASE_URL` en env vars
4. Ejecutar `schema.sql` en SQL Editor

**Schema compatible:** El `schema.sql` incluido funciona en SQLite y PostgreSQL sin cambios.

---

## 🔗 Conectar el Mock al Backend

### En `dashboard-pro-final.html`:

Buscar la línea:
```javascript
const API_BASE_URL = 'http://localhost:3000'; // ← Cambiar esto
```

Reemplazar con:
```javascript
// Local development
const API_BASE_URL = 'http://localhost:3000';

// Production (descomentar cuando deployes)
// const API_BASE_URL = 'https://vtc-dashboard-production.up.railway.app';
```

### Enable WebSocket:

```javascript
// Al inicio del script
const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws`);

ws.on('message', (data) => {
  const update = JSON.parse(data);
  if (update.type === 'update') {
    // Actualizar mapa y lista de conductores
    updateDriversOnMap(update.data.drivers);
    updateActiveTripsList(update.data.activeTrips);
  }
});
```

---

## 🐛 Troubleshooting

### Error: "UBER_SERVER_TOKEN not configured"

**Solución:** El backend está en modo DEMO. Para usar Uber real:
1. Obtén token en https://developer.uber.com/
2. Añade a `.env`: `UBER_SERVER_TOKEN=tu-token`
3. Restart server

---

### Error: "Database locked"

**Causa:** Múltiples procesos accediendo a SQLite.

**Solución:**
```bash
# Matar procesos node
killall node

# Borrar WAL files
rm ../database/vtc.db-wal ../database/vtc.db-shm

# Restart
npm start
```

---

### Error: "CORS blocked"

**Solución:** Añadir tu dominio a `CORS_ORIGINS` en `.env`:
```
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com
```

---

### WebSocket no conecta

**Verificar:**
1. Server está running
2. Firewall permite puerto 3000
3. URL es `ws://` no `http://`
4. Browser console para errores

---

## 📊 Testing Endpoints

### cURL examples:

```bash
# Get drivers
curl http://localhost:3000/api/drivers

# Get trips
curl http://localhost:3000/api/trips

# Create trip
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_name": "Test User",
    "pickup_address": "Gran Vía 1",
    "dropoff_address": "Sol"
  }'

# Uber estimate
curl "http://localhost:3000/api/uber/estimate?start_lat=40.4168&start_lng=-3.7038&end_lat=40.4936&end_lng=-3.5668"
```

---

## 📞 Soporte

Para issues o preguntas:
- GitHub Issues: (tu repo)
- Email: hybrid.1labs@gmail.com

---

*Documentación generada: 2026-03-05*  
*Versión: 1.0.0*
