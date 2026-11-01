-- ============================================================================
-- V6: Тестовый код доступа (ТЗ 7.4, решение п.14)
-- Код: DEMO-2026. В БД хранится только BCrypt-хеш (ТЗ 3.4).
-- ============================================================================

INSERT INTO users (access_code_hash, role, is_active)
VALUES ('$2a$10$tmNMvdkHhPmOmMKFUV7PHuphwBNdAUzt02dY2aef4TTguKqvCHZZi', 'DISPATCHER', TRUE);
