-- ============================================================================
-- V3: Индексы для часто используемых выборок (ТЗ 9.1)
-- ============================================================================

-- Телеметрия: последние показания по автомобилю
CREATE INDEX idx_telemetry_vehicle_time ON telemetry (vehicle_id, recorded_at DESC);

-- История рейсов водителя (последние 10 для расчётов — ТЗ 5.6)
CREATE INDEX idx_trips_driver_date ON trips (driver_id, trip_date DESC);

-- ДТП, нарушения, штрафы по водителю
CREATE INDEX idx_incidents_driver ON incidents (driver_id, accident_date DESC);
CREATE INDEX idx_fines_driver ON fines (driver_id, issued_at DESC);
CREATE INDEX idx_fines_payment ON fines (payment_status);

-- Активные закрепления водителей и автомобилей
CREATE INDEX idx_dva_driver_active  ON driver_vehicle_assignments (driver_id)  WHERE is_active;
CREATE INDEX idx_dva_vehicle_active ON driver_vehicle_assignments (vehicle_id) WHERE is_active;

-- Списки и фильтры
CREATE INDEX idx_vehicles_status ON vehicles (status);
CREATE INDEX idx_drivers_status  ON drivers (status);
CREATE INDEX idx_orders_status   ON orders (status);

-- Расчёты и назначения по заказу
CREATE INDEX idx_calculations_order ON order_calculations (order_id, calculated_at DESC);
CREATE INDEX idx_assignments_order  ON order_assignments (order_id);

-- История чата по заказу
CREATE INDEX idx_chat_order_time ON chat_messages (order_id, created_at);
