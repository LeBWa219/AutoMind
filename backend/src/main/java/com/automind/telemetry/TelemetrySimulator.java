package com.automind.telemetry;

import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.automind.fleet.VehicleEntity;
import com.automind.fleet.VehicleRepository;

import jakarta.annotation.PostConstruct;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Симуляция GPS/ГЛОНАСС-телеметрии (ТЗ 4.7).
 *
 * Генерация выполняется на backend (не в браузере), значения логически
 * согласованные: двигатель выключен — обороты 0; движение — скорость > 0;
 * топливо расходуется, пробег растёт, температура меняется плавно.
 * Сценарии демонстрации (ТЗ 4.7): штатное движение, остановка, повышенный
 * расход, перегрев двигателя, низкий уровень топлива, техническая неисправность.
 *
 * Каждые 2 секунды: пересчёт состояния, запись в таблицу telemetry и
 * трансляция подписчикам WebSocket /ws/telemetry.
 */
@Component
public class TelemetrySimulator {

    private static final Logger log = LoggerFactory.getLogger(TelemetrySimulator.class);

    public static final long TICK_MS = 2000;

    private record LatLng(double lat, double lng) {
    }

    /** Сценарии поведения автомобиля в симуляции. */
    private enum Scenario {
        NORMAL,        // штатное движение с циклами «движение/остановка»
        OVERHEAT,      // перегрев двигателя
        HIGH_CONSUMPTION, // повышенный расход топлива
        FAULT,         // техническая неисправность, неактивен
        PARKED_OFF     // неактивен, зажигание выключено
    }

    private static class VehicleState {
        Long vehicleId;
        String status;
        Scenario scenario;
        List<LatLng> route = new ArrayList<>();
        int routeIdx;
        double segmentProgress; // 0..1 внутри сегмента маршрута
        boolean moving;
        long tickInPhase;
        double speed;
        double engineTemp = 20;
        double coolantTemp = 20;
        double fuelLevel = 50;
        double mileage;
        double batteryVoltage = 12.6;
        double oilPressure = 0;
        double consumptionFactor = 1.0;
    }

    private final VehicleRepository vehicleRepository;
    private final RouteRepository routeRepository;
    private final TelemetryRepository telemetryRepository;
    private final TelemetryBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    private final Map<Long, VehicleState> states = new HashMap<>();
    private final Map<Long, TelemetryEntity> latest = new HashMap<>();
    private final Set<Long> knownVehicleIds = new HashSet<>();
    private final AtomicLong tick = new AtomicLong();

    public TelemetrySimulator(VehicleRepository vehicleRepository,
                              RouteRepository routeRepository,
                              TelemetryRepository telemetryRepository,
                              TelemetryBroadcaster broadcaster,
                              ObjectMapper objectMapper) {
        this.vehicleRepository = vehicleRepository;
        this.routeRepository = routeRepository;
        this.telemetryRepository = telemetryRepository;
        this.broadcaster = broadcaster;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        refreshVehicles();
        log.info("Симулятор телеметрии инициализирован: {} автомобилей", states.size());
    }

    /** Актуальные показания по всем автомобилям — для начальной отрисовки и fallback-опроса. */
    public List<TelemetryEntity> latestAll() {
        return latest.values().stream()
                .sorted(java.util.Comparator.comparing(TelemetryEntity::getVehicleId))
                .toList();
    }

    public TelemetryEntity latestForVehicle(Long vehicleId) {
        TelemetryEntity entity = latest.get(vehicleId);
        if (entity != null) {
            return entity;
        }
        return telemetryRepository.findFirstByVehicleIdOrderByRecordedAtDesc(vehicleId).orElse(null);
    }

