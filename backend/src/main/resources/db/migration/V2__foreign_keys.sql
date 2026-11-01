-- ============================================================================
-- V2: Связи между таблицами (ТЗ 7.3) — внешние ключи
-- ============================================================================

ALTER TABLE driver_vehicle_assignments
    ADD CONSTRAINT fk_dva_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    ADD CONSTRAINT fk_dva_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE telemetry
    ADD CONSTRAINT fk_telemetry_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE routes
    ADD CONSTRAINT fk_routes_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE trips
    ADD CONSTRAINT fk_trips_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    ADD CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE incidents
    ADD CONSTRAINT fk_incidents_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    ADD CONSTRAINT fk_incidents_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE fines
    ADD CONSTRAINT fk_fines_driver   FOREIGN KEY (driver_id)   REFERENCES drivers(id),
    ADD CONSTRAINT fk_fines_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id),
    ADD CONSTRAINT fk_fines_incident FOREIGN KEY (incident_id) REFERENCES incidents(id);

ALTER TABLE order_calculations
    ADD CONSTRAINT fk_calculations_order   FOREIGN KEY (order_id)   REFERENCES orders(id),
    ADD CONSTRAINT fk_calculations_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    ADD CONSTRAINT fk_calculations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE order_assignments
    ADD CONSTRAINT fk_assignments_order   FOREIGN KEY (order_id)   REFERENCES orders(id),
    ADD CONSTRAINT fk_assignments_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id),
    ADD CONSTRAINT fk_assignments_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

ALTER TABLE chat_messages
    ADD CONSTRAINT fk_chat_user  FOREIGN KEY (user_id)  REFERENCES users(id),
    ADD CONSTRAINT fk_chat_order FOREIGN KEY (order_id) REFERENCES orders(id);
