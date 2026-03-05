-- ===========================================
-- VTC Dashboard Database Schema
-- SQLite (compatible con PostgreSQL/Supabase)
-- ===========================================

-- Tabla de Conductores
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    license_plate TEXT UNIQUE,
    status TEXT DEFAULT 'available', -- available, busy, offline
    latitude REAL,
    longitude REAL,
    heading REAL DEFAULT 0, -- dirección en grados (0-360)
    rating REAL DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Viajes
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    driver_id TEXT,
    passenger_name TEXT,
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    pickup_latitude REAL,
    pickup_longitude REAL,
    dropoff_latitude REAL,
    dropoff_longitude REAL,
    status TEXT DEFAULT 'requested', -- requested, accepted, in_progress, completed, cancelled
    estimated_price REAL,
    actual_price REAL,
    distance_km REAL,
    duration_minutes INTEGER,
    uber_request_id TEXT, -- ID de referencia de Uber API
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Tabla de Uber API Requests (log)
CREATE TABLE IF NOT EXISTS uber_requests (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_data TEXT,
    response_data TEXT,
    status_code INTEGER,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_uber_requests_created ON uber_requests(created_at);

-- ===========================================
-- DATOS DE EJEMPLO (SEED)
-- ===========================================

-- Conductores de ejemplo
INSERT OR IGNORE INTO drivers (id, name, email, phone, vehicle_model, vehicle_color, license_plate, status, latitude, longitude, heading, rating, total_trips) VALUES
('driver-001', 'Carlos Mendoza', 'carlos@vtc.com', '+34 600 000 001', 'Toyota Prius', 'Blanco', '1234-ABC', 'available', 40.4168, -3.7038, 45, 4.8, 156),
('driver-002', 'María García', 'maria@vtc.com', '+34 600 000 002', 'Tesla Model 3', 'Negro', '5678-DEF', 'busy', 40.4200, -3.6950, 120, 4.9, 243),
('driver-003', 'Juan Rodríguez', 'juan@vtc.com', '+34 600 000 003', 'Mercedes Clase E', 'Gris', '9012-GHI', 'available', 40.4100, -3.7100, 270, 4.7, 189),
('driver-004', 'Ana López', 'ana@vtc.com', '+34 600 000 004', 'BMW Serie 5', 'Azul', '3456-JKL', 'offline', 40.4250, -3.6900, 0, 4.6, 134),
('driver-005', 'Pedro Sánchez', 'pedro@vtc.com', '+34 600 000 005', 'Audi A6', 'Negro', '7890-MNO', 'available', 40.4180, -3.7080, 180, 4.9, 267);

-- Viajes de ejemplo
INSERT OR IGNORE INTO trips (id, driver_id, passenger_name, pickup_address, dropoff_address, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, status, estimated_price, distance_km, duration_minutes) VALUES
('trip-001', 'driver-002', 'Cliente VIP 1', 'Puerta del Sol, Madrid', 'Aeropuerto T4', 40.4168, -3.7038, 40.4936, -3.5668, 'in_progress', 35.50, 15.2, 25),
('trip-002', 'driver-001', 'Cliente VIP 2', 'Gran Vía 32', 'Estación Atocha', 40.4200, -3.7050, 40.4067, -3.6947, 'completed', 12.00, 3.5, 12);