    @Scheduled(fixedDelay = TICK_MS)
    void tick() {
        long n = tick.incrementAndGet();
        if (n % 5 == 0) {
            refreshVehicles(); // подхватываем новые автомобили без перезапуска
        }
        for (VehicleState state : states.values()) {
            TelemetryEntity entity = simulate(state);
            telemetryRepository.save(entity);
            latest.put(state.vehicleId, entity);
        }
        broadcaster.broadcast(latestAll(), objectMapper);
    }

    /** Загружает автомобили и маршруты; новых добавляет, удалённых не генерирует. */
    private void refreshVehicles() {
        for (VehicleEntity vehicle : vehicleRepository.findAll()) {
            if (knownVehicleIds.contains(vehicle.getId())) {
                continue;
            }
            knownVehicleIds.add(vehicle.getId());
            VehicleState state = new VehicleState();
            state.vehicleId = vehicle.getId();
            state.status = vehicle.getStatus();
            state.scenario = scenarioFor(vehicle);
            state.mileage = vehicle.getMileage().doubleValue();
            routeRepository.findFirstByVehicleId(vehicle.getId())
                    .map(this::parseCoordinates)
                    .ifPresent(state.route::addAll);

            telemetryRepository.findFirstByVehicleIdOrderByRecordedAtDesc(vehicle.getId()).ifPresent(t -> {
                state.fuelLevel = t.getFuelLevel() == null ? 50 : t.getFuelLevel();
                state.engineTemp = t.getEngineTemperature() == null ? 20 : t.getEngineTemperature();
                state.coolantTemp = t.getCoolantTemperature() == null ? state.engineTemp : t.getCoolantTemperature();
                state.batteryVoltage = t.getBatteryVoltage() == null ? 12.6 : t.getBatteryVoltage();
                state.mileage = t.getMileage();
            });

            switch (state.scenario) {
                case NORMAL -> state.moving = true;
                case OVERHEAT, HIGH_CONSUMPTION -> {
                    state.moving = true;
                    state.fuelLevel = Math.min(state.fuelLevel, 22); // скоро сработает «низкий уровень топлива»
                }
                case FAULT -> {
                    state.moving = false;
                    state.fuelLevel = Math.min(state.fuelLevel, 30);
                    state.batteryVoltage = Math.min(state.batteryVoltage, 12.1);
                }
                case PARKED_OFF -> state.moving = false;
            }
            states.put(vehicle.getId(), state);
        }
    }

    private Scenario scenarioFor(VehicleEntity vehicle) {
        return switch (vehicle.getStatus()) {
            case "MAINTENANCE" -> Scenario.FAULT;
            case "INACTIVE" -> Scenario.PARKED_OFF;
            default -> vehicle.getId() % 3 == 0 ? Scenario.OVERHEAT
                    : vehicle.getId() % 3 == 1 ? Scenario.HIGH_CONSUMPTION
                    : Scenario.NORMAL;
        };
    }

