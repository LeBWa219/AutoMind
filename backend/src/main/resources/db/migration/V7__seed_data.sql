-- ============================================================================
-- V7: Начальные тестовые данные (ТЗ 7.5)
-- Профили водителей (ТЗ 7.5): экономичный с низким расходом (id 3), с
-- повышенным расходом (id 4), с чистой историей (id 1), с несколькими ДТП
-- (id 3), со штрафами (id 2), с малым количеством рейсов (id 6).
-- Тестовые данные демонстрируют кейс ТЗ 1.5: самый дешёвый водитель —
-- не лучший кандидат.
-- ============================================================================

-- Автомобили (VIN и госномера уникальны — ТЗ 4.4)
INSERT INTO vehicles (id, registration_number, vin, brand, model, production_year, fuel_type,
                      fuel_consumption_rate, load_capacity, mileage, status) VALUES
    (1, 'А 321 ВС 77', 'X96ZH450H2A3BK501', 'ГАЗ',   'ГАЗель NEXT',   2019, 'DIESEL', 18.50, 3500.00, 184320.0, 'ON_TRIP'),
    (2, 'В 456 МН 50', 'WMA06XZZ7CP012345', 'MAN',   'TGX 18.440',    2021, 'DIESEL', 27.00, 18000.00, 210450.0, 'ACTIVE'),
    (3, 'Е 789 КХ 77', 'ZCFC51B0XH5K12345', 'Iveco', 'Daily',         2018, 'DIESEL', 15.50, 2100.00, 241530.0, 'ACTIVE'),
    (4, 'К 112 ОР 77', 'XTC6520K7P1M77801', 'КамАЗ', '6520',          2017, 'DIESEL', 32.00, 20000.00, 312780.0, 'ACTIVE'),
    (5, 'М 234 УЕ 50', 'KMJHD78BXMC045781', 'Hyundai', 'HD78',        2020, 'DIESEL', 19.00, 4500.00, 98210.0,  'MAINTENANCE'),
    (6, 'Н 567 АК 77', 'XTT315500C0987654', 'Lada',  'Largus фургон', 2016, 'PETROL', 11.00, 800.00,  156900.0, 'INACTIVE');
SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));

-- Водители
INSERT INTO drivers (id, full_name, phone, license_number, license_category,
                     experience_years, employment_date, status) VALUES
    (1, 'Смирнов Пётр Васильевич',        '+7 (916) 243-88-51', '7716 004521', 'C, CE',   12, DATE '2015-04-20', 'AVAILABLE'),
    (2, 'Ковалёв Дмитрий Сергеевич',      '+7 (925) 118-30-24', '7724 051233', 'C, CE',    8, DATE '2017-08-01', 'AVAILABLE'),
    (3, 'Ерёмин Антон Павлович',          '+7 (903) 118-42-76', '7703 330129', 'C, CE',    5, DATE '2021-03-12', 'ON_TRIP'),
    (4, 'Гулиев Рауф Натикович',          '+7 (926) 507-91-08', '7719 774512', 'C, CE',    3, DATE '2022-06-15', 'AVAILABLE'),
    (5, 'Лебедев Игорь Михайлович',       '+7 (901) 335-77-40', '7701 002318', 'B, C, CE', 15, DATE '2010-02-01', 'UNAVAILABLE'),
    (6, 'Мамедов Эльчин Бахадур оглы',    '+7 (985) 614-23-19', '7727 990112', 'C',         1, DATE '2025-09-01', 'AVAILABLE');
SELECT setval('drivers_id_seq', (SELECT MAX(id) FROM drivers));

-- Закрепления: пять активных + одно историческое (водитель 6 ранее водил автомобиль 6)
INSERT INTO driver_vehicle_assignments (driver_id, vehicle_id, assigned_at, unassigned_at, is_active) VALUES
    (1, 1, TIMESTAMP WITH TIME ZONE '2026-01-10 09:00:00', NULL, TRUE),
    (2, 2, TIMESTAMP WITH TIME ZONE '2026-02-15 09:00:00', NULL, TRUE),
    (3, 3, TIMESTAMP WITH TIME ZONE '2025-11-20 09:00:00', NULL, TRUE),
    (4, 4, TIMESTAMP WITH TIME ZONE '2026-03-01 09:00:00', NULL, TRUE),
    (5, 5, TIMESTAMP WITH TIME ZONE '2024-05-10 09:00:00', NULL, TRUE),
    (6, 6, TIMESTAMP WITH TIME ZONE '2025-09-01 09:00:00', TIMESTAMP WITH TIME ZONE '2025-10-20 18:00:00', FALSE);

