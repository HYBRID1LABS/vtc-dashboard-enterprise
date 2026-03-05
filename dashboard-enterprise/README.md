# 🚖 VTC Dashboard Enterprise

**Dashboard profesional de gestión de flotas VTC**

![Version](https://img.shields.io/badge/version-1.0%20Enterprise-blue)
![Status](https://img.shields.io/badge/status-production%20ready-green)
![License](https://img.shields.io/badge/license-proprietary-red)

---

## ✨ Features

- 📍 **Gestión de Conductores** en tiempo real
- 🚗 **Gestión de Viajes** con tracking GPS
- 📊 **Analíticas Avanzadas** con gráficos interactivos
- 🔥 **Heatmaps** de demanda (zonas calientes)
- 🔔 **Sistema de Notificaciones** y alertas
- 📱 **Responsive** (desktop, tablet, mobile)
- 🌙 **Dark/Light Mode**
- 🌐 **Multi-idioma** (Español/Inglés)
- 🔐 **Autenticación JWT** con roles

---

## 🚀 Quick Start

### 1. Iniciar Backend

```bash
cd ../backend
npm install
npm start
```

### 2. Abrir Frontend

Abrir `index.html` en el navegador o servir con:

```bash
python -m http.server 8080
```

Visitar: http://localhost:8080

---

## 📁 Estructura

```
dashboard-enterprise/
├── index.html          # Dashboard principal
├── drivers.html        # Conductores
├── trips.html          # Viajes
├── analytics.html      # Analíticas
├── heatmaps.html       # Heatmaps
├── notifications.html  # Notificaciones
├── settings.html       # Configuración
├── login.html          # Login
├── css/
│   └── style.css       # Estilos enterprise
└── js/
    └── app.js          # Lógica de la app
```

---

## 🎯 Credenciales Demo

```
Email: admin@vtcalicante.com
Contraseña: admin123
```

---

## 📖 Documentación

Ver [docs/ENTERPRISE-FEATURES.md](../docs/ENTERPRISE-FEATURES.md) para documentación completa.

---

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Gráficos:** Chart.js 4.4.0
- **Mapas:** Leaflet.js 1.9.4 + Leaflet.heat
- **Iconos:** FontAwesome 6.5.1
- **Backend:** Node.js + Express
- **Database:** SQLite (sql.js)

---

## 📸 Screenshots

### Dashboard Principal
![Dashboard](../docs/screenshots/dashboard.png)

### Gestión de Conductores
![Conductores](../docs/screenshots/drivers.png)

### Heatmaps
![Heatmaps](../docs/screenshots/heatmaps.png)

### Analíticas
![Analytics](../docs/screenshots/analytics.png)

---

## 📞 Soporte

**Hybrid Labs** - hello@hybridlabs.com

---

*Desarrollado con ❤️ para VTC Alicante*