    /** Один шаг симуляции для автомобиля. */
    private TelemetryEntity simulate(VehicleState s) {
        s.tickInPhase++;
        double tickHours = TICK_MS / 3_600_000.0;
        boolean engineOn = s.scenario != Scenario.FAULT && s.scenario != Scenario.PARKED_OFF;

        // Циклы «движение / остановка»: двигатель работает и на стоянке (прогрев/холостой ход)
        if (engineOn) {
            int phaseLength = s.scenario == Scenario.NORMAL ? 45 : 60; // тиков в фазе движения
            int parkLength = 15;
            if (s.moving && s.tickInPhase >= phaseLength) {
                s.moving = false;
                s.tickInPhase = 0;
            } else if (!s.moving && s.tickInPhase >= parkLength) {
                s.moving = true;
                s.tickInPhase = 0;
            }
        } else {
            s.moving = false;
        }

        // Скорость: базовая по автомобилю + плавное колебание + шум
        double baseSpeed = 58 + (s.vehicleId * 7) % 18;
        double targetSpeed = s.moving ? baseSpeed + 4 * Math.sin(s.tickInPhase / 5.0) : 0;
        s.speed = Math.max(0, s.speed + (targetSpeed - s.speed) * 0.4 + (s.moving ? (Math.random() - 0.5) : 0));
        if (s.moving && s.speed < 20) {
            s.speed = 20; // после остановки плавный разгон
        }
        s.speed = round1(s.speed);
        boolean movement = s.moving && s.speed > 0;

        double distanceKm = s.speed * tickHours;

        // Позиция вдоль маршрута
        if (movement && s.route.size() >= 2) {
            advanceAlongRoute(s, distanceKm);
        }

        // Температура двигателя: плавное стремление к целевой
        double targetTemp;
        if (!engineOn) {
            targetTemp = 20;
        } else if (s.scenario == Scenario.OVERHEAT) {
            targetTemp = 94 + 1.5 * Math.sin(s.tickInPhase / 8.0);
        } else if (!s.moving && s.scenario == Scenario.HIGH_CONSUMPTION) {
            targetTemp = 92;
        } else {
            targetTemp = 86 + 1.5 * Math.sin(s.tickInPhase / 7.0);
        }
        s.engineTemp = clamp(s.engineTemp + (targetTemp - s.engineTemp) * 0.06 + (Math.random() - 0.5) * 0.2, 18, 99);
        s.coolantTemp = s.engineTemp - 2.5;

        // Расход топлива: норматив автомобиля с отклонением по сценарию
        double nominalRate = nominalRate(s.vehicleId);
        if (s.scenario == Scenario.HIGH_CONSUMPTION) {
            s.consumptionFactor = clamp(s.consumptionFactor + 0.002, 0.95, 1.28);
        } else {
            s.consumptionFactor = clamp(s.consumptionFactor + (1.0 - s.consumptionFactor) * 0.02, 0.95, 1.28);
        }
        double consumption = movement ? round1(nominalRate * s.consumptionFactor) : 0.0;

        // Топливо и пробег
        double tankLiters = 80;
        if (movement) {
            double liters = distanceKm * nominalRate * s.consumptionFactor / 100.0;
            s.fuelLevel = Math.max(0, s.fuelLevel - liters / tankLiters * 100);
            s.mileage += distanceKm;
        }
        s.mileage = round1(s.mileage);

        // Электрика и давление масла
        double targetVoltage = engineOn ? (movement ? 13.9 : 12.8) : Math.max(11.6, s.batteryVoltage - 0.001);
        s.batteryVoltage = round1(clamp(s.batteryVoltage + (targetVoltage - s.batteryVoltage) * 0.05
                + (Math.random() - 0.5) * 0.02, 11.5, 14.3));
        s.oilPressure = engineOn ? round1(clamp(3.0 + s.speed / 100.0 + (Math.random() - 0.5) * 0.1, 0.5, 4.5)) : 0.0;

        // Предупреждения по критическим значениям (ТЗ 4.7)
        List<String> warnings = new ArrayList<>();
        if (s.scenario == Scenario.FAULT) {
            warnings.add("Техническая неисправность — на обслуживании");
        } else {
            if (s.engineTemp > 92) {
                warnings.add("Перегрев двигателя");
            }
            if (s.fuelLevel < 20) {
                warnings.add("Низкий уровень топлива");
            }
            if (s.batteryVoltage < 11.8) {
                warnings.add("Разряд аккумулятора");
            }
        }
        String warning = warnings.isEmpty() ? null : String.join("; ", warnings);

        TelemetryEntity entity = new TelemetryEntity();
        entity.setVehicleId(s.vehicleId);
        if (movement && s.route.size() >= 2) {
            LatLng pos = currentPosition(s);
            entity.setLatitude(round6(pos.lat()));
            entity.setLongitude(round6(pos.lng()));
        } else if (s.route.size() >= 2) {
            LatLng pos = currentPosition(s);
            entity.setLatitude(round6(pos.lat()));
            entity.setLongitude(round6(pos.lng()));
        } else {
            // Без маршрута — стоянка на условной точке Москвы
            entity.setLatitude(55.7558 + (s.vehicleId % 5) * 0.01);
            entity.setLongitude(37.6173 + (s.vehicleId % 7) * 0.01);
        }
        entity.setSpeed(s.speed);
        entity.setEngineRpm(engineOn
                ? (int) Math.round(movement ? 900 + s.speed * 12 + Math.random() * 60
                : 640 + Math.random() * 80)
                : 0);
        entity.setEngineTemperature(round1(s.engineTemp));
        entity.setCoolantTemperature(round1(s.coolantTemp));
        entity.setFuelLevel(round1(s.fuelLevel));
        entity.setFuelConsumption(consumption);
        entity.setBatteryVoltage(s.batteryVoltage);
        entity.setBatteryOk(s.scenario != Scenario.FAULT && s.batteryVoltage >= 11.8);
        entity.setMileage(s.mileage);
        entity.setOilPressure(s.oilPressure);
        entity.setIgnitionStatus(engineOn);
        entity.setMovementStatus(movement);
        entity.setWarning(warning);
        entity.setRecordedAt(OffsetDateTime.now());
        return entity;
    }

