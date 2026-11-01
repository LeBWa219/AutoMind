package com.automind.fleet;

import com.automind.common.ApiException;
import com.automind.trip.FineEntity;
import com.automind.trip.FineRepository;
import com.automind.trip.IncidentEntity;
import com.automind.trip.IncidentRepository;
import com.automind.trip.TripEntity;
import com.automind.trip.TripRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Управление водителями (ТЗ 4.5) с эксплуатационными показателями.
 * Индивидуальные показатели считаются по последним 10 завершённым рейсам (ТЗ 5.6).
 */
@Service
public class DriverService {

    private static final int TRIPS_WINDOW = 10;

    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final IncidentRepository incidentRepository;
    private final FineRepository fineRepository;
    private final DriverVehicleAssignmentRepository assignmentRepository;
    private final VehicleRepository vehicleRepository;

    public DriverService(DriverRepository driverRepository,
                         TripRepository tripRepository,
                         IncidentRepository incidentRepository,
                         FineRepository fineRepository,
                         DriverVehicleAssignmentRepository assignmentRepository,
                         VehicleRepository vehicleRepository) {
        this.driverRepository = driverRepository;
        this.tripRepository = tripRepository;
        this.incidentRepository = incidentRepository;
        this.fineRepository = fineRepository;
        this.assignmentRepository = assignmentRepository;
        this.vehicleRepository = vehicleRepository;
    }

    public record VehicleBrief(Long id, String brand, String model, String registrationNumber) {
    }

    /** Эксплуатационные показатели водителя (ТЗ 4.5, 5.6). */
    public record DriverStats(long tripsCount, long accidents, long violations,
                              long finesCount, BigDecimal finesTotal,
                              BigDecimal avgFuelConsumption, BigDecimal avgTripCost,
                              int recentTripsUsed) {
    }

    public record DriverDto(Long id, String fullName, String phone, String licenseNumber,
                            String licenseCategory, Integer experienceYears,
                            java.time.LocalDate employmentDate, String status,
                            VehicleBrief vehicle, DriverStats stats) {
    }

    public record TripDto(Long id, String startLocation, String endLocation, BigDecimal distance,
                          BigDecimal duration, BigDecimal fuelConsumption, BigDecimal fuelCost,
                          BigDecimal totalCost, java.time.LocalDate tripDate, String status,
                          Long vehicleId) {
    }

    public record FineDto(Long id, BigDecimal amount, String description, java.time.LocalDate issuedAt,
                          String paymentStatus, Long incidentId, Long vehicleId) {
    }

    public record IncidentDto(Long id, String incidentType, String description,
                              java.time.LocalDate accidentDate, String faultStatus,
                              Long vehicleId, List<FineDto> fines) {
    }

    public record DriverUpsertRequest(
            @jakarta.validation.constraints.NotBlank(message = "Укажите ФИО") String fullName,
            String phone,
            String licenseNumber,
            String licenseCategory,
            @jakarta.validation.constraints.Min(value = 0, message = "Стаж не может быть отрицательным")
            Integer experienceYears,
            java.time.LocalDate employmentDate,
            @jakarta.validation.constraints.NotBlank(message = "Укажите статус") String status) {
    }

