-- 1️⃣ Usuarios / Administradores
create table usuarios (
  id serial primary key,
  nombre varchar(100),
  password_hash VARCHAR(255) NOT NULL
);

-- 2️⃣ Equipos
CREATE TABLE equipos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    puntos INT DEFAULT 0
);


-- 3️⃣ Fase
CREATE TABLE fase (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL, -- Ej: Grupo A, Octavos, Semifinal
    estado VARCHAR(50) DEFAULT 'pendiente'
);


-- 2️⃣ Equipos_fase
CREATE TABLE equipos_fase (
    id serial primary key,
    equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    fase_id INT REFERENCES fase(id) ON DELETE CASCADE
);

-- 4️⃣ Partidos / Calendario
CREATE TABLE partido (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP NOT NULL,
    equipo_local_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    equipo_visitante_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    goles_local INT DEFAULT 0,
    goles_visitante INT DEFAULT 0,
    fase_id INT REFERENCES fase(id) ON DELETE SET NULL,
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente / en progreso / finalizado
    campo INT NOT NULL,
    tipo VARCHAR(50) NOT NULL
);

CREATE TABLE presupuesto (
    id SERIAL PRIMARY KEY,
    concepto VARCHAR(200) NOT NULL, -- ingreso / gasto
    monto DECIMAL(10,2) NOT NULL
);

CREATE TABLE economia (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    monto DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    user_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

-- 7️⃣ Documentos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    descripcion TEXT,
    user_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente / aprobado / rechazado
    numTicks INT DEFAULT 0,
    numNoTicks INT DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW()
);