-- Маршруты с координатами (ТЗ 4.6: последовательность географических координат)
INSERT INTO routes (vehicle_id, route_name, route_coordinates, route_status) VALUES
    (1, 'Москва — Тула (М2)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.4312,"lng":37.5469},{"lat":54.9245,"lng":37.4139},{"lat":54.7071,"lng":37.5566},{"lat":54.1961,"lng":37.6182}]'::jsonb,
     'IN_PROGRESS'),
    (3, 'Москва — Калуга (М3)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.0969,"lng":36.6110},{"lat":54.5138,"lng":36.2612}]'::jsonb,
     'IN_PROGRESS'),
    (2, 'Казань — Самара (М5)',
     '[{"lat":55.7963,"lng":49.1088},{"lat":55.3688,"lng":50.6424},{"lat":53.1959,"lng":50.1002}]'::jsonb,
     'PLANNED'),
    (4, 'Рязань — Воронеж (М4)',
     '[{"lat":54.6269,"lng":39.6916},{"lat":52.8971,"lng":40.4941},{"lat":51.6608,"lng":39.2003}]'::jsonb,
     'FINISHED');

-- История рейсов: 10 завершённых рейсов на водителя (у водителя 6 — только 2,
-- сценарий «недостаточно данных» ТЗ 5.6). Значения детерминированные, без random().
WITH profiles(driver_id, vehicle_id, rate, cnt, base_date) AS (
    VALUES (1::bigint, 1::bigint, 18.50::numeric, 10, DATE '2026-08-16'),
           (2::bigint, 2::bigint, 27.00::numeric, 10, DATE '2026-08-18'),
           (3::bigint, 3::bigint, 15.50::numeric, 10, DATE '2026-08-17'),
           (4::bigint, 4::bigint, 32.00::numeric, 10, DATE '2026-08-20'),
           (5::bigint, 5::bigint, 19.00::numeric, 10, DATE '2026-08-19'),
           (6::bigint, 6::bigint, 11.00::numeric,  2, DATE '2026-10-05')
),
rows AS (
    SELECT
        p.driver_id,
        p.vehicle_id,
        p.rate,
        gs AS n,
        p.base_date,
        ROUND((140 + ((gs * 37 + p.driver_id * 53) % 90))::numeric, 1) AS distance,
        ROUND((140 + ((gs * 37 + p.driver_id * 53) % 90))::numeric, 1)
            / (60 + (p.driver_id % 5) * 2)::numeric AS duration_raw
    FROM profiles p
    CROSS JOIN LATERAL generate_series(1, p.cnt) AS gs
)
INSERT INTO trips (driver_id, vehicle_id, start_location, end_location, distance, duration,
                   fuel_consumption, fuel_cost, total_cost, trip_date, status)
SELECT
    r.driver_id,
    r.vehicle_id,
    (ARRAY['Москва','Тула','Калуга','Рязань','Серпухов'])[1 + ((r.n + r.driver_id * 3) % 5)],
    (ARRAY['Тула','Калуга','Рязань','Воронеж','Липецк'])[1 + ((r.n + r.driver_id * 3) % 5)],
    r.distance,
    ROUND(r.duration_raw, 1),
    ROUND(r.distance * r.rate / 100, 1),
    ROUND(r.distance * r.rate / 100 * 60.00, 2),
    ROUND(r.distance * r.rate / 100 * 60.00 * 1.35 + r.duration_raw * 300.00, 2),
    r.base_date + (r.n * 7 - 7),
    'COMPLETED'
FROM rows r;

-- ДТП и нарушения (виновность отделена от факта — ТЗ 5.8)
INSERT INTO incidents (id, driver_id, vehicle_id, incident_type, description, accident_date, fault_status) VALUES
    (1, 3, 3, 'ACCIDENT',  'ДТП: столкновение на перекрёстке при повороте налево',            DATE '2026-09-18', 'FAULT_FOUND'),
    (2, 3, 3, 'ACCIDENT',  'ДТП: попутное столкновение, виновен второй участник',             DATE '2025-12-05', 'NO_FAULT'),
    (3, 3, 3, 'ACCIDENT',  'ДТП: наезд на препятствие при маневрировании',                    DATE '2025-06-20', 'FAULT_FOUND'),
    (4, 3, 3, 'VIOLATION', 'Превышение скорости на 21 км/ч',                                  DATE '2026-07-03', 'FAULT_FOUND'),
    (5, 3, 3, 'VIOLATION', 'Проезд на запрещающий сигнал светофора',                          DATE '2026-02-14', 'FAULT_FOUND'),
    (6, 2, 2, 'VIOLATION', 'Превышение скорости на 15 км/ч',                                  DATE '2026-08-11', 'FAULT_FOUND'),
    (7, 2, 2, 'VIOLATION', 'Остановка в неположенном месте',                                  DATE '2026-05-02', 'FAULT_FOUND'),
    (8, 4, 4, 'VIOLATION', 'Нарушение режима труда и отдыха',                                 DATE '2026-04-17', 'FAULT_FOUND'),
    (9, 5, 5, 'ACCIDENT',  'ДТП: попутное столкновение, виновен второй участник',             DATE '2026-01-15', 'NO_FAULT');
