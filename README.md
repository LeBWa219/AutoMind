# AutoMind

Интеллектуальная информационно-аналитическая система управления транспортными
перевозками — демонстрационный MVP.

Три модуля на едином наборе данных:

1. **Мониторинг транспорта** — карта (Leaflet), автомобили и водители (CRUD),
   симуляция телеметрии GPS/ГЛОНАСС на backend, история рейсов, ДТП и штрафов.
2. **Экономика перевозок** — заказы, расчёт себестоимости, сравнение и
   ранжирование водителей (экономика + эксплуатационный риск), назначение.
3. **AI Logistics Copilot** — чат-помощник (заглушка с шаблонами на основе
   реальных данных расчёта; архитектура под будущую LLM).

## Статус

| Этап (ТЗ §11) | Состояние |
|---|---|
| 1. Анализ существующего проекта | — (старт с нуля) |
| Макет интерфейса | Отменён по решению заказчика — дизайн правится вживую на сайте |
| 2. База данных + миграции | ⏳ далее |
| 3. Авторизация | ⏳ |
| 4. Мониторинг транспорта | ⏳ |
| 5. Экономический модуль | ⏳ |
| 6. AI Logistics Copilot | ⏳ |
| 7. Интеграция и тестирование | ⏳ |

Проектные решения по недочётам ТЗ (палитра, статусы, формулы оценок):
[docs/PROJECT_DECISIONS.md](docs/PROJECT_DECISIONS.md).

## Технологии (ТЗ §8.6)

- Frontend: React + TypeScript, Tailwind CSS, Leaflet, WebSocket
- Backend: Java 21 + Spring Boot *(подтверждается перед стартом этапа 2)*
- БД: PostgreSQL + Flyway-миграции, развёртывание Docker Compose

## Запуск

### База данных (PostgreSQL в Docker)

```bash
docker compose up -d        # PostgreSQL 16 на порту 5434
```

Миграции Flyway применяются автоматически при старте backend. Для ручной
проверки без backend:

```bash
docker run --rm -v "%cd%/backend/src/main/resources/db/migration:/flyway/sql:ro" flyway/flyway:10 ^
  -url="jdbc:postgresql://host.docker.internal:5434/automind" -user=automind -password=automind_dev migrate
```

Порты 5432/5433 на машине разработчика заняты локальным PostgreSQL, поэтому
контейнер публикуется на **5434** (переопределяется переменной `DB_PORT`).

Параметры подключения: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
(дефолты — для локальной разработки, см. `.env.example`).

### Backend (Java 21 + Spring Boot)

```bash
cd backend
./mvnw spring-boot:run        # http://localhost:8080, миграции применяются при старте
```

Сборка исполняемого jar: `./mvnw package -DskipTests`, затем
`java -jar target/backend-0.0.1-SNAPSHOT.jar`.

### Frontend (React + TypeScript + Vite)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173, прокси /api и /ws на backend
```

Требуется запущенный Docker Desktop (PostgreSQL) и backend на 8080.

## Тестовый доступ

Код входа: `DEMO-2026` (проверяется на backend, в БД хранится хеш).
