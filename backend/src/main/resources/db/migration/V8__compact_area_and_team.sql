-- ============================================================================
-- V8: Компактная зона перевозок (Московская область) и расширение команды
-- до 15 водителей для отработки разных сценариев (запрос заказчика).
--
-- Все маршруты — в пределах Московской области, чтобы мониторинг показывал
-- весь автопарк в одном виде. Рейсы, маршруты и телеметрия пересобираются
-- под новые короткие плечи (25–130 км).
-- ============================================================================

-- 1. Новые автомобили (+4, всего 10)
INSERT INTO vehicles (id, registration_number, vin, brand, model, production_year, fuel_type,
                      fuel_consumption_rate, load_capacity, mileage, status) VALUES
    (7,  'О 777 ОО 77', 'Z8M45678901234567', 'ГАЗ',           'ГАЗон NEXT',  2021, 'DIESEL', 16.00, 5000.00,  88400.0,  'ACTIVE'),
    (8,  'Т 888 ТТ 77', 'WDB9340321L456789', 'Mercedes-Benz', 'Sprinter',    2022, 'DIESEL', 13.50, 3200.00,  45200.0,  'ACTIVE'),
    (9,  'У 999 УУ 50', 'XTC4321K8P9M77123', 'КамАЗ',         '5490',        2020, 'DIESEL', 28.00, 17500.00, 265300.0, 'ON_TRIP'),
    (10, 'А 400 АА 77', 'X96ZH450H3B4CL602', 'ГАЗ',           'ГАЗель NEXT', 2023, 'DIESEL', 17.00, 3500.00,  21300.0,  'ACTIVE');
SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));

-- 2. Новые водители (+9, всего 15) — сценарии:
--    7 Соколов (экономичный, чистая история), 8 Волков (чистая история),
--    9 Романов (ДТП по вине + в рейсе), 10 Зайцев (без закреплённого ТС),
--    11 Белов (недоступен), 12 Морозова (опытный водитель, авто),
--    13 Орлов (мало истории — 3 рейса), 14 Ким (без истории — 0 рейсов),
--    15 Данилов (мало истории — 2 рейса, историческое закрепление за Largus).
INSERT INTO drivers (id, full_name, phone, license_number, license_category,
                     experience_years, employment_date, status) VALUES
    (7,  'Соколов Артём Игоревич',   '+7 (916) 720-14-38', '7716 220914', 'C, CE',    9,  DATE '2017-05-15', 'AVAILABLE'),
    (8,  'Волков Сергей Николаевич', '+7 (925) 441-27-93', '7725 114206', 'C, CE',    11, DATE '2014-11-03', 'AVAILABLE'),
    (9,  'Романов Михаил Андреевич', '+7 (909) 385-62-17', '7709 881275', 'C, CE',    6,  DATE '2019-07-22', 'ON_TRIP'),
    (10, 'Зайцев Павел Олегович',    '+7 (926) 903-55-41', '7726 407913', 'C',        4,  DATE '2022-09-12', 'AVAILABLE'),
    (11, 'Белов Кирилл Дмитриевич',  '+7 (915) 266-81-04', '7715 663208', 'C, CE',    7,  DATE '2018-04-19', 'UNAVAILABLE'),
    (12, 'Морозова Елена Викторовна','+7 (903) 512-97-86', '7703 995142', 'B, C',     8,  DATE '2017-01-30', 'AVAILABLE'),
    (13, 'Орлов Никита Максимович',  '+7 (926) 174-38-52', '7726 731809', 'B, C',     2,  DATE '2024-06-10', 'AVAILABLE'),
    (14, 'Ким Виктор Сергеевич',     '+7 (916) 845-20-63', '7716 550217', 'C',        3,  DATE '2023-02-14', 'AVAILABLE'),
    (15, 'Данилов Егор Алексеевич',  '+7 (985) 306-74-29', '7725 812604', 'B, C',     1,  DATE '2025-05-05', 'AVAILABLE');