    /** Нормативный расход: из БД берётся при старте через vehicle; здесь — согласованная аппроксимация. */
    private final Map<Long, Double> nominalRates = new HashMap<>();

    private double nominalRate(Long vehicleId) {
        return nominalRates.computeIfAbsent(vehicleId, id ->
                vehicleRepository.findById(id)
                        .map(v -> v.getFuelConsumptionRate().doubleValue())
                        .orElse(20.0));
    }

    private void advanceAlongRoute(VehicleState s, double distanceKm) {
        double dist = distanceKm;
        while (dist > 0) {
            int next = (s.routeIdx + 1) % s.route.size();
            LatLng a = s.route.get(s.routeIdx);
            LatLng b = s.route.get(next);
            double segmentKm = haversineKm(a, b);
            double remaining = (1 - s.segmentProgress) * segmentKm;
            if (dist < remaining) {
                s.segmentProgress += dist / segmentKm;
                dist = 0;
            } else {
                dist -= remaining;
                s.routeIdx = next;
                s.segmentProgress = 0;
            }
        }
    }

    private LatLng currentPosition(VehicleState s) {
        LatLng a = s.route.get(s.routeIdx);
        int next = (s.routeIdx + 1) % s.route.size();
        LatLng b = s.route.get(next);
        double p = Math.min(1, Math.max(0, s.segmentProgress));
        return new LatLng(a.lat() + (b.lat() - a.lat()) * p, a.lng() + (b.lng() - a.lng()) * p);
    }

    private List<LatLng> parseCoordinates(com.automind.telemetry.RouteEntity route) {
        try {
            List<LatLng> points = new ArrayList<>();
            var root = objectMapper.readTree(route.getRouteCoordinates());
            if (root.isArray()) {
                root.forEach(node -> points.add(new LatLng(
                        node.path("lat").asDouble(),
                        node.path("lng").asDouble())));
            }
            return points;
        } catch (Exception e) {
            log.warn("Не удалось разобрать координаты маршрута {}: {}", route.getId(), e.getMessage());
            return List.of();
        }
    }

    private static double haversineKm(LatLng a, LatLng b) {
        double earthKm = 6371.0;
        double dLat = Math.toRadians(b.lat() - a.lat());
        double dLng = Math.toRadians(b.lng() - a.lng());
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(a.lat())) * Math.cos(Math.toRadians(b.lat()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * earthKm * Math.asin(Math.sqrt(h));
    }

    private static double clamp(double v, double min, double max) {
        return Math.min(max, Math.max(min, v));
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double round6(double v) {
        return Math.round(v * 1_000_000) / 1_000_000.0;
    }
}
