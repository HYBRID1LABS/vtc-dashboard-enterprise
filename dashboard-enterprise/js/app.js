/**
 * VTC Dashboard Enterprise - Main Application
 * Professional VTC Management System
 * Version: 1.0 Enterprise
 */

// ===========================================
// CONFIGURACIÓN GLOBAL
// ===========================================

const APP_CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  WS_URL: 'ws://localhost:3000/ws',
  REFRESH_INTERVAL: 5000,
  MAP_DEFAULT_LAT: 38.3452,
  MAP_DEFAULT_LNG: -0.4810,
  MAP_DEFAULT_ZOOM: 13,
  THEME_KEY: 'vtc_dashboard_theme',
  LANGUAGE_KEY: 'vtc_dashboard_language'
};

// ===========================================
// ESTADO DE LA APLICACIÓN
// ===========================================

const AppState = {
  user: null,
  drivers: [],
  trips: [],
  notifications: [],
  metrics: {},
  theme: 'light',
  language: 'es',
  map: null,
  markers: [],
  heatmapLayer: null,
  ws: null
};

// ===========================================
// TRADUCCIONES (i18n)
// ===========================================

const translations = {
  es: {
    dashboard: 'Dashboard',
    drivers: 'Conductores',
    trips: 'Viajes',
    analytics: 'Analíticas',
    heatmaps: 'Zonas Calientes',
    notifications: 'Notificaciones',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    totalRevenue: 'Ingresos Totales',
    totalTrips: 'Viajes Totales',
    activeDrivers: 'Conductores Activos',
    avgTicket: 'Ticket Promedio',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    thisYear: 'Este Año',
    status: 'Estado',
    available: 'Disponible',
    busy: 'En Viaje',
    offline: 'Offline',
    name: 'Nombre',
    vehicle: 'Vehículo',
    rating: 'Valoración',
    actions: 'Acciones',
    viewDetails: 'Ver Detalles',
    assignTrip: 'Asignar Viaje',
    cancelTrip: 'Cancelar Viaje',
    export: 'Exportar',
    filter: 'Filtrar',
    search: 'Buscar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    loading: 'Cargando...',
    noData: 'No hay datos disponibles',
    error: 'Error',
    success: 'Éxito',
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo'
  },
  en: {
    dashboard: 'Dashboard',
    drivers: 'Drivers',
    trips: 'Trips',
    analytics: 'Analytics',
    heatmaps: 'Heatmaps',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Logout',
    totalRevenue: 'Total Revenue',
    totalTrips: 'Total Trips',
    activeDrivers: 'Active Drivers',
    avgTicket: 'Average Ticket',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    status: 'Status',
    available: 'Available',
    busy: 'Busy',
    offline: 'Offline',
    name: 'Name',
    vehicle: 'Vehicle',
    rating: 'Rating',
    actions: 'Actions',
    viewDetails: 'View Details',
    assignTrip: 'Assign Trip',
    cancelTrip: 'Cancel Trip',
    export: 'Export',
    filter: 'Filter',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    loading: 'Loading...',
    noData: 'No data available',
    error: 'Error',
    success: 'Success',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  }
};

// ===========================================
// API CLIENT
// ===========================================