SELECT setval('drivers_id_seq', (SELECT MAX(id) FROM drivers));

-- 3. Закрепления: 7→7, 8→8, 9→9, 12→10 активные; 13→6 историческое
INSERT INTO driver_vehicle_assignments (driver_id, vehicle_id, assigned_at, unassigned_at, is_active) VALUES
    (7,  7, TIMESTAMP WITH TIME ZONE '2026-02-01 09:00:00', NULL, TRUE),
    (8,  8, TIMESTAMP WITH TIME ZONE '2026-01-20 09:00:00', NULL, TRUE),
    (9,  9, TIMESTAMP WITH TIME ZONE '2025-12-01 09:00:00', NULL, TRUE),
    (12, 10, TIMESTAMP WITH TIME ZONE '2026-03-10 09:00:00', NULL, TRUE),
    (13, 6, TIMESTAMP WITH TIME ZONE '2025-09-01 09:00:00', TIMESTAMP WITH TIME ZONE '2025-12-15 18:00:00', FALSE);

-- 4. Маршруты в пределах Московской области
DELETE FROM telemetry;
DELETE FROM routes;
INSERT INTO routes (vehicle_id, route_name, route_coordinates, route_status) VALUES
    (1, 'Москва — Подольск (Симферопольское ш.)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.6155,"lng":37.6046},{"lat":55.5479,"lng":37.6083},{"lat":55.4312,"lng":37.5469}]'::jsonb,
     'IN_PROGRESS'),
    (2, 'Москва — Коломна (Новорязанское ш.)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.6758,"lng":37.8946},{"lat":55.4181,"lng":38.8639},{"lat":55.0794,"lng":38.7783}]'::jsonb,
     'PLANNED'),
    (3, 'Москва — Домодедово (Каширское ш.)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.6329,"lng":37.8492},{"lat":55.4373,"lng":37.7526}]'::jsonb,
     'IN_PROGRESS'),
    (9, 'Москва — Бронницы (Новорязанское ш.)',
     '[{"lat":55.7558,"lng":37.6173},{"lat":55.6758,"lng":37.8946},{"lat":55.4181,"lng":38.8639}]'::jsonb,
     'IN_PROGRESS'),
    (10, 'Одинцово — Наро-Фоминск (Минское ш.)',
     '[{"lat":55.6789,"lng":37.2634},{"lat":55.5247,"lng":37.2753},{"lat":55.3867,"lng":36.7331}]'::jsonb,
     'FINISHED');

-- 5. История рейсов: короткие плечи по Московской области (25–130 км)
--    У водителей 13 и 15 — мало истории (сценарий «недостаточно данных», ТЗ 5.6)
DELETE FROM trips;
WITH profiles(driver_id, vehicle_id, rate, cnt, base_date) AS (
    VALUES (1::bigint, 1::bigint, 18.50::numeric, 10, DATE '2026-08-16'),
           (2::bigint, 2::bigint, 27.00::numeric, 10, DATE '2026-08-18'),
           (3::bigint, 3::bigint, 15.50::numeric, 10, DATE '2026-08-17'),
           (4::bigint, 4::bigint, 32.00::numeric, 10, DATE '2026-08-20'),
           (5::bigint, 5::bigint, 19.00::numeric, 10, DATE '2026-08-19'),
           (6::bigint, 6::bigint, 11.00::numeric,  2, DATE '2026-10-05'),
           (7::bigint, 7::bigint, 16.00::numeric, 10, DATE '2026-08-21'),
           (8::bigint, 8::bigint, 13.50::numeric, 10, DATE '2026-08-23'),
           (9::bigint, 9::bigint, 28.00::numeric, 10, DATE '2026-08-22'),
           (12::bigint, 10::bigint, 17.00::numeric, 10, DATE '2026-08-25'),
           (13::bigint, 6::bigint, 11.00::numeric,  3, DATE '2026-10-08'),
           (15::bigint, 6::bigint, 11.00::numeric,  2, DATE '2026-10-12')
),
rows AS (
    SELECT
        p.driver_id,
        p.vehicle_id,
        p.rate,
        gs AS n,
        p.base_date,
        ROUND((25 + ((gs * 17 + p.driver_id * 29) % 100))::numeric, 1) AS distance,
        ROUND((25 + ((gs * 17 + p.driver_id * 29) % 100))::numeric, 1)
            / (55 + (p.driver_id % 4) * 3)::numeric AS duration_raw
    FROM profiles p
    CROSS JOIN LATERAL generate_series(1, p.cnt) AS gs
)
INSERT INTO trips (driver_id, vehicle_id, start_location, end_location, distance, duration,
                   fuel_consumption, fuel_cost, total_cost, trip_date, status)
