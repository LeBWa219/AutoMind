-- ============================================================================
-- V1: Создание всех таблиц (ТЗ 7.2 + решения п.1, п.2, п.5)
-- Связи, индексы и ограничения — в отдельных миграциях V2–V4.
-- ============================================================================

-- 7.2.1 Пользователи системы
CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    access_code_hash  VARCHAR(100) NOT NULL,
    role              VARCHAR(30)  NOT NULL DEFAULT 'DISPATCHER',
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 7.2.2 Водители
CREATE TABLE drivers (
    id               BIGSERIAL PRIMARY KEY,
    full_name        VARCHAR(150) NOT NULL,
    phone            VARCHAR(30),
    license_number   VARCHAR(50),
    license_category VARCHAR(20),
    experience_years INT          NOT NULL DEFAULT 0,
    employment_date  DATE,
    status           VARCHAR(30)  NOT NULL DEFAULT 'AVAILABLE',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 7.2.3 Транспортные средства
CREATE TABLE vehicles (
    id                     BIGSERIAL PRIMARY KEY,
    registration_number    VARCHAR(20)  NOT NULL,
    vin                    VARCHAR(30)  NOT NULL,
    brand                  VARCHAR(50)  NOT NULL,
    model                  VARCHAR(50)  NOT NULL,
    production_year        INT,
    fuel_type              VARCHAR(20)  NOT NULL DEFAULT 'DIESEL',
    fuel_consumption_rate  NUMERIC(6,2) NOT NULL DEFAULT 20.00,
    load_capacity          NUMERIC(10,2) NOT NULL DEFAULT 0,
    mileage                NUMERIC(12,1) NOT NULL DEFAULT 0,
    status                 VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 7.2.4 Исторические связи водителей и автомобилей
CREATE TABLE driver_vehicle_assignments (
    id            BIGSERIAL PRIMARY KEY,
    driver_id     BIGINT NOT NULL,
    vehicle_id    BIGINT NOT NULL,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7.2.5 Телеметрия (тестовая, генерируется симулятором)
CREATE TABLE telemetry (
    id                  BIGSERIAL PRIMARY KEY,
    vehicle_id          BIGINT NOT NULL,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    speed               DOUBLE PRECISION NOT NULL DEFAULT 0,
    engine_rpm          INT,
    engine_temperature  DOUBLE PRECISION,
    coolant_temperature DOUBLE PRECISION,
    fuel_level          DOUBLE PRECISION,
    fuel_consumption    DOUBLE PRECISION,
    battery_voltage     DOUBLE PRECISION,
    battery_ok          BOOLEAN NOT NULL DEFAULT TRUE,
    mileage             DOUBLE PRECISION NOT NULL DEFAULT 0,
    oil_pressure        DOUBLE PRECISION,
    ignition_status     BOOLEAN NOT NULL DEFAULT FALSE,
    movement_status     BOOLEAN NOT NULL DEFAULT FALSE,
    warning             VARCHAR(120),
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2.6 Маршруты
CREATE TABLE routes (
    id                BIGSERIAL PRIMARY KEY,
    vehicle_id        BIGINT NOT NULL,
    route_name        VARCHAR(120) NOT NULL,
    route_coordinates JSONB NOT NULL,
    route_status      VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2.7 История выполненных рейсов
CREATE TABLE trips (
    id               BIGSERIAL PRIMARY KEY,
    driver_id        BIGINT NOT NULL,
    vehicle_id       BIGINT NOT NULL,
    start_location   VARCHAR(120) NOT NULL,
    end_location     VARCHAR(120) NOT NULL,
    distance         NUMERIC(8,1) NOT NULL,
    duration         NUMERIC(5,1) NOT NULL,
    fuel_consumption NUMERIC(8,1) NOT NULL,
    fuel_cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
    trip_date        DATE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
);

-- 7.2.8 ДТП и эксплуатационные события (виновность отделена от факта — ТЗ 5.8)
CREATE TABLE incidents (
    id            BIGSERIAL PRIMARY KEY,
    driver_id     BIGINT NOT NULL,
    vehicle_id    BIGINT,
    incident_type VARCHAR(20) NOT NULL,
    description   VARCHAR(255),
    accident_date DATE NOT NULL,
    fault_status  VARCHAR(20) NOT NULL DEFAULT 'UNDER_REVIEW',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2.9 Штрафы
CREATE TABLE fines (
    id             BIGSERIAL PRIMARY KEY,
    driver_id      BIGINT NOT NULL,
    vehicle_id     BIGINT,
    incident_id    BIGINT,
    amount         NUMERIC(10,2) NOT NULL,
    description    VARCHAR(255),
    issued_at      DATE NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
);

-- 7.2.10 Экономические настройки компании (расширены — решение п.1)
CREATE TABLE economic_settings (
    id                            BIGSERIAL PRIMARY KEY,
    fuel_price                    NUMERIC(10,2) NOT NULL,
    default_fuel_consumption_rate NUMERIC(6,2)  NOT NULL,
    driver_hourly_rate            NUMERIC(10,2) NOT NULL,
    maintenance_rate              NUMERIC(10,2) NOT NULL,
    additional_cost               NUMERIC(12,2) NOT NULL DEFAULT 0,
    toll_cost                     NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_cost                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Решение п.5: веса критериев оценки водителей (ТЗ 5.8), cargo_type NULL = базовый набор
CREATE TABLE scoring_weights (
    id             BIGSERIAL PRIMARY KEY,
    criterion      VARCHAR(30) NOT NULL,
    weight_percent INT         NOT NULL,
    cargo_type     VARCHAR(30),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2.11 Заказы на перевозку (special_conditions — решение п.2)
CREATE TABLE orders (
    id                 BIGSERIAL PRIMARY KEY,
    order_name         VARCHAR(150) NOT NULL,
    cargo_type         VARCHAR(30)  NOT NULL,
    cargo_description  VARCHAR(255),
    cargo_weight       NUMERIC(10,2) NOT NULL,
    cargo_volume       NUMERIC(10,2),
    is_fragile         BOOLEAN      NOT NULL DEFAULT FALSE,
    special_conditions VARCHAR(255),
    origin             VARCHAR(120) NOT NULL,
    destination        VARCHAR(120) NOT NULL,
    loaded_distance    NUMERIC(8,1) NOT NULL,
    empty_distance     NUMERIC(8,1) NOT NULL DEFAULT 0,
    planned_duration   NUMERIC(5,1) NOT NULL,
    revenue            NUMERIC(12,2) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 7.2.12 Результаты экономических расчётов (снимок параметров — ТЗ 5.10)
CREATE TABLE order_calculations (
    id                   BIGSERIAL PRIMARY KEY,
    order_id             BIGINT NOT NULL,
    driver_id            BIGINT NOT NULL,
    vehicle_id           BIGINT NOT NULL,
    fuel_cost            NUMERIC(12,2) NOT NULL,
    driver_cost          NUMERIC(12,2) NOT NULL,
    maintenance_cost     NUMERIC(12,2) NOT NULL,
    toll_cost            NUMERIC(12,2) NOT NULL,
    additional_cost      NUMERIC(12,2) NOT NULL,
    other_cost           NUMERIC(12,2) NOT NULL,
    total_cost           NUMERIC(12,2) NOT NULL,
    revenue              NUMERIC(12,2) NOT NULL,
    profit               NUMERIC(12,2) NOT NULL,
    profitability        NUMERIC(6,2)  NOT NULL,
    risk_score           NUMERIC(5,2)  NOT NULL,
    total_score          NUMERIC(5,2)  NOT NULL,
    insufficient_data    BOOLEAN       NOT NULL DEFAULT FALSE,
    calculation_snapshot JSONB         NOT NULL,
    calculated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 7.2.13 Назначения водителей на заказы
CREATE TABLE order_assignments (
    id                BIGSERIAL PRIMARY KEY,
    order_id          BIGINT NOT NULL,
    driver_id         BIGINT NOT NULL,
    vehicle_id        BIGINT NOT NULL,
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- 7.2.14 История диалога с интеллектуальным помощником
CREATE TABLE chat_messages (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    order_id   BIGINT,
    message    TEXT NOT NULL,
    response   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