    @Transactional(readOnly = true)
    public List<DriverDto> listAll() {
        return driverRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public DriverDto get(Long id) {
        DriverEntity driver = driverRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Водитель не найден"));
        return toDto(driver);
    }

    @Transactional
    public DriverDto create(DriverUpsertRequest request) {
        validateStatus(request.status());
        DriverEntity driver = new DriverEntity();
        applyUpsert(driver, request);
        driverRepository.save(driver);
        return toDto(driver);
    }

    @Transactional
    public DriverDto update(Long id, DriverUpsertRequest request) {
        DriverEntity driver = driverRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Водитель не найден"));
        validateStatus(request.status());
        applyUpsert(driver, request);
        return toDto(driver);
    }

    @Transactional(readOnly = true)
    public List<TripDto> trips(Long driverId, Integer limit) {
        ensureDriverExists(driverId);
        List<TripEntity> trips = limit == null
                ? tripRepository.findByDriverIdOrderByTripDateDesc(driverId)
                : tripRepository.findByDriverIdOrderByTripDateDesc(driverId, PageRequest.of(0, limit));
        return trips.stream().map(this::toDto).toList();
    }

    /** ДТП и нарушения со связанными штрафами (ТЗ 4.8, блок 5). */
    @Transactional(readOnly = true)
    public List<IncidentDto> incidents(Long driverId) {
        ensureDriverExists(driverId);
        List<IncidentEntity> incidents = incidentRepository.findByDriverIdOrderByAccidentDateDesc(driverId);
        List<FineEntity> fines = fineRepository.findByDriverIdOrderByIssuedAtDesc(driverId);
        return incidents.stream().map(i -> new IncidentDto(
                i.getId(), i.getIncidentType(), i.getDescription(), i.getAccidentDate(), i.getFaultStatus(),
                i.getVehicleId(),
                fines.stream()
                        .filter(f -> i.getId().equals(f.getIncidentId()))
                        .map(this::toDto)
                        .toList()))
                .toList();
    }

    private void ensureDriverExists(Long driverId) {
        if (!driverRepository.existsById(driverId)) {
            throw ApiException.notFound("Водитель не найден");
        }
    }

    private void validateStatus(String status) {
        if (!List.of("AVAILABLE", "ON_TRIP", "UNAVAILABLE").contains(status)) {
            throw ApiException.badRequest("Недопустимый статус водителя: " + status);
        }
    }

    private void applyUpsert(DriverEntity driver, DriverUpsertRequest request) {
        driver.setFullName(request.fullName());
        driver.setPhone(request.phone());
        driver.setLicenseNumber(request.licenseNumber());
        driver.setLicenseCategory(request.licenseCategory());
        driver.setExperienceYears(request.experienceYears() == null ? 0 : request.experienceYears());
        driver.setEmploymentDate(request.employmentDate());
        driver.setStatus(request.status());
    }

    private DriverDto toDto(DriverEntity driver) {
        List<TripEntity> lastTrips =
                tripRepository.findByDriverIdOrderByTripDateDesc(driver.getId(), PageRequest.of(0, TRIPS_WINDOW));
        List<IncidentEntity> incidents = incidentRepository.findByDriverId(driver.getId());
        List<FineEntity> fines = fineRepository.findByDriverId(driver.getId());

        long tripsCount = tripRepository.findByDriverIdOrderByTripDateDesc(driver.getId()).size();
        long accidents = incidents.stream().filter(i -> "ACCIDENT".equals(i.getIncidentType())).count();
        long violations = incidents.stream().filter(i -> "VIOLATION".equals(i.getIncidentType())).count();
        BigDecimal finesTotal = fines.stream().map(FineEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal avgFuel = average(lastTrips.stream()
                .map(t -> t.getDistance().signum() == 0 ? BigDecimal.ZERO
                        : t.getFuelConsumption().multiply(BigDecimal.valueOf(100))
                        .divide(t.getDistance(), 2, RoundingMode.HALF_UP))
                .toList());
        BigDecimal avgCost = average(lastTrips.stream().map(TripEntity::getTotalCost).toList())
                .setScale(2, RoundingMode.HALF_UP);

        VehicleBrief vehicle = assignmentRepository.findByDriverIdAndIsActiveTrue(driver.getId())
                .flatMap(a -> vehicleRepository.findById(a.getVehicleId()))
                .map(v -> new VehicleBrief(v.getId(), v.getBrand(), v.getModel(), v.getRegistrationNumber()))
                .orElse(null);

        return new DriverDto(driver.getId(), driver.getFullName(), driver.getPhone(), driver.getLicenseNumber(),
                driver.getLicenseCategory(), driver.getExperienceYears(), driver.getEmploymentDate(),
                driver.getStatus(), vehicle,
                new DriverStats(tripsCount, accidents, violations, fines.size(), finesTotal,
                        avgFuel, avgCost, lastTrips.size()));
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private TripDto toDto(TripEntity t) {
        return new TripDto(t.getId(), t.getStartLocation(), t.getEndLocation(), t.getDistance(), t.getDuration(),
                t.getFuelConsumption(), t.getFuelCost(), t.getTotalCost(), t.getTripDate(), t.getStatus(),
                t.getVehicleId());
    }

    private FineDto toDto(FineEntity f) {
        return new FineDto(f.getId(), f.getAmount(), f.getDescription(), f.getIssuedAt(),
                f.getPaymentStatus(), f.getIncidentId(), f.getVehicleId());
    }
}