SELECT
    r.driver_id,
    r.vehicle_id,
    (ARRAY['Москва','Подольск','Люберцы','Домодедово','Одинцово','Климовск','Видное','Щербинка','Дзержинский','Лыткарино'])[1 + ((r.n + r.driver_id * 2) % 10)],
    (ARRAY['Подольск','Климовск','Дзержинский','Видное','Наро-Фоминск','Щербинка','Лыткарино','Домодедово','Бронницы','Москва'])[1 + ((r.n + r.driver_id * 2) % 10)],
    r.distance,
    ROUND(r.duration_raw, 1),
    ROUND(r.distance * r.rate / 100, 1),
    ROUND(r.distance * r.rate / 100 * 60.00, 2),
    ROUND(r.distance * r.rate / 100 * 60.00 * 1.35 + r.duration_raw * 300.00, 2),
    r.base_date + (r.n * 7 - 7),
    'COMPLETED'
FROM rows r;

-- 6. ДТП и нарушения новых водителей
INSERT INTO incidents (id, driver_id, vehicle_id, incident_type, description, accident_date, fault_status) VALUES
    (10, 9, 9, 'ACCIDENT',  'ДТП: касательное столкновение при перестроении', DATE '2026-10-05', 'FAULT_FOUND'),
    (11, 9, 9, 'VIOLATION', 'Стоянка в неположенном месте',                   DATE '2026-08-19', 'FAULT_FOUND');
SELECT setval('incidents_id_seq', (SELECT MAX(id) FROM incidents));

INSERT INTO fines (driver_id, vehicle_id, incident_id, amount, description, issued_at, payment_status) VALUES
    (9, 9, 10, 2000.00, 'Штраф ГИБДД в связи с ДТП',        DATE '2026-10-06', 'PAID'),
    (9, 9, 11, 1000.00, 'Штраф ГИБДД: стоянка в неположенном месте', DATE '2026-08-20', 'PAID');

