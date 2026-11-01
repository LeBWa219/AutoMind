package com.automind.order;

import com.automind.common.ApiException;
import com.automind.economy.EconomicSettingEntity;
import com.automind.economy.EconomicSettingRepository;
import com.automind.fleet.DriverEntity;
import com.automind.fleet.DriverRepository;
import com.automind.fleet.DriverVehicleAssignmentRepository;
import com.automind.fleet.VehicleEntity;
import com.automind.fleet.VehicleRepository;
import com.automind.trip.FineEntity;
import com.automind.trip.FineRepository;
import com.automind.trip.IncidentEntity;
import com.automind.trip.IncidentRepository;
import com.automind.trip.TripEntity;
import com.automind.trip.TripRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Экономический анализ перевозок (ТЗ разд. 5).
 *
 * Расчёт себестоимости — только на backend, на BigDecimal (ТЗ 5.5.6).
 * Оценка водителей — два уровня (ТЗ 5.8): отсев по объективным ограничениям,
 * затем нормализованное ранжирование с весами из БД (решение п.5).
 * Снимок параметров сохраняется в каждой строке расчёта (ТЗ 5.10).
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final int TRIPS_WINDOW = 10;

    private final OrderRepository orderRepository;
    private final OrderCalculationRepository calculationRepository;
    private final OrderAssignmentRepository assignmentRepository;
    private final ScoringWeightRepository weightRepository;
    private final DriverRepository driverRepository;
    private final DriverVehicleAssignmentRepository fleetAssignmentRepository;
    private final VehicleRepository vehicleRepository;
    private final TripRepository tripRepository;
    private final IncidentRepository incidentRepository;
    private final FineRepository fineRepository;
    private final EconomicSettingRepository economicSettingRepository;
    private final ObjectMapper objectMapper;

    public OrderService(OrderRepository orderRepository,
                        OrderCalculationRepository calculationRepository,
                        OrderAssignmentRepository assignmentRepository,
                        ScoringWeightRepository weightRepository,
                        DriverRepository driverRepository,
                        DriverVehicleAssignmentRepository fleetAssignmentRepository,
                        VehicleRepository vehicleRepository,
                        TripRepository tripRepository,
                        IncidentRepository incidentRepository,
                        FineRepository fineRepository,
                        EconomicSettingRepository economicSettingRepository,
                        ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.calculationRepository = calculationRepository;
        this.assignmentRepository = assignmentRepository;
        this.weightRepository = weightRepository;
        this.driverRepository = driverRepository;
        this.fleetAssignmentRepository = fleetAssignmentRepository;
        this.vehicleRepository = vehicleRepository;
        this.tripRepository = tripRepository;
        this.incidentRepository = incidentRepository;
        this.fineRepository = fineRepository;
        this.economicSettingRepository = economicSettingRepository;
        this.objectMapper = objectMapper;
    }

    // --- DTO -----------------------------------------------------------------

    public record OrderUpsertRequest(
            @jakarta.validation.constraints.NotBlank(message = "Укажите название заказа") String orderName,
            @jakarta.validation.constraints.NotBlank(message = "Укажите тип груза") String cargoType,
            String cargoDescription,
            @jakarta.validation.constraints.NotNull(message = "Укажите массу груза")
            @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Масса груза должна быть больше нуля")
            BigDecimal cargoWeight,
            BigDecimal cargoVolume,
            @jakarta.validation.constraints.NotNull(message = "Укажите, хрупкий ли груз")
            Boolean isFragile,
            String specialConditions,
            @jakarta.validation.constraints.NotBlank(message = "Укажите начальный адрес") String origin,
            @jakarta.validation.constraints.NotBlank(message = "Укажите конечный адрес") String destination,
            @jakarta.validation.constraints.NotNull(message = "Не указано расстояние маршрута")
            @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Не указано расстояние маршрута")
            BigDecimal loadedDistance,
            @jakarta.validation.constraints.NotNull(message = "Укажите дополнительный пробег или 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Дополнительный пробег не может быть отрицательным")
            BigDecimal emptyDistance,
            @jakarta.validation.constraints.NotNull(message = "Укажите плановое время")
            @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Плановое время должно быть больше нуля")
            BigDecimal plannedDuration,
            @jakarta.validation.constraints.NotNull(message = "Укажите стоимость перевозки")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Стоимость перевозки не может быть отрицательной")
            BigDecimal revenue) {
    }

    /** Экономические параметры расчёта. Пустое поле не равно нулю — все значения обязательны (ТЗ 5.3.3). */
    public record EconomicParams(
            @jakarta.validation.constraints.NotNull(message = "Не задана стоимость топлива")
            @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Не задана стоимость топлива")
            BigDecimal fuelPrice,
            @jakarta.validation.constraints.NotNull(message = "Укажите оплату труда водителя или 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Оплата труда не может быть отрицательной")
            BigDecimal driverHourlyRate,
            @jakarta.validation.constraints.NotNull(message = "Укажите стоимость обслуживания или 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Стоимость обслуживания не может быть отрицательной")
            BigDecimal maintenanceRate,
            @jakarta.validation.constraints.NotNull(message = "Заполните дополнительные расходы или укажите 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Дополнительные расходы не могут быть отрицательными")
            BigDecimal additionalCost,
            @jakarta.validation.constraints.NotNull(message = "Укажите стоимость платных дорог или 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Стоимость платных дорог не может быть отрицательной")
            BigDecimal tollCost,
            @jakarta.validation.constraints.NotNull(message = "Укажите прочие расходы или 0")
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Прочие расходы не могут быть отрицательными")
            BigDecimal otherCost) {
    }

    public record CalculateRequest(@jakarta.validation.Valid EconomicParams params) {
    }

    public record AssignRequest(@jakarta.validation.constraints.NotNull(message = "Укажите водителя") Long driverId) {
    }

    public enum CandidateStatus {
        AVAILABLE, UNAVAILABLE, EXCLUDED
    }

    public record CandidateDto(
            Long driverId, String driverName, Long vehicleId, String vehicleLabel,
            CandidateStatus status, String statusReason,
            BigDecimal fuelCost, BigDecimal driverCost, BigDecimal maintenanceCost,
            BigDecimal tollCost, BigDecimal additionalCost, BigDecimal otherCost,
            BigDecimal totalCost, BigDecimal revenue, BigDecimal profit, BigDecimal profitability,
            BigDecimal riskScore, BigDecimal totalScore, boolean insufficientData,
            int faultAccidents, int violations, BigDecimal finesTotal, String comment,
            Map<String, Double> criteria) {
    }

    public record OrderDto(Long id, String orderName, String cargoType, String cargoDescription,
                           BigDecimal cargoWeight, BigDecimal cargoVolume, boolean isFragile,
                           String specialConditions, String origin, String destination,
                           BigDecimal loadedDistance, BigDecimal emptyDistance, BigDecimal plannedDuration,
                           BigDecimal revenue, String status,
                           java.time.OffsetDateTime createdAt,
                           AssignedDriverInfo assignedDriver) {
    }

    public record AssignedDriverInfo(Long driverId, String driverName, Long vehicleId, String vehicleLabel,
                                     OffsetDateTime assignedAt) {
    }

    public record AnalysisDto(Long orderId, String status, BigDecimal revenue,
                              List<CandidateDto> candidates, Long bestCandidateId,
                              OffsetDateTime calculatedAt) {
    }

    public record HistoryEvent(OffsetDateTime at, String type, String description) {
    }

    // --- CRUD заказов --------------------------------------------------------

    @Transactional
    public OrderDto create(OrderUpsertRequest request) {
        validateCargoType(request.cargoType());
        OrderEntity order = new OrderEntity();
        applyUpsert(order, request);
        order.setStatus("NEW");
        orderRepository.save(order);
        log.info("Создан заказ №{} «{}»", order.getId(), order.getOrderName());
        return toDto(order);
    }

    @Transactional
    public OrderDto update(Long id, OrderUpsertRequest request) {
        OrderEntity order = requireOrder(id);
        if (List.of("ASSIGNED", "IN_PROGRESS", "COMPLETED").contains(order.getStatus())) {
            throw ApiException.badRequest("Нельзя редактировать заказ, на который уже назначен водитель");
        }
        validateCargoType(request.cargoType());
        applyUpsert(order, request);
        calculationRepository.deleteByOrderId(id); // параметры изменились — прежние расчёты недействительны
        order.setStatus("NEW");
        return toDto(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDto> listAll() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public OrderDto get(Long id) {
        return toDto(requireOrder(id));
    }

    @Transactional
    public void delete(Long id) {
        OrderEntity order = requireOrder(id);
        if (assignmentRepository.findByOrderIdAndAssignmentStatus(id, "ACTIVE").isPresent()) {
            throw ApiException.badRequest("Нельзя удалить заказ с активным назначением");
        }
        calculationRepository.deleteByOrderId(id);
        orderRepository.delete(order);
    }

    // --- Расчёт (ТЗ 5.5–5.9) ---------------------------------------------------

    /**
     * Полный расчёт: себестоимость по каждому подходящему водителю,
     * нормализация оценок, сохранение снимка параметров.
     */
    @Transactional
    public AnalysisDto calculate(Long orderId, EconomicParams params) {
        OrderEntity order = requireOrder(orderId);
        if (order.getRevenue().compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("Укажите стоимость перевозки: при нулевой выручке рентабельность не рассчитывается");
        }

        // Повторный расчёт отменяет активное назначение? Нет: заказ с назначением пересчитывать нельзя.
        if (assignmentRepository.findByOrderIdAndAssignmentStatus(orderId, "ACTIVE").isPresent()) {
            throw ApiException.badRequest("На заказ уже назначен водитель — пересчёт недоступен");
        }
        calculationRepository.deleteByOrderId(orderId);

        BigDecimal totalDistance = order.getLoadedDistance().add(order.getEmptyDistance());
        List<DriverEntity> drivers = driverRepository.findAll();

        // --- Уровень 1. Отсев ограничений (ТЗ 5.8) ---
        List<Candidate> evaluated = new ArrayList<>();
        for (DriverEntity driver : drivers) {
            Candidate c = evaluateCandidate(order, driver, params, totalDistance);
            evaluated.add(c);
        }

        // --- Уровень 2. Ранжирование: нормализация 0–100 (решение п.3) ---
        List<Candidate> ranked = evaluated.stream().filter(c -> c.status != CandidateStatus.EXCLUDED).toList();
        normalize(ranked);

        Map<String, Integer> weights = loadWeights(order.getCargoType());

        for (Candidate c : ranked) {
            BigDecimal total = weights.entrySet().stream()
                    .map(e -> BigDecimal.valueOf(c.criteria.getOrDefault(e.getKey(), 0.0))
                            .multiply(BigDecimal.valueOf(e.getValue())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            c.totalScore = total.doubleValue();
            saveCalculation(order, c, params, totalDistance, weights);
        }

        order.setStatus("CALCULATED");

        Candidate best = ranked.stream()
                .filter(c -> c.status == CandidateStatus.AVAILABLE)
                .max(java.util.Comparator.comparingDouble(c -> c.totalScore))
                .orElse(null);

        log.info("Заказ №{}: рассчитано {} кандидатов, лучший — driverId={}",
                orderId, ranked.size(), best == null ? null : best.driver.getId());

        return new AnalysisDto(orderId, order.getStatus(), order.getRevenue(),
                evaluated.stream().map(c -> toDto(c, order)).toList(),
                best == null ? null : best.driver.getId(),
                OffsetDateTime.now());
    }

    /** Частные показатели водителя по последним 10 завершённым рейсам (ТЗ 5.6). */
    private static class Candidate {
        DriverEntity driver;
        VehicleEntity vehicle;
        CandidateStatus status;
        String statusReason;
        boolean insufficientData;

        // расчётные суммы
        BigDecimal fuelCost = BigDecimal.ZERO;
        BigDecimal driverCost = BigDecimal.ZERO;
        BigDecimal maintenanceCost = BigDecimal.ZERO;
        BigDecimal tollCost = BigDecimal.ZERO;
        BigDecimal additionalCost = BigDecimal.ZERO;
        BigDecimal otherCost = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal profit = BigDecimal.ZERO;
        BigDecimal profitability = BigDecimal.ZERO;
        BigDecimal fuelRateUsed = BigDecimal.ZERO;
        String fuelRateSource;
        BigDecimal totalDistance;

        // индивидуальные показатели
        int tripsUsed;
        BigDecimal avgFuel = BigDecimal.ZERO;
        BigDecimal costPerKm = BigDecimal.ZERO;
        double reliability;
        int faultAccidents;
        int violations;
        int finesCount;
        BigDecimal finesTotal = BigDecimal.ZERO;

        Map<String, Double> criteria = new HashMap<>();
        double riskValue;
        double totalScore;

        String comment;
    }

    private Candidate evaluateCandidate(OrderEntity order, DriverEntity driver,
                                        EconomicParams params, BigDecimal totalDistance) {
        Candidate c = new Candidate();
        c.driver = driver;
        c.totalDistance = totalDistance;

        var fleetAssignment = fleetAssignmentRepository.findByDriverIdAndIsActiveTrue(driver.getId());
        if (fleetAssignment.isEmpty()) {
            c.status = CandidateStatus.EXCLUDED;
            c.statusReason = "Нет закреплённого автомобиля";
            return c;
        }
        VehicleEntity vehicle = vehicleRepository.findById(fleetAssignment.get().getVehicleId()).orElse(null);
        if (vehicle == null) {
            c.status = CandidateStatus.EXCLUDED;
            c.statusReason = "Автомобиль не найден";
            return c;
        }
        c.vehicle = vehicle;
        if ("MAINTENANCE".equals(vehicle.getStatus())) {
            c.status = CandidateStatus.EXCLUDED;
            c.statusReason = "Автомобиль на обслуживании";
            return c;
        }
        if ("INACTIVE".equals(vehicle.getStatus())) {
            c.status = CandidateStatus.EXCLUDED;
            c.statusReason = "Автомобиль неактивен";
            return c;
        }
        if (vehicle.getLoadCapacity().compareTo(order.getCargoWeight()) < 0) {
            c.status = CandidateStatus.EXCLUDED;
            c.statusReason = "Недостаточная грузоподъёмность (" + vehicle.getLoadCapacity() + " кг < "
                    + order.getCargoWeight() + " кг)";
            return c;
        }
        if (!assignmentRepository.findByDriverIdAndAssignmentStatus(driver.getId(), "ACTIVE").isEmpty()) {
            c.status = CandidateStatus.UNAVAILABLE;
            c.statusReason = "Назначен на другой заказ";
        } else if ("UNAVAILABLE".equals(driver.getStatus())) {
            c.status = CandidateStatus.UNAVAILABLE;
            c.statusReason = "Водитель недоступен";
        } else if ("ON_TRIP".equals(driver.getStatus())) {
            c.status = CandidateStatus.UNAVAILABLE;
            c.statusReason = "Водитель в рейсе";
        } else {
            c.status = CandidateStatus.AVAILABLE;
        }

        // --- Индивидуальные показатели по последним 10 завершённым рейсам (ТЗ 5.6) ---
        List<TripEntity> trips = tripRepository.findByDriverIdAndStatusOrderByTripDateDesc(
                driver.getId(), "COMPLETED", PageRequest.of(0, TRIPS_WINDOW));
        c.tripsUsed = trips.size();
        c.insufficientData = c.tripsUsed < TRIPS_WINDOW;

        BigDecimal fuelVolumeSum = BigDecimal.ZERO;
        BigDecimal distanceSum = BigDecimal.ZERO;
        BigDecimal costSum = BigDecimal.ZERO;
        for (TripEntity trip : trips) {
            fuelVolumeSum = fuelVolumeSum.add(trip.getFuelConsumption());
            distanceSum = distanceSum.add(trip.getDistance());
            costSum = costSum.add(trip.getTotalCost());
        }
        if (distanceSum.signum() > 0) {
            c.avgFuel = fuelVolumeSum.multiply(BigDecimal.valueOf(100))
                    .divide(distanceSum, 2, RoundingMode.HALF_UP); // л/100 км, взвешенно по пробегу
        }
        if (c.tripsUsed > 0) {
            c.costPerKm = costSum.divide(distanceSum, 2, RoundingMode.HALF_UP);
        }

        // Надёжность: доля рейсов без ДТП/нарушений в окне (решение п.4)
        List<IncidentEntity> incidents = incidentRepository.findByDriverId(driver.getId());
        List<FineEntity> fines = fineRepository.findByDriverId(driver.getId());
        c.faultAccidents = (int) incidents.stream()
                .filter(i -> "ACCIDENT".equals(i.getIncidentType()) && "FAULT_FOUND".equals(i.getFaultStatus()))
                .count();
        c.violations = (int) incidents.stream().filter(i -> "VIOLATION".equals(i.getIncidentType())).count();
        c.finesCount = fines.size();
        c.finesTotal = fines.stream().map(FineEntity::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (!trips.isEmpty()) {
            long clean = trips.stream().filter(t -> incidents.stream().noneMatch(i ->
                    Math.abs(java.time.temporal.ChronoUnit.DAYS.between(i.getAccidentDate(), t.getTripDate())) <= 3))
                    .count();
            c.reliability = Math.round(clean * 1000.0 / trips.size()) / 10.0;
        } else {
            c.reliability = 50; // нет истории — нейтральное значение (решение п.3)
        }

        // Прогноз расхода: история водителя, при её отсутствии — норматив автомобиля (ТЗ 5.6)
        if (c.tripsUsed > 0) {
            c.fuelRateUsed = c.avgFuel;
            c.fuelRateSource = "DRIVER_HISTORY";
        } else {
            c.fuelRateUsed = vehicle.getFuelConsumptionRate();
            c.fuelRateSource = "VEHICLE_NORM";
        }

        // --- Формулы ТЗ 5.5 (BigDecimal, HALF_UP) ---
        BigDecimal fuelVolume = totalDistance.multiply(c.fuelRateUsed).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        c.fuelCost = fuelVolume.multiply(params.fuelPrice()).setScale(2, RoundingMode.HALF_UP);
        c.driverCost = order.getPlannedDuration().multiply(params.driverHourlyRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal maintenanceCost = totalDistance.multiply(params.maintenanceRate()).setScale(2, RoundingMode.HALF_UP);
        c.maintenanceCost = maintenanceCost;
        c.tollCost = params.tollCost();
        c.additionalCost = params.additionalCost();
        c.otherCost = params.otherCost();
        c.totalCost = c.fuelCost.add(c.driverCost).add(maintenanceCost)
                .add(params.tollCost()).add(params.additionalCost()).add(params.otherCost())
                .setScale(2, RoundingMode.HALF_UP);
        c.profit = order.getRevenue().subtract(c.totalCost).setScale(2, RoundingMode.HALF_UP);
        c.profitability = order.getRevenue().compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : c.profit.multiply(BigDecimal.valueOf(100)).divide(order.getRevenue(), 2, RoundingMode.HALF_UP);

        // Значения критериев для нормализации (меньше — лучше, кроме надёжности)
        c.criteria.put("ECONOMIC", c.totalCost.doubleValue());
        c.criteria.put("ACCIDENT", (double) c.faultAccidents);
        c.criteria.put("VIOLATION", (double) (c.violations + c.finesCount));
        c.criteria.put("FUEL", c.fuelRateUsed.doubleValue());
        c.criteria.put("RELIABILITY", c.reliability);
        return c;
    }

    /**
     * Min-max нормализация критериев в диапазон 0–100 внутри набора кандидатов
     * конкретного заказа (решение п.3). Критерии «меньше — лучше» инвертируются.
     */
    private void normalize(List<Candidate> candidates) {
        normalizeCriterion(candidates, "ECONOMIC", true);
        normalizeCriterion(candidates, "ACCIDENT", true);
        normalizeCriterion(candidates, "VIOLATION", true);
        normalizeCriterion(candidates, "FUEL", true);
        // надёжность: больше — лучше
        normalizeCriterion(candidates, "RELIABILITY", false);
        for (Candidate c : candidates) {
            if (c.insufficientData) {
                c.criteria.put("RELIABILITY", 50.0); // нейтральное значение при нехватке истории
            }
        }
        // Риск (решение п.4): ДТП 0.5 + нарушения 0.3 + штрафы на рейс 0.2
        Map<Long, Double> accidents = new HashMap<>();
        Map<Long, Double> violations = new HashMap<>();
        Map<Long, Double> finesPerTrip = new HashMap<>();
        for (Candidate c : candidates) {
            accidents.put(c.driver.getId(), (double) c.faultAccidents);
            violations.put(c.driver.getId(), (double) c.violations);
            finesPerTrip.put(c.driver.getId(),
                    c.tripsUsed == 0 ? (double) c.finesCount : c.finesCount * 10.0 / c.tripsUsed);
        }
        for (Candidate c : candidates) {
            double r = 0.5 * directShare(c.driver.getId(), accidents)
                    + 0.3 * directShare(c.driver.getId(), violations)
                    + 0.2 * directShare(c.driver.getId(), finesPerTrip);
            c.riskValue = Math.round(r * 100.0) / 100.0;
        }
    }

    /** Прямая min-max для риска: больше нарушений — выше риск; без различий — 0 при нулях, иначе 50. */
    private double directShare(Long id, Map<Long, Double> values) {
        double min = values.values().stream().min(Double::compare).orElse(0.0);
        double max = values.values().stream().max(Double::compare).orElse(0.0);
        double v = values.getOrDefault(id, 0.0);
        if (max == min) {
            return max > 0 ? 50 : 0;
        }
        return Math.round((v - min) / (max - min) * 10000.0) / 100.0;
    }

    private void normalizeCriterion(List<Candidate> candidates, String criterion, boolean lowerIsBetter) {
        if (candidates.isEmpty()) {
            return;
        }
        double min = candidates.stream().mapToDouble(c -> c.criteria.get(criterion)).min().orElse(0);
        double max = candidates.stream().mapToDouble(c -> c.criteria.get(criterion)).max().orElse(0);
        for (Candidate c : candidates) {
            double v = c.criteria.get(criterion);
            double score;
            if (max == min) {
                score = lowerIsBetter ? (max > 0 ? 50 : 100) : 100;
            } else if (lowerIsBetter) {
                score = (max - v) / (max - min) * 100.0;
            } else {
                score = (v - min) / (max - min) * 100.0;
            }
            c.criteria.put(criterion, Math.round(score * 100.0) / 100.0);
        }
    }

    private Map<String, Integer> loadWeights(String cargoType) {
        List<ScoringWeightEntity> weights = weightRepository.findByCargoType(cargoType);
        if (weights.isEmpty()) {
            weights = weightRepository.findByCargoType(null);
        }
        if (weights.isEmpty()) {
            throw new com.automind.common.ApiException(500, "Веса критериев не настроены в БД");
        }
        Map<String, Integer> result = new HashMap<>();
        for (ScoringWeightEntity w : weights) {
            result.put(w.getCriterion(), w.getWeightPercent());
        }
        return result;
    }

    private void saveCalculation(OrderEntity order, Candidate c, EconomicParams params,
                                 BigDecimal totalDistance, Map<String, Integer> weights) {
        OrderCalculationEntity row = new OrderCalculationEntity();
        row.setOrderId(order.getId());
        row.setDriverId(c.driver.getId());
        row.setVehicleId(c.vehicle.getId());
        row.setFuelCost(c.fuelCost);
        row.setDriverCost(c.driverCost);
        row.setMaintenanceCost(c.maintenanceCost);
        row.setTollCost(params.tollCost());
        row.setAdditionalCost(params.additionalCost());
        row.setOtherCost(params.otherCost());
        row.setTotalCost(c.totalCost);
        row.setRevenue(order.getRevenue());
        row.setProfit(c.profit);
        row.setProfitability(c.profitability);
        row.setRiskScore(BigDecimal.valueOf(c.riskValue));
        row.setTotalScore(BigDecimal.valueOf(c.totalScore));
        row.setInsufficientData(c.insufficientData);
        row.setCalculationSnapshot(buildSnapshot(order, c, params, totalDistance, weights));
        calculationRepository.save(row);
    }

    private String buildSnapshot(OrderEntity order, Candidate c, EconomicParams params,
                                 BigDecimal totalDistance, Map<String, Integer> weights) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("orderId", order.getId());
        snapshot.put("loadedDistance", order.getLoadedDistance());
        snapshot.put("emptyDistance", order.getEmptyDistance());
        snapshot.put("totalDistance", totalDistance);
        snapshot.put("plannedDuration", order.getPlannedDuration());
        snapshot.put("revenue", order.getRevenue());
        snapshot.put("economicParams", params);
        snapshot.put("fuelRateUsed", c.fuelRateUsed);
        snapshot.put("fuelRateSource", c.fuelRateSource);
        snapshot.put("vehicle", Map.of("id", c.vehicle.getId(), "brand", c.vehicle.getBrand(),
                "model", c.vehicle.getModel(), "loadCapacity", c.vehicle.getLoadCapacity(),
                "nominalConsumption", c.vehicle.getFuelConsumptionRate()));
        snapshot.put("driverMetrics", Map.of("tripsUsed", c.tripsUsed, "avgFuel", c.avgFuel,
                "costPerKm", c.costPerKm, "reliability", c.reliability, "faultAccidents", c.faultAccidents,
                "violations", c.violations, "finesCount", c.finesCount, "finesTotal", c.finesTotal));
        snapshot.put("weights", weights);
        snapshot.put("criteria", c.criteria);
        return objectMapper.writeValueAsString(snapshot);
    }

    // --- Назначение (ТЗ 5.9) ---------------------------------------------------

    @Transactional
    public OrderDto assign(Long orderId, Long driverId) {
        OrderEntity order = requireOrder(orderId);
        if (assignmentRepository.findByOrderIdAndAssignmentStatus(orderId, "ACTIVE").isPresent()) {
            throw ApiException.badRequest("На заказ уже назначен водитель");
        }
        DriverEntity driver = driverRepository.findById(driverId)
                .orElseThrow(() -> ApiException.notFound("Водитель не найден"));

        var fleetAssignment = fleetAssignmentRepository.findByDriverIdAndIsActiveTrue(driverId);
        if (fleetAssignment.isEmpty()) {
            throw ApiException.badRequest("Водитель не может быть назначен: нет закреплённого автомобиля");
        }
        Long vehicleId = fleetAssignment.get().getVehicleId();

        // Водитель должен быть подходящим кандидатом последнего расчёта (ТЗ 5.7)
        var calculation = calculationRepository.findByOrderIdAndDriverId(orderId, driverId);
        if (calculation.isEmpty() && !calculationRepository.findByOrderId(orderId).isEmpty()) {
            throw ApiException.badRequest("Водитель не входил в последний расчёт заказа");
        }
        if (!calculation.isEmpty() && calculation.get().getTotalCost().signum() < 0) {
            throw ApiException.badRequest("Некорректный расчёт кандидата");
        }

        OrderAssignmentEntity assignment = new OrderAssignmentEntity();
        assignment.setOrderId(orderId);
        assignment.setDriverId(driverId);
        assignment.setVehicleId(vehicleId);
        assignment.setAssignedAt(OffsetDateTime.now());
        assignment.setAssignmentStatus("ACTIVE");
        assignmentRepository.save(assignment);

        order.setStatus("ASSIGNED");
        driver.setStatus("ON_TRIP"); // занят — недоступен для параллельных заказов (ТЗ 5.9)
        log.info("Заказ №{} назначен водителю {} (автомобиль {})", orderId, driverId, vehicleId);
        return toDto(order);
    }

    /** Результаты анализа по сохранённым расчётам (ТЗ 5.11 GET /analysis). */
    @Transactional(readOnly = true)
    public AnalysisDto analysis(Long orderId) {
        OrderEntity order = requireOrder(orderId);
        List<OrderCalculationEntity> rows = calculationRepository.findByOrderIdOrderByTotalScoreDesc(orderId);
        Map<Long, CandidateStatus> statusById = new HashMap<>();
        Map<Long, String> reasonById = new HashMap<>();
        // статусы кандидатов восстанавливаются из текущего состояния автопарка
        for (DriverEntity driver : driverRepository.findAll()) {
            var fleetAssignment = fleetAssignmentRepository.findByDriverIdAndIsActiveTrue(driver.getId());
            if (fleetAssignment.isEmpty()) {
                statusById.put(driver.getId(), CandidateStatus.EXCLUDED);
                reasonById.put(driver.getId(), "Нет закреплённого автомобиля");
                continue;
            }
            VehicleEntity vehicle = vehicleRepository.findById(fleetAssignment.get().getVehicleId()).orElse(null);
            if (vehicle == null || "MAINTENANCE".equals(vehicle.getStatus()) || "INACTIVE".equals(vehicle.getStatus())) {
                statusById.put(driver.getId(), CandidateStatus.EXCLUDED);
                reasonById.put(driver.getId(), vehicle == null ? "Автомобиль не найден"
                        : "MAINTENANCE".equals(vehicle.getStatus()) ? "Автомобиль на обслуживании" : "Автомобиль неактивен");
                continue;
            }
            if (vehicle.getLoadCapacity().compareTo(order.getCargoWeight()) < 0) {
                statusById.put(driver.getId(), CandidateStatus.EXCLUDED);
                reasonById.put(driver.getId(), "Недостаточная грузоподъёмность");
                continue;
            }
            var activeAssignment = assignmentRepository.findByDriverIdAndAssignmentStatus(driver.getId(), "ACTIVE");
            boolean busyOnOtherOrder = activeAssignment.stream().anyMatch(a -> !a.getOrderId().equals(orderId));
            if (busyOnOtherOrder) {
                statusById.put(driver.getId(), CandidateStatus.UNAVAILABLE);
                reasonById.put(driver.getId(), "Назначен на другой заказ");
            } else if ("UNAVAILABLE".equals(driver.getStatus())) {
                statusById.put(driver.getId(), CandidateStatus.UNAVAILABLE);
                reasonById.put(driver.getId(), "Водитель недоступен");
            } else if ("ON_TRIP".equals(driver.getStatus())) {
                statusById.put(driver.getId(), CandidateStatus.UNAVAILABLE);
                reasonById.put(driver.getId(), "Водитель в рейсе");
            } else {
                statusById.put(driver.getId(), CandidateStatus.AVAILABLE);
            }
        }

        List<CandidateDto> candidates = new ArrayList<>();
        for (OrderCalculationEntity row : rows) {
            DriverEntity driver = driverRepository.findById(row.getDriverId()).orElse(null);
            VehicleEntity vehicle = vehicleRepository.findById(row.getVehicleId()).orElse(null);
            if (driver == null || vehicle == null) continue;
            var incidents = incidentRepository.findByDriverId(driver.getId());
            var fines = fineRepository.findByDriverId(driver.getId());
            int faultAccidents = (int) incidents.stream()
                    .filter(i -> "ACCIDENT".equals(i.getIncidentType()) && "FAULT_FOUND".equals(i.getFaultStatus())).count();
            int violations = (int) incidents.stream().filter(i -> "VIOLATION".equals(i.getIncidentType())).count();
            BigDecimal finesTotal = fines.stream().map(FineEntity::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Double> criteria = new HashMap<>();
            try {
                var snap = objectMapper.readTree(row.getCalculationSnapshot());
                if (snap.has("criteria") && snap.get("criteria").isObject()) {
                    snap.get("criteria").properties().forEach(e ->
                            criteria.put(e.getKey(), e.getValue().asDouble()));
                }
            } catch (Exception parseError) {
                // снимок без частных оценок — обоснование будет без баров
            }
            candidates.add(new CandidateDto(driver.getId(), driver.getFullName(), vehicle.getId(),
                    vehicle.getBrand() + " " + vehicle.getModel() + " · " + vehicle.getRegistrationNumber(),
                    statusById.getOrDefault(driver.getId(), CandidateStatus.AVAILABLE),
                    reasonById.get(driver.getId()),
                    row.getFuelCost(), row.getDriverCost(), row.getMaintenanceCost(),
                    row.getTollCost(), row.getAdditionalCost(), row.getOtherCost(),
                    row.getTotalCost(), row.getRevenue(), row.getProfit(), row.getProfitability(),
                    row.getRiskScore(), row.getTotalScore(), row.isInsufficientData(),
                    faultAccidents, violations, finesTotal, null, criteria));
        }
        // ТЗ 5.7: показываем всех водителей — без строки расчёта, с причиной статуса
        java.util.Set<Long> calculated = candidates.stream().map(CandidateDto::driverId)
                .collect(java.util.stream.Collectors.toSet());
        for (DriverEntity driver : driverRepository.findAll()) {
            if (calculated.contains(driver.getId())) continue;
            candidates.add(new CandidateDto(driver.getId(), driver.getFullName(), null, "—",
                    statusById.getOrDefault(driver.getId(), CandidateStatus.EXCLUDED),
                    reasonById.get(driver.getId()),
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, false,
                    0, 0, BigDecimal.ZERO, null, Map.of()));
        }

        Long best = candidates.stream()
                .filter(c -> c.status() == CandidateStatus.AVAILABLE)
                .max(java.util.Comparator.comparing(c -> c.totalScore()))
                .map(CandidateDto::driverId).orElse(null);
        var activeAssignment = assignmentRepository.findByOrderIdAndAssignmentStatus(orderId, "ACTIVE").orElse(null);
        if (activeAssignment != null) {
            best = activeAssignment.getDriverId(); // назначенный диспетчером — и есть выбранный кандидат
        }
        OffsetDateTime calculatedAt = rows.stream().map(OrderCalculationEntity::getCalculatedAt)
                .filter(Objects::nonNull).max(OffsetDateTime::compareTo).orElse(null);
        return new AnalysisDto(orderId, order.getStatus(), order.getRevenue(), candidates, best, calculatedAt);
    }

    // --- История (ТЗ 5.11) ------------------------------------------------------

    @Transactional(readOnly = true)
    public List<HistoryEvent> history(Long orderId) {
        requireOrder(orderId);
        List<HistoryEvent> events = new ArrayList<>();
        for (OrderCalculationEntity row : calculationRepository.findByOrderIdOrderByTotalScoreDesc(orderId)) {
            events.add(new HistoryEvent(row.getCalculatedAt(), "CALCULATION",
                    "Расчёт кандидата driverId=" + row.getDriverId() + ": себестоимость "
                            + row.getTotalCost() + " ₽, оценка " + row.getTotalScore()));
        }
        var assignment = assignmentRepository.findByOrderIdAndAssignmentStatus(orderId, "ACTIVE").orElse(null);
        if (assignment != null) {
            events.add(new HistoryEvent(assignment.getAssignedAt(), "ASSIGNMENT",
                    "Назначен водитель driverId=" + assignment.getDriverId()));
        }
        events.sort(java.util.Comparator.comparing(HistoryEvent::at).reversed());
        return events;
    }

    // --- Вспомогательное ---------------------------------------------------------

    private OrderEntity requireOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Заказ не найден"));
    }

    private void validateCargoType(String cargoType) {
        if (!List.of("ORDINARY", "FRAGILE", "DANGEROUS", "PERISHABLE", "OVERSIZED", "OTHER").contains(cargoType)) {
            throw ApiException.badRequest("Недопустимый тип груза: " + cargoType);
        }
    }

    private void applyUpsert(OrderEntity order, OrderUpsertRequest request) {
        order.setOrderName(request.orderName());
        order.setCargoType(request.cargoType());
        order.setCargoDescription(request.cargoDescription());
        order.setCargoWeight(request.cargoWeight());
        order.setCargoVolume(request.cargoVolume());
        order.setFragile(Boolean.TRUE.equals(request.isFragile()));
        order.setSpecialConditions(request.specialConditions());
        order.setOrigin(request.origin());
        order.setDestination(request.destination());
        order.setLoadedDistance(request.loadedDistance());
        order.setEmptyDistance(request.emptyDistance());
        order.setPlannedDuration(request.plannedDuration());
        order.setRevenue(request.revenue());
    }

    @Transactional(readOnly = true)
    public OrderDto toDto(OrderEntity order) {
        var assignment = assignmentRepository.findByOrderIdAndAssignmentStatus(order.getId(), "ACTIVE").orElse(null);
        AssignedDriverInfo assigned = null;
        if (assignment != null) {
            String name = driverRepository.findById(assignment.getDriverId())
                    .map(DriverEntity::getFullName).orElse("—");
            String vehicleLabel = vehicleRepository.findById(assignment.getVehicleId())
                    .map(v -> v.getBrand() + " " + v.getModel() + " · " + v.getRegistrationNumber())
                    .orElse("—");
            assigned = new AssignedDriverInfo(assignment.getDriverId(), name,
                    assignment.getVehicleId(), vehicleLabel, assignment.getAssignedAt());
        }
        return new OrderDto(order.getId(), order.getOrderName(), order.getCargoType(), order.getCargoDescription(),
                order.getCargoWeight(), order.getCargoVolume(), order.isFragile(), order.getSpecialConditions(),
                order.getOrigin(), order.getDestination(), order.getLoadedDistance(), order.getEmptyDistance(),
                order.getPlannedDuration(), order.getRevenue(), order.getStatus(), order.getCreatedAt(), assigned);
    }

    private CandidateDto toDto(Candidate c, OrderEntity order) {
        String vehicleLabel = c.vehicle == null ? "—"
                : c.vehicle.getBrand() + " " + c.vehicle.getModel() + " · " + c.vehicle.getRegistrationNumber();
        return new CandidateDto(c.driver.getId(), c.driver.getFullName(),
                c.vehicle == null ? null : c.vehicle.getId(), vehicleLabel,
                c.status, c.statusReason,
                c.fuelCost, c.driverCost, c.maintenanceCost,
                c.tollCost, c.additionalCost, c.otherCost,
                c.totalCost, order.getRevenue(), c.profit, c.profitability,
                BigDecimal.valueOf(c.riskValue), BigDecimal.valueOf(c.totalScore), c.insufficientData,
                c.faultAccidents, c.violations, c.finesTotal, c.comment,
                new HashMap<>(c.criteria));
    }
}
