package com.automind.fleet;

import com.automind.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Управление автомобилями (ТЗ 4.4): CRUD, смена статуса, закрепление водителя.
 * Уникальность VIN и госномера проверяется на сервере (ТЗ 4.4).
 */
@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final DriverVehicleAssignmentRepository assignmentRepository;

    public VehicleService(VehicleRepository vehicleRepository,
                          DriverRepository driverRepository,
                          DriverVehicleAssignmentRepository assignmentRepository) {
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public record AssignedDriver(Long id, String fullName) {
    }

    public record VehicleDto(Long id, String registrationNumber, String vin, String brand, String model,
                             Integer productionYear, String fuelType, java.math.BigDecimal fuelConsumptionRate,
                             java.math.BigDecimal loadCapacity, java.math.BigDecimal mileage, String status,
                             AssignedDriver driver) {
    }

    public record VehicleUpsertRequest(
            @jakarta.validation.constraints.NotBlank(message = "Укажите госномер") String registrationNumber,
            @jakarta.validation.constraints.NotBlank(message = "Укажите VIN") String vin,
            @jakarta.validation.constraints.NotBlank(message = "Укажите марку") String brand,
            @jakarta.validation.constraints.NotBlank(message = "Укажите модель") String model,
            Integer productionYear,
            @jakarta.validation.constraints.NotBlank(message = "Укажите тип топлива") String fuelType,
            @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Средний расход должен быть больше нуля")
            java.math.BigDecimal fuelConsumptionRate,
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Грузоподъёмность не может быть отрицательной")
            java.math.BigDecimal loadCapacity,
            java.math.BigDecimal mileage,
            @jakarta.validation.constraints.NotBlank(message = "Укажите статус") String status) {
    }

    public record StatusRequest(@jakarta.validation.constraints.NotBlank(message = "Укажите статус") String status) {
    }

    public record DriverLinkRequest(Long driverId) {
    }

    @Transactional(readOnly = true)
    public List<VehicleDto> listAll() {
        Map<Long, DriverEntity> activeDrivers = activeDriverByVehicleId();
        return vehicleRepository.findAll().stream()
                .map(v -> toDto(v, activeDrivers.get(v.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleDto get(Long id) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Автомобиль не найден"));
        DriverEntity driver = assignmentRepository.findByVehicleIdAndIsActiveTrue(id)
                .map(a -> driverRepository.findById(a.getDriverId()).orElse(null))
                .orElse(null);
        return toDto(vehicle, driver);
    }

    @Transactional
    public VehicleDto create(VehicleUpsertRequest request) {
        validateUnique(request, null);
        VehicleEntity vehicle = new VehicleEntity();
        applyUpsert(vehicle, request);
        if (vehicleRepository.count() == 0 || request.mileage() != null) {
            vehicle.setMileage(request.mileage() == null ? java.math.BigDecimal.ZERO : request.mileage());
        }
        vehicleRepository.save(vehicle);
        return toDto(vehicle, null);
    }

    @Transactional
    public VehicleDto update(Long id, VehicleUpsertRequest request) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Автомобиль не найден"));
        validateUnique(request, id);
        applyUpsert(vehicle, request);
        return toDto(vehicle, activeDriverByVehicleId().get(id));
    }

    @Transactional
    public VehicleDto changeStatus(Long id, String status) {
        if (!List.of("ACTIVE", "ON_TRIP", "MAINTENANCE", "INACTIVE").contains(status)) {
            throw ApiException.badRequest("Недопустимый статус автомобиля: " + status);
        }
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Автомобиль не найден"));
        vehicle.setStatus(status);
        return toDto(vehicle, activeDriverByVehicleId().get(id));
    }

    /**
     * Закрепление водителя за автомобилем (ТЗ 4.3.1). driverId = null — открепить.
     * История сохраняется: старая активная связь деактивируется, создаётся новая (ТЗ 7.3).
     */
    @Transactional
    public VehicleDto assignDriver(Long id, Long driverId) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Автомобиль не найден"));

        var current = assignmentRepository.findByVehicleIdAndIsActiveTrue(id).orElse(null);
        if (current != null && (driverId == null || !current.getDriverId().equals(driverId))) {
            current.setActive(false);
            current.setUnassignedAt(OffsetDateTime.now());
        }
        DriverEntity driver = null;
        if (driverId != null) {
            driver = driverRepository.findById(driverId)
                    .orElseThrow(() -> ApiException.notFound("Водитель не найден"));
            if (current == null || !current.getDriverId().equals(driverId)) {
                assignmentRepository.findByDriverIdAndIsActiveTrue(driverId).ifPresent(other -> {
                    other.setActive(false);
                    other.setUnassignedAt(OffsetDateTime.now());
                });
                DriverVehicleAssignmentEntity assignment = new DriverVehicleAssignmentEntity();
                assignment.setDriverId(driverId);
                assignment.setVehicleId(id);
                assignment.setAssignedAt(OffsetDateTime.now());
                assignment.setActive(true);
                assignmentRepository.save(assignment);
            }
        }
        return toDto(vehicle, driver);
    }

    private Map<Long, DriverEntity> activeDriverByVehicleId() {
        Function<DriverVehicleAssignmentEntity, Long> byDriver = DriverVehicleAssignmentEntity::getDriverId;
        Map<Long, Long> vehicleToDriver = assignmentRepository.findByIsActiveTrue().stream()
                .collect(Collectors.toMap(DriverVehicleAssignmentEntity::getVehicleId, byDriver, (a, b) -> a));
        return vehicleToDriver.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey,
                        e -> driverRepository.findById(e.getValue()).orElse(null)));
    }

    private void validateUnique(VehicleUpsertRequest request, Long excludeId) {
        if (excludeId == null
                ? vehicleRepository.findByRegistrationNumberIgnoreCase(request.registrationNumber()).isPresent()
                : vehicleRepository.existsByRegistrationNumberIgnoreCaseAndIdNot(request.registrationNumber(), excludeId)) {
            throw ApiException.badRequest("Автомобиль с таким госномером уже существует");
        }
        if (excludeId == null
                ? vehicleRepository.findByVinIgnoreCase(request.vin()).isPresent()
                : vehicleRepository.existsByVinIgnoreCaseAndIdNot(request.vin(), excludeId)) {
            throw ApiException.badRequest("VIN уже существует в системе");
        }
    }

    private void applyUpsert(VehicleEntity vehicle, VehicleUpsertRequest request) {
        vehicle.setRegistrationNumber(request.registrationNumber());
        vehicle.setVin(request.vin());
        vehicle.setBrand(request.brand());
        vehicle.setModel(request.model());
        vehicle.setProductionYear(request.productionYear());
        if (!List.of("DIESEL", "PETROL", "HYBRID", "ELECTRIC", "GAS").contains(request.fuelType())) {
            throw ApiException.badRequest("Недопустимый тип топлива: " + request.fuelType());
        }
        vehicle.setFuelType(request.fuelType());
        vehicle.setFuelConsumptionRate(request.fuelConsumptionRate());
        vehicle.setLoadCapacity(request.loadCapacity() == null ? java.math.BigDecimal.ZERO : request.loadCapacity());
        if (request.mileage() != null) {
            vehicle.setMileage(request.mileage());
        }
        if (vehicle.getStatus() == null) {
            vehicle.setStatus(request.status());
        }
    }

    private VehicleDto toDto(VehicleEntity v, DriverEntity driver) {
        return new VehicleDto(v.getId(), v.getRegistrationNumber(), v.getVin(), v.getBrand(), v.getModel(),
                v.getProductionYear(), v.getFuelType(), v.getFuelConsumptionRate(), v.getLoadCapacity(),
                v.getMileage(), v.getStatus(),
                driver == null ? null : new AssignedDriver(driver.getId(), driver.getFullName()));
    }
}