-- 7. Тестовая телеметрия: два согласованных показания на автомобиль,
--    координаты в пределах Московской области
INSERT INTO telemetry (vehicle_id, latitude, longitude, speed, engine_rpm, engine_temperature,
                       coolant_temperature, fuel_level, fuel_consumption, battery_voltage, battery_ok,
                       mileage, oil_pressure, ignition_status, movement_status, warning, recorded_at) VALUES
    -- v1 ГАЗель: движение по Симферопольскому шоссе
    (1, 55.5479, 37.6083, 46, 1650, 86.0, 83.5, 62.0, 18.2, 12.6, TRUE, 184318.0, 3.4, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (1, 55.5392, 37.6012, 48, 1700, 88.0, 85.0, 61.6, 18.4, 12.6, TRUE, 184320.0, 3.4, TRUE, TRUE,  NULL, now()),
    -- v2 MAN: на складе, ожидает рейса
    (2, 55.6500, 37.6200, 0, 0, 24.0, 22.0, 58.0, 0.0, 12.9, TRUE, 210448.0, 0.0, FALSE, FALSE, NULL, now() - interval '2 minutes'),
    (2, 55.6500, 37.6200, 0, 0, 24.0, 22.0, 58.0, 0.0, 12.9, TRUE, 210450.0, 0.0, FALSE, FALSE, NULL, now()),
    -- v3 Iveco: движение по Каширскому шоссе
    (3, 55.5547, 37.7786, 52, 1900, 86.0, 83.0, 64.0, 15.2, 12.4, TRUE, 241528.0, 3.2, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (3, 55.5438, 37.7712, 54, 1950, 88.0, 85.0, 63.5, 15.4, 12.4, TRUE, 241530.0, 3.2, TRUE, TRUE,  NULL, now()),
    -- v4 КамАЗ: стоянка с перегревом двигателя
    (4, 55.4002, 37.5518, 0, 660, 91.0, 88.0, 70.0, 0.0, 13.4, TRUE, 312780.0, 3.1, TRUE, FALSE, 'Повышенная температура двигателя', now() - interval '2 minutes'),
    (4, 55.4002, 37.5518, 0, 650, 93.0, 90.0, 69.8, 0.0, 13.4, TRUE, 312780.0, 3.1, TRUE, FALSE, 'Повышенная температура двигателя', now()),
    -- v5 Hyundai: на обслуживании
    (5, 55.7031, 37.4238, 0, 0, 22.0, 20.0, 30.0, 0.0, 12.1, FALSE, 98210.0, 0.0, FALSE, FALSE, 'Техническая неисправность — на обслуживании', now() - interval '2 minutes'),
    (5, 55.7031, 37.4238, 0, 0, 22.0, 20.0, 30.0, 0.0, 12.1, FALSE, 98210.0, 0.0, FALSE, FALSE, 'Техническая неисправность — на обслуживании', now()),
    -- v6 Largus: неактивен
    (6, 55.6812, 37.2918, 0, 0, 18.0, 17.0, 55.0, 0.0, 11.8, TRUE, 156900.0, 0.0, FALSE, FALSE, NULL, now() - interval '2 minutes'),
    (6, 55.6812, 37.2918, 0, 0, 18.0, 17.0, 55.0, 0.0, 11.8, TRUE, 156900.0, 0.0, FALSE, FALSE, NULL, now()),
    -- v7 ГАЗон: движение по МКАД
    (7, 55.6001, 37.6205, 50, 1500, 85.0, 82.5, 66.0, 16.1, 12.7, TRUE, 88398.0, 3.5, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (7, 55.5923, 37.6188, 52, 1550, 87.0, 84.0, 65.5, 16.3, 12.7, TRUE, 88400.0, 3.5, TRUE, TRUE,  NULL, now()),
    -- v8 Sprinter: стоянка в Видном, заведён
    (8, 55.5527, 37.7068, 0, 700, 78.0, 75.0, 74.0, 0.0, 13.0, TRUE, 45200.0, 3.0, TRUE, FALSE, NULL, now() - interval '2 minutes'),
    (8, 55.5527, 37.7068, 0, 690, 79.0, 76.0, 73.8, 0.0, 13.0, TRUE, 45200.0, 3.0, TRUE, FALSE, NULL, now()),
    -- v9 КамАЗ: движение по Новорязанскому шоссе
    (9, 55.6241, 37.9410, 66, 1750, 88.0, 85.0, 60.0, 27.6, 13.2, TRUE, 265298.0, 3.3, TRUE, TRUE,  NULL, now() - interval '2 minutes'),
    (9, 55.6118, 37.9666, 68, 1800, 90.0, 87.0, 59.4, 27.9, 13.2, TRUE, 265300.0, 3.3, TRUE, TRUE,  NULL, now()),
    -- v10 ГАЗель NEXT: окончила рейс, Наро-Фоминск
    (10, 55.3867, 36.7331, 0, 0, 30.0, 28.0, 80.0, 0.0, 12.8, TRUE, 21300.0, 0.0, FALSE, FALSE, NULL, now() - interval '2 minutes'),
    (10, 55.3867, 36.7331, 0, 0, 30.0, 28.0, 80.0, 0.0, 12.8, TRUE, 21300.0, 0.0, FALSE, FALSE, NULL, now());