SELECT setval('incidents_id_seq', (SELECT MAX(id) FROM incidents));

-- Штрафы (в сумме по водителю 3 — 8 000 ₽, из них 3 500 ₽ не оплачены)
INSERT INTO fines (driver_id, vehicle_id, incident_id, amount, description, issued_at, payment_status) VALUES
    (3, 3, 1, 3500.00, 'Штраф ГИБДД в связи с ДТП',                 DATE '2026-09-20', 'UNPAID'),
    (3, 3, 4, 1500.00, 'Штраф ГИБДД: превышение скорости',          DATE '2026-07-04', 'PAID'),
    (3, 3, 5, 1000.00, 'Штраф ГИБДД: проезд на красный',            DATE '2026-02-15', 'PAID'),
    (3, 3, 3, 2000.00, 'Штраф ГИБДД: нарушение правил маневрирования', DATE '2025-06-25', 'PAID'),
    (2, 2, 6, 1500.00, 'Штраф ГИБДД: превышение скорости',          DATE '2026-08-12', 'PAID'),
    (2, 2, 7, 1500.00, 'Штраф ГИБДД: остановка в неположенном месте', DATE '2026-05-03', 'UNPAID'),
    (4, 4, 8, 1500.00, 'Штраф ГИБДД: нарушение режима труда и отдыха', DATE '2026-04-18', 'PAID');

-- Тестовая телеметрия: два согласованных показания на автомобиль
-- (двигатель выключен -> обороты 0; движение -> скорость > 0; ТЗ 4.7)
INSERT INTO telemetry (vehicle_id, latitude, longitude, speed, engine_rpm, engine_temperature,
                       coolant_temperature, fuel_level, fuel_consumption, battery_voltage, battery_ok,
                       mileage, oil_pressure, ignition_status, movement_status, warning, recorded_at) VALUES
    -- v1 ГАЗель: штатное движение по М2
    (1, 55.4312, 37.5469, 55, 1750, 86.0, 83.5, 45.0, 18.1, 12.6, TRUE, 184318.0, 3.4, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (1, 55.4218, 37.5481, 58, 1850, 88.0, 85.0, 44.6, 18.3, 12.6, TRUE, 184320.0, 3.4, TRUE, TRUE,  NULL, now()),
    -- v3 Iveco: движение с перегревом двигателя
    (3, 55.0969, 36.6110, 72, 2050, 92.0, 90.0, 21.5, 16.5, 12.4, TRUE, 241528.0, 3.2, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (3, 55.0871, 36.6234, 74, 2100, 94.0, 92.0, 21.0, 16.8, 12.4, TRUE, 241530.0, 3.2, TRUE, TRUE,  'Перегрев двигателя', now()),
    -- v2 MAN: штатное движение
    (2, 55.3688, 50.6424, 64, 1580, 84.0, 82.0, 58.5, 26.8, 13.1, TRUE, 210448.0, 3.6, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (2, 55.3601, 50.6512, 66, 1600, 85.0, 83.0, 58.0, 27.0, 13.1, TRUE, 210450.0, 3.6, TRUE, TRUE,  NULL, now()),
    -- v4 КамАЗ: стоянка с повышенной температурой двигателя
    (4, 52.8971, 40.4941, 0, 650, 91.0, 88.0, 63.0, 0.0, 13.4, TRUE, 312780.0, 3.1, TRUE, FALSE, 'Повышенная температура двигателя', now() - interval '2 minutes'),
    (4, 52.8971, 40.4941, 0, 640, 93.0, 90.0, 62.8, 0.0, 13.4, TRUE, 312780.0, 3.1, TRUE, FALSE, 'Повышенная температура двигателя', now()),
    -- v5 Hyundai: на обслуживании, двигатель выключен
    (5, 55.7031, 37.4238, 0, 0, 22.0, 20.0, 30.0, 0.0, 12.1, FALSE, 98210.0, 0.0, FALSE, FALSE, 'Техническая неисправность — на обслуживании', now() - interval '2 minutes'),
    (5, 55.7031, 37.4238, 0, 0, 22.0, 20.0, 30.0, 0.0, 12.1, FALSE, 98210.0, 0.0, FALSE, FALSE, 'Техническая неисправность — на обслуживании', now()),
    -- v6 Largus: неактивен
    (6, 55.6812, 37.2918, 0, 0, 18.0, 17.0, 55.0, 0.0, 11.8, TRUE, 156900.0, 0.0, FALSE, FALSE, NULL, now() - interval '2 minutes'),
    (6, 55.6812, 37.2918, 0, 0, 18.0, 17.0, 55.0, 0.0, 11.8, TRUE, 156900.0, 0.0, FALSE, FALSE, NULL, now());
