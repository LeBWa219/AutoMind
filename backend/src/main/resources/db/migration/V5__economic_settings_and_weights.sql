-- ============================================================================
-- V5: Тестовые экономические параметры (ТЗ 7.4) и веса критериев оценки
-- (решение п.5: базовый набор по ТЗ 5.8 и набор для хрупкого груза)
-- ============================================================================

INSERT INTO economic_settings (fuel_price, default_fuel_consumption_rate, driver_hourly_rate,
                               maintenance_rate, additional_cost, toll_cost, other_cost)
VALUES (62.50, 20.00, 320.00, 4.20, 0.00, 1250.00, 0.00);

-- Базовый набор весов (ТЗ 5.8: 35 / 25 / 15 / 15 / 10)
INSERT INTO scoring_weights (criterion, weight_percent, cargo_type) VALUES
    ('ECONOMIC',    35, NULL),
    ('ACCIDENT',    25, NULL),
    ('VIOLATION',   15, NULL),
    ('FUEL',        15, NULL),
    ('RELIABILITY', 10, NULL);

-- Набор для хрупкого груза (решение п.5: история ДТП повышена до 35 %)
INSERT INTO scoring_weights (criterion, weight_percent, cargo_type) VALUES
    ('ECONOMIC',    25, 'FRAGILE'),
    ('ACCIDENT',    35, 'FRAGILE'),
    ('VIOLATION',   15, 'FRAGILE'),
    ('FUEL',        10, 'FRAGILE'),
    ('RELIABILITY', 15, 'FRAGILE');
