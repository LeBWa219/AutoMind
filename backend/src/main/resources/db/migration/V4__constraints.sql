-- ============================================================================
-- V4: Ограничения целостности (ТЗ 4.4, 5.4, 9.2) и перечисления статусов
-- (значения перечислений — решение п.6)
-- ============================================================================

-- Пользователи
ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('DISPATCHER', 'ADMIN'));

-- Водители
ALTER TABLE drivers ADD CONSTRAINT ck_drivers_status CHECK (status IN ('AVAILABLE', 'ON_TRIP', 'UNAVAILABLE'));
ALTER TABLE drivers ADD CONSTRAINT ck_drivers_experience CHECK (experience_years >= 0);

-- Автомобили: уникальность VIN и госномера (ТЗ 4.4)
ALTER TABLE vehicles ADD CONSTRAINT uq_vehicles_registration UNIQUE (registration_number);
ALTER TABLE vehicles ADD CONSTRAINT uq_vehicles_vin UNIQUE (vin);
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_status CHECK (status IN ('ACTIVE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE'));
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_year CHECK (production_year IS NULL OR production_year BETWEEN 1990 AND 2100);
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_fuel CHECK (fuel_type IN ('DIESEL', 'PETROL', 'HYBRID', 'ELECTRIC', 'GAS'));
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_consumption CHECK (fuel_consumption_rate > 0);
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_capacity CHECK (load_capacity >= 0);
ALTER TABLE vehicles ADD CONSTRAINT ck_vehicles_mileage CHECK (mileage >= 0);

-- Телеметрия: физически корректные показания (ТЗ 4.7)
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_lat CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_lng CHECK (longitude BETWEEN -180 AND 180);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_speed CHECK (speed >= 0);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_fuel CHECK (fuel_level IS NULL OR fuel_level BETWEEN 0 AND 100);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_rpm CHECK (engine_rpm IS NULL OR engine_rpm >= 0);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_voltage CHECK (battery_voltage IS NULL OR battery_voltage BETWEEN 0 AND 30);
ALTER TABLE telemetry ADD CONSTRAINT ck_telemetry_consistency
    CHECK (NOT movement_status OR (speed > 0 AND ignition_status));

-- Рейсы
ALTER TABLE trips ADD CONSTRAINT ck_trips_distance CHECK (distance > 0);
ALTER TABLE trips ADD CONSTRAINT ck_trips_duration CHECK (duration > 0);
ALTER TABLE trips ADD CONSTRAINT ck_trips_fuel CHECK (fuel_consumption >= 0);
ALTER TABLE trips ADD CONSTRAINT ck_trips_status CHECK (status IN ('COMPLETED', 'CANCELLED'));

-- ДТП и штрафы
ALTER TABLE incidents ADD CONSTRAINT ck_incidents_type CHECK (incident_type IN ('ACCIDENT', 'VIOLATION'));
ALTER TABLE incidents ADD CONSTRAINT ck_incidents_fault CHECK (fault_status IN ('FAULT_FOUND', 'NO_FAULT', 'UNDER_REVIEW'));
ALTER TABLE fines ADD CONSTRAINT ck_fines_amount CHECK (amount >= 0);
ALTER TABLE fines ADD CONSTRAINT ck_fines_payment CHECK (payment_status IN ('PAID', 'UNPAID'));

-- Экономические настройки и веса
ALTER TABLE economic_settings ADD CONSTRAINT ck_settings_prices CHECK (fuel_price >= 0 AND driver_hourly_rate >= 0 AND maintenance_rate >= 0);
ALTER TABLE economic_settings ADD CONSTRAINT ck_settings_costs CHECK (additional_cost >= 0 AND toll_cost >= 0 AND other_cost >= 0);
ALTER TABLE economic_settings ADD CONSTRAINT ck_settings_rate CHECK (default_fuel_consumption_rate > 0);
ALTER TABLE scoring_weights ADD CONSTRAINT ck_weights_percent CHECK (weight_percent BETWEEN 0 AND 100);
ALTER TABLE scoring_weights ADD CONSTRAINT ck_weights_criterion
    CHECK (criterion IN ('ECONOMIC', 'ACCIDENT', 'VIOLATION', 'FUEL', 'RELIABILITY'));

-- Заказы
ALTER TABLE orders ADD CONSTRAINT ck_orders_cargo_type
    CHECK (cargo_type IN ('ORDINARY', 'FRAGILE', 'DANGEROUS', 'PERISHABLE', 'OVERSIZED', 'OTHER'));
ALTER TABLE orders ADD CONSTRAINT ck_orders_status
    CHECK (status IN ('NEW', 'CALCULATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
ALTER TABLE orders ADD CONSTRAINT ck_orders_weight CHECK (cargo_weight > 0);
ALTER TABLE orders ADD CONSTRAINT ck_orders_distance CHECK (loaded_distance > 0 AND empty_distance >= 0);
ALTER TABLE orders ADD CONSTRAINT ck_orders_duration CHECK (planned_duration > 0);
ALTER TABLE orders ADD CONSTRAINT ck_orders_revenue CHECK (revenue >= 0);

-- Расчёты: оценка и риск в диапазоне 0–100, выручка строго больше нуля (ТЗ 5.5.6)
ALTER TABLE order_calculations ADD CONSTRAINT ck_calc_scores CHECK (total_score BETWEEN 0 AND 100 AND risk_score BETWEEN 0 AND 100);
ALTER TABLE order_calculations ADD CONSTRAINT ck_calc_revenue CHECK (revenue > 0);
ALTER TABLE order_calculations ADD CONSTRAINT ck_calc_costs CHECK (total_cost >= 0 AND fuel_cost >= 0 AND driver_cost >= 0
    AND maintenance_cost >= 0 AND toll_cost >= 0 AND additional_cost >= 0 AND other_cost >= 0);

-- Назначения: один заказ — одно активное назначение (ТЗ 7.3)
ALTER TABLE order_assignments ADD CONSTRAINT ck_assignments_status
    CHECK (assignment_status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'));
CREATE UNIQUE INDEX uq_order_assignments_active ON order_assignments (order_id) WHERE assignment_status = 'ACTIVE';

-- Водитель и автомобиль: не более одного активного закрепления на каждую из сторон
CREATE UNIQUE INDEX uq_dva_active_driver  ON driver_vehicle_assignments (driver_id)  WHERE is_active;
CREATE UNIQUE INDEX uq_dva_active_vehicle ON driver_vehicle_assignments (vehicle_id) WHERE is_active;