const API = {
  async request(endpoint, options = {}) {
    const url = `${APP_CONFIG.API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('[API] Error:', error);
      throw error;
    }
  },

  // Drivers
  async getDrivers(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/drivers?${params}`);
  },

  async getDriver(id) {
    return this.request(`/drivers/${id}`);
  },

  async updateDriverLocation(id, location) {
    return this.request(`/drivers/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify(location)
    });
  },

  async createDriver(driver) {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(driver)
    });
  },

  // Trips
  async getTrips(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/trips?${params}`);
  },

  async getTrip(id) {
    return this.request(`/trips/${id}`);
  },

  async createTrip(trip) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(trip)
    });
  },

  async updateTripStatus(id, status) {
    return this.request(`/trips/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async cancelTrip(id) {
    return this.request(`/trips/${id}/cancel`, {
      method: 'POST'
    });
  },

  // Analytics
  async getAnalytics(period = 'month') {
    return this.request(`/analytics?period=${period}`);
  },

  async getRevenue(period = 'month') {
    return this.request(`/analytics/revenue?period=${period}`);
  },

  async getHeatmapData(days = 7) {
    return this.request(`/analytics/heatmap?days=${days}`);
  },

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST'
    });
  },

  async createNotification(notification) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    });
  },

  // Uber
  async getUberEstimate(pickup, dropoff) {
    return this.request('/uber/estimate', {
      method: 'POST',
      body: JSON.stringify({ pickup, dropoff })
    });
  },

  async requestUber(tripDetails) {
    return this.request('/uber/request', {
      method: 'POST',
      body: JSON.stringify(tripDetails)
    });
  }
};

// ===========================================
// GESTIÓN DEL TEMA
// ===========================================

const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem(APP_CONFIG.THEME_KEY) || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(APP_CONFIG.THEME_KEY, theme);
  },

  toggle() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  },

  getTheme() {
    return AppState.theme;
  }
};

// ===========================================
// GESTIÓN DEL IDIOMA
// ===========================================

const LanguageManager = {
  init() {
    const savedLang = localStorage.getItem(APP_CONFIG.LANGUAGE_KEY) || 'es';
    this.setLanguage(savedLang);
  },

  setLanguage(lang) {
    AppState.language = lang;
    localStorage.setItem(APP_CONFIG.LANGUAGE_KEY, lang);
    this.updateUI();
  },

  t(key) {
    return translations[AppState.language]?.[key] || translations.es[key] || key;
  },

  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
  }
};

// ===========================================
// MAPA (Leaflet)
// ===========================================

const MapManager = {
  init(containerId = 'map') {
    if (!L) {
      console.error('[Map] Leaflet not loaded');
      return;
    }

    AppState.map = L.map(containerId).setView(
      [APP_CONFIG.MAP_DEFAULT_LAT, APP_CONFIG.MAP_DEFAULT_LNG],
      APP_CONFIG.MAP_DEFAULT_ZOOM
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(AppState.map);

    return AppState.map;
  },

  addDriverMarker(driver) {
    if (!AppState.map) return;

    const statusClass = driver.status === 'available' ? 'success' : 
                        driver.status === 'busy' ? 'warning' : 'error';

    const markerHtml = `
      <div class="driver-marker ${statusClass}" style="
        background: var(--${statusClass === 'success' ? 'success' : statusClass === 'warning' ? 'warning' : 'error'});
        border: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">🚖</div>
    `;

    const marker = L.marker([driver.location.lat, driver.location.lng], {
      icon: L.divIcon({
        html: markerHtml,
        className: 'driver-marker-container',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(AppState.map);

    const popup = L.popup({
      className: 'driver-popup'
    }).setContent(`
      <div style="min-width: 200px;">
        <h3 style="margin-bottom: 8px; font-weight: 600;">${driver.name}</h3>
        <p style="margin-bottom: 4px;"><strong>Vehículo:</strong> ${driver.vehicle}</p>
        <p style="margin-bottom: 4px;"><strong>Placa:</strong> ${driver.licensePlate}</p>
        <p style="margin-bottom: 4px;"><strong>Rating:</strong> ⭐ ${driver.rating}</p>
        <p style="margin-bottom: 8px;"><strong>Viajes:</strong> ${driver.totalTrips}</p>
        <p style="margin-bottom: 12px;">
          <strong>Estado:</strong> 
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${LanguageManager.t(driver.status)}
          </span>
        </p>
        <a href="tel:${driver.phone}" class="btn btn-primary btn-sm" style="text-decoration: none;">
          📞 Llamar
        </a>
      </div>
    `);

    marker.bindPopup(popup);
    AppState.markers.push(marker);

    return marker;
  },

  clearMarkers() {
    AppState.markers.forEach(marker => AppState.map.removeLayer(marker));
    AppState.markers = [];
  },

  updateMarkers(drivers) {
    this.clearMarkers();
    drivers.forEach(driver => this.addDriverMarker(driver));
  },

  fitToDrivers(drivers) {
    if (drivers.length === 0) return;

    const bounds = drivers.map(d => [d.location.lat, d.location.lng]);
    AppState.map.fitBounds(bounds, { padding: [50, 50] });
  }
};

// ===========================================
// GRÁFICOS (Chart.js)
// ===========================================

const ChartManager = {
  charts: {},

  createLineChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const config = {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: options.showLegend !== false,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: options.beginAtZero !== false,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        ...options
      }
    };

    this.charts[canvasId] = new Chart(ctx, config);
    return this.charts[canvasId];
  },

  createBarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const config = {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: options.showLegend !== false,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: options.beginAtZero !== false,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        ...options
      }
    };

    this.charts[canvasId] = new Chart(ctx, config);
    return this.charts[canvasId];
  },

  createDoughnutChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const config = {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        ...options
      }
    };

    this.charts[canvasId] = new Chart(ctx, config);
    return this.charts[canvasId];
  },

  updateChart(canvasId, newData) {
    const chart = this.charts[canvasId];
    if (chart) {
      chart.data = newData;
      chart.update();
    }
  },

  destroyChart(canvasId) {
    const chart = this.charts[canvasId];
    if (chart) {
      chart.destroy();
      delete this.charts[canvasId];
    }
  }
};

// ===========================================
// NOTIFICACIONES
// ===========================================

const NotificationManager = {
  panel: null,

  init() {
    this.panel = document.getElementById('notifications-panel');
  },

  toggle() {
    if (this.panel) {
      this.panel.classList.toggle('open');
    }
  },

  close() {
    if (this.panel) {
      this.panel.classList.remove('open');
    }
  },

  add(notification) {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = `notification-item ${notification.priority || 'low'}`;
    item.innerHTML = `
      <div class="notification-header">
        <span class="notification-type">${notification.type || 'Info'}</span>
        <span class="notification-time">${this.formatTime(notification.time || new Date())}</span>
      </div>
      <div class="notification-message">${notification.message}</div>
    `;

    list.insertBefore(item, list.firstChild);
  },

  formatTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    return new Date(date).toLocaleDateString();
  },

  async load() {
    try {
      const response = await API.getNotifications();
      if (response.success && response.data) {
        response.data.forEach(notification => this.add(notification));
      }
    } catch (error) {
      console.error('[Notifications] Error loading:', error);
    }
  }
};

// ===========================================
// UTILIDADES
// ===========================================

const Utils = {
  formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat(AppState.language === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  formatNumber(num) {
    return new Intl.NumberFormat(AppState.language === 'es' ? 'es-ES' : 'en-US').format(num);
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString(AppState.language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatDateTime(date) {
    return new Date(date).toLocaleString(AppState.language === 'es' ? 'es-ES' : 'en-US');
  },

  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  },

  getStatusClass(status) {
    const map = {
      'available': 'success',
      'busy': 'warning',
      'offline': 'error',
      'in_progress': 'info',
      'completed': 'success',
      'cancelled': 'error'
    };
    return map[status] || 'info';
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = `<div class="text-center" style="padding: 40px;">
        <div class="spinner"></div>
        <p style="margin-top: 16px; color: var(--text-secondary);">${LanguageManager.t('loading')}</p>
      </div>`;
    }
  },

  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = `<div class="text-center" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <p style="color: var(--error);">${message || LanguageManager.t('error')}</p>
      </div>`;
    }
  }
};

// ===========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===========================================

const App = {
  async init() {
    console.log('[App] Initializing VTC Dashboard Enterprise...');

    // Inicializar tema y lenguaje
    ThemeManager.init();
    LanguageManager.init();

    // Inicializar notificaciones
    NotificationManager.init();

    // Cargar datos iniciales
    await this.loadDashboard();

    // Configurar actualizaciones periódicas
    this.startAutoRefresh();

    // Configurar event listeners
    this.setupEventListeners();

    console.log('[App] Dashboard initialized successfully');
  },

  async loadDashboard() {
    try {
      await Promise.all([
        this.loadDrivers(),
        this.loadTrips(),
        this.loadMetrics()
      ]);
    } catch (error) {
      console.error('[App] Error loading dashboard:', error);
    }
  },

  async loadDrivers() {
    try {
      const response = await API.getDrivers();
      if (response.success) {
        AppState.drivers = response.data;
        this.renderDriversList();
        
        // Actualizar mapa si existe
        if (document.getElementById('map')) {
          MapManager.updateMarkers(AppState.drivers);
          MapManager.fitToDrivers(AppState.drivers);
        }
      }
    } catch (error) {
      console.error('[App] Error loading drivers:', error);
    }
  },

  async loadTrips() {
    try {
      const response = await API.getTrips({ status: 'in_progress' });
      if (response.success) {
        AppState.trips = response.data;
        this.renderTripsList();
      }
    } catch (error) {
      console.error('[App] Error loading trips:', error);
    }
  },

  async loadMetrics() {
    try {
      const response = await API.getAnalytics('month');
      if (response.success) {
        AppState.metrics = response.data;
        this.renderMetrics();
      }
    } catch (error) {
      console.error('[App] Error loading metrics:', error);
      // Usar datos mock si falla la API
      this.renderMetricsMock();
    }
  },

  renderMetrics() {
    const metrics = AppState.metrics;
    
    // Actualizar cards de métricas
    const elements = {
      revenue: document.getElementById('metric-revenue'),
      trips: document.getElementById('metric-trips'),
      drivers: document.getElementById('metric-drivers'),
      ticket: document.getElementById('metric-ticket')
    };

    if (elements.revenue) {
      elements.revenue.textContent = Utils.formatCurrency(metrics.revenue || 0);
    }
    if (elements.trips) {
      elements.trips.textContent = Utils.formatNumber(metrics.trips || 0);
    }
    if (elements.drivers) {
      elements.drivers.textContent = Utils.formatNumber(metrics.activeDrivers || 0);
    }
    if (elements.ticket) {
      elements.ticket.textContent = Utils.formatCurrency(metrics.avgTicket || 0);
    }
  },

  renderMetricsMock() {
    // Datos mock para demo
    const mockMetrics = {
      revenue: 15420.50,
      trips: 342,
      activeDrivers: 28,
      avgTicket: 45.10
    };

    AppState.metrics = mockMetrics;
    this.renderMetrics();
  },

  renderDriversList() {
    const container = document.getElementById('drivers-list');
    if (!container) return;

    if (AppState.drivers.length === 0) {
      container.innerHTML = `<div class="text-center" style="padding: 40px;">
        <p style="color: var(--text-secondary);">${LanguageManager.t('noData')}</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>${LanguageManager.t('name')}</th>
            <th>${LanguageManager.t('vehicle')}</th>
            <th>${LanguageManager.t('status')}</th>
            <th>${LanguageManager.t('rating')}</th>
            <th>${LanguageManager.t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${AppState.drivers.map(driver => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="user-avatar" style="width: 40px; height: 40px; font-size: 16px;">
                    ${Utils.getInitials(driver.name)}
                  </div>
                  <div>
                    <div style="font-weight: 500;">${driver.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${driver.licensePlate}</div>
                  </div>
                </div>
              </td>
              <td>${driver.vehicle}</td>
              <td>
                <span class="status-badge ${Utils.getStatusClass(driver.status)}">
                  <span class="status-dot"></span>
                  ${LanguageManager.t(driver.status)}
                </span>
              </td>
              <td>⭐ ${driver.rating}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="App.viewDriver('${driver.id}')">
                  ${LanguageManager.t('viewDetails')}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  renderTripsList() {
    const container = document.getElementById('trips-list');
    if (!container) return;

    if (AppState.trips.length === 0) {
      container.innerHTML = `<div class="text-center" style="padding: 40px;">
        <p style="color: var(--text-secondary);">${LanguageManager.t('noData')}</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Pasajero</th>
            <th>Origen</th>
            <th>Destino</th>
            <th>Conductor</th>
            <th>Precio</th>
            <th>${LanguageManager.t('status')}</th>
          </tr>
        </thead>
        <tbody>
          ${AppState.trips.map(trip => `
            <tr>
              <td>${trip.passenger}</td>
              <td>${trip.pickup.address}</td>
              <td>${trip.dropoff.address}</td>
              <td>${trip.driver?.name || 'Sin asignar'}</td>
              <td>${Utils.formatCurrency(trip.pricing.estimated)}</td>
              <td>
                <span class="status-badge ${Utils.getStatusClass(trip.status)}">
                  <span class="status-dot"></span>
                  ${LanguageManager.t(trip.status)}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  viewDriver(id) {
    console.log('[App] View driver:', id);
    // Implementar modal de detalle
  },

  setupEventListeners() {
    // Toggle sidebar
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (mainContent) {
          mainContent.classList.toggle('expanded');
        }
      });
    }

    // Toggle notifications
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
      notificationBell.addEventListener('click', () => {
        NotificationManager.toggle();
      });
    }

    // Toggle theme
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = ThemeManager.toggle();
        console.log('[App] Theme changed to:', newTheme);
      });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  },

  startAutoRefresh() {
    setInterval(async () => {
      await this.loadDrivers();
      await this.loadTrips();
    }, APP_CONFIG.REFRESH_INTERVAL);
  }
};

// ===========================================
// INICIAR APLICACIÓN
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Exportar para uso global
window.App = App;
window.API = API;
window.MapManager = MapManager;
window.ChartManager = ChartManager;
window.NotificationManager = NotificationManager;
window.ThemeManager = ThemeManager;
window.LanguageManager = LanguageManager;
window.Utils = Utils;
