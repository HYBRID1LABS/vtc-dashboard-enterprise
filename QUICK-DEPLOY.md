# 🚀 VTC Dashboard Enterprise - Quick Deploy Guide

**Inicio rápido en 3 pasos**

---

## ⚡ Opción 1: Local (Demo Inmediata)

### Paso 1: Iniciar Backend

```bash
cd /Users/ft/.openclaw/workspace/vtc/backend
npm install  # Solo la primera vez
npm start
```

✅ Backend corriendo en: http://localhost:3000

### Paso 2: Abrir Frontend

```bash
# Opción A: Abrir directamente en navegador
open /Users/ft/.openclaw/workspace/vtc/dashboard-enterprise/index.html

# Opción B: Servir con servidor HTTP
cd /Users/ft/.openclaw/workspace/vtc/dashboard-enterprise
python3 -m http.server 8080
```

✅ Frontend disponible en: http://localhost:8080

### Paso 3: Login

```
Email: admin@vtcalicante.com
Contraseña: admin123
```

---

## 🌐 Opción 2: VPS (Producción)

### Requisitos Previos

- VPS con Ubuntu 20.04+
- Node.js 18+ instalado
- Nginx instalado
- Dominio configurado

### Paso 1: Subir Archivos

```bash
# Crear directorio
sudo mkdir -p /var/www/vtc-dashboard
sudo chown $USER:$USER /var/www/vtc-dashboard

# Subir archivos (SCP)
scp -r vtc/* user@your-server:/var/www/vtc-dashboard/
```

### Paso 2: Configurar Backend

```bash
cd /var/www/vtc-dashboard/backend

# Instalar dependencias
npm install --production

# Configurar variables de entorno
cp .env.example .env
nano .env
```

**Editar .env:**
```env
PORT=3000
NODE_ENV=production
DATABASE_PATH=/var/www/vtc-dashboard/backend/database/vtc.db
CORS_ORIGINS=https://tu-dominio.com
UBER_SERVER_TOKEN=tu-token
UBER_CLIENT_ID=tu-client-id
UBER_CLIENT_SECRET=tu-client-secret
```

### Paso 3: Instalar PM2

```bash
sudo npm install -g pm2
```

### Paso 4: Iniciar Backend con PM2

```bash
cd /var/www/vtc-dashboard/backend

# Iniciar proceso
pm2 start server.js --name vtc-backend

# Guardar configuración
pm2 save

# Configurar startup al boot
pm2 startup
# Copiar y ejecutar el comando que muestra
```

### Paso 5: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/vtc-dashboard
```

**Configuración:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        root /var/www/vtc-dashboard/dashboard-enterprise;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

**Activar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/vtc-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 6: SSL con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

✅ **Listo!** Acceder a: https://tu-dominio.com

---

## 🐳 Opción 3: Docker (Recomendado para Producción)

### Paso 1: Crear Dockerfile

**backend/Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Paso 2: Crear docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/vtc.db
    volumes:
      - ./data:/data
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./dashboard-enterprise:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
    restart: unless-stopped
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://backend:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### Paso 3: Deploy

```bash
docker-compose up -d
```

✅ **Listo!** Acceder a: http://localhost

---

## 🔧 Comandos Útiles

### Backend

```bash
# Iniciar
npm start

# Desarrollo (auto-reload)
npm run dev

# Ver logs
pm2 logs vtc-backend

# Reiniciar
pm2 restart vtc-backend

# Detener
pm2 stop vtc-backend
```

### Base de Datos

```bash
# Resetear database (¡cuidado! borra todo)
rm database/vtc.db
node -e "require('./database').getDatabase()"
```

### Monitoreo

```bash
# Ver procesos PM2
pm2 status

# Ver uso de recursos
pm2 monit

# Ver logs en tiempo real
pm2 logs --lines 100
```

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 already in use"

```bash
# Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9

# O cambiar puerto en .env
PORT=3001
```

### Error: "CORS blocked"

Verificar en `.env`:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://tu-dominio.com
```

### Error: "Database not found"

```bash
# Crear directorio
mkdir -p backend/database

# Inicializar DB
cd backend
node -e "require('./database').getDatabase()"
```

### Nginx: 502 Bad Gateway

```bash
# Verificar backend está corriendo
pm2 status

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 📊 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas (.env)
- [ ] Uber API credentials añadidas
- [ ] CORS_ORIGINS actualizado para producción
- [ ] DATABASE_PATH configurado correctamente
- [ ] SSL certificado instalado (Let's Encrypt)
- [ ] PM2 configurado para auto-start
- [ ] Backup de database programado
- [ ] Monitoreo de logs configurado
- [ ] Firewall configurado (puertos 80, 443, 3000)

---

## 📞 Soporte

**Documentación Completa:** `docs/ENTERPRISE-FEATURES.md`  
**Implementación:** `IMPLEMENTATION-SUMMARY.md`  
**Contacto:** hello@hybridlabs.com

---

*Última actualización: Marzo 5, 2026*  
*Hybrid Labs - VTC Dashboard Enterprise v1.0*
