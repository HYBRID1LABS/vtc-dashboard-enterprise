# 🚖 VTC Dashboard - Production Backend

**Backend production-ready para dashboard VTC con integración Uber API**

---

## 🎯 Estado del Proyecto

✅ **Completado:**
- Backend Node.js + Express funcional
- Database SQLite con schema completo
- Endpoints REST para drivers, trips, Uber API
- WebSocket para updates en tiempo real (5 seg)
- Documentación completa de API
- Instrucciones de deploy

🔄 **Pendiente:**
- Configurar credentials de Uber API reales
- Deploy a producción (Railway/Vercel/Heroku)
- Conectar mock al backend real

---

## 📁 Estructura del Proyecto

```
vtc/
├── dashboard-pro-final.html      # Mock frontend (YA EXISTE)
├── backend/
│   ├── server.js                 # Servidor principal
│   ├── package.json              # Dependencias
│   ├── .env.example              # Template variables de entorno
│   └── routes/
│       ├── drivers.js            # Endpoints de conductores
│       ├── trips.js              # Endpoints de viajes
│       └── uber.js               # Integración Uber API
├── database/
│   └── schema.sql                # Database schema + seed data
└── docs/
    └── API.md                    # Documentación completa
```

---

## 🚀 Quick Start

### 1. Instalar dependencias

```bash
cd /Users/ft/.openclaw/workspace/vtc/backend
npm install
```

### 2. Configurar entorno

```bash
cp .env.example .env
# Editar .env si necesitas credentials reales de Uber
```

### 3. Iniciar servidor

```bash
npm start
```

El servidor se inicia en `http://localhost:3000`

---

## 🌐 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/drivers` | Lista conductores con GPS |
| `GET` | `/api/trips` | Lista viajes activos |
| `POST` | `/api/trips` | Crea nuevo viaje |
| `PUT` | `/api/trips/:id/status` | Actualiza estado viaje |
| `POST` | `/api/uber/request` | Pide Uber (DEMO mode) |
| `GET` | `/api/uber/estimate` | Estimación precio |
| `WS` | `/ws` | WebSocket updates (5 seg) |

---

## 🔌 WebSocket Real-time

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('message', (data) => {
  const update = JSON.parse(data);
  // update.data.drivers → conductores actualizados
  // update.data.activeTrips → viajes activos
});
```

---

## 📋 Database

**Tipo:** SQLite (cambiable a PostgreSQL/Supabase en producción)

**Tablas:**
- `drivers` - Conductores con ubicación GPS
- `trips` - Viajes con estados y pricing
- `uber_requests` - Log de requests a Uber API

**Seed data:** 5 conductores + 2 viajes de ejemplo incluidos

---

## 🚗 Uber API Integration

### Modo DEMO (default)

Si no configuras `UBER_SERVER_TOKEN`, el backend simula responses:

```json
{
  "success": true,
  "demo": true,
  "data": { /* mock response */ }
}
```

### Modo PRODUCTION

1. Obtén credentials en https://developer.uber.com/
2. Añade a `.env`:
   ```
   UBER_SERVER_TOKEN=tu-server-token
   UBER_CLIENT_ID=tu-client-id
   UBER_CLIENT_SECRET=tu-client-secret
   ```
3. Restart server

**Endpoints reales soportados:**
- `/v1/requests` - Crear viaje
- `/v1/estimates/price` - Estimación precio
- `/v1/products` - Listar productos

---

## 🔗 Conectar el Mock

En `dashboard-pro-final.html`, buscar:

```javascript
const API_BASE_URL = 'http://localhost:3000'; // ← YA DEBERÍA ESTAR ASÍ
```

**¡Listo!** El mock ya apunta al backend local.

Para producción, cambiar a:
```javascript
const API_BASE_URL = 'https://tu-backend.up.railway.app';
```

---

## 🚀 Deploy a Producción

### Railway (Recomendado)

1. Push a GitHub
2. Railway → "New Project" → "From GitHub"
3. Configurar env vars en Railway Dashboard
4. Deploy automático

### Vercel

```bash
npm install -g vercel
vercel --prod
```

### Heroku

```bash
heroku create vtc-dashboard
git push heroku main
```

**Ver `docs/API.md` para instrucciones detalladas de deploy.**

---

## 📊 Testing

```bash
# Test health
curl http://localhost:3000/health

# Get drivers
curl http://localhost:3000/api/drivers

# Get trips
curl http://localhost:3000/api/trips

# Create trip
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{"passenger_name":"Test","pickup_address":"Sol","dropoff_address":"Aeropuerto"}'
```

---

## 📄 Variables de Entorno

```env
PORT=3000
UBER_SERVER_TOKEN=
UBER_CLIENT_ID=
UBER_CLIENT_SECRET=
DATABASE_PATH=./database/vtc.db
WS_UPDATE_INTERVAL=5000
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

Ver `.env.example` para documentación completa.

---

## 🐛 Troubleshooting

**Error: "UBER_SERVER_TOKEN not configured"**
→ Normal en desarrollo. Backend usa modo DEMO automáticamente.

**Error: "Database locked"**
→ `killall node && rm ../database/vtc.db-wal* && npm start`

**WebSocket no conecta**
→ Verificar URL: `ws://localhost:3000/ws` (no `http://`)

---

## 📞 Soporte

- **Documentación completa:** `docs/API.md`
- **Email:** hybrid.1labs@gmail.com

---

## ✅ Criterio de Éxito

**El mock puede conectarse al backend real cambiando SOLO la URL de los fetches.**

- ✅ Backend funcional con todos los endpoints
- ✅ Database con seed data realista
- ✅ WebSocket para updates en tiempo real
- ✅ Uber API preparada (DEMO mode activo)
- ✅ Documentación completa
- ✅ Instrucciones de deploy

**Próximo paso:** Configurar credentials de Uber y deployar a Railway.

---

*Versión: 1.0.0*  
*Generado: 2026-03-05 08:15 CET*  
*Hybrid Labs - VTC Dashboard Project*
