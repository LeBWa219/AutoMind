package com.automind.economy;

import com.automind.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Экономические параметры расчётов (ТЗ 4.3.3, 4.9).
 * Изменение применяется только к новым расчётам; история хранит снимки (ТЗ 5.10).
 */
@RestController
@RequestMapping("/api/economic-settings")
public class EconomicSettingController {

    public record EconomicSettingsDto(Long id, BigDecimal fuelPrice, BigDecimal defaultFuelConsumptionRate,
                                      BigDecimal driverHourlyRate, BigDecimal maintenanceRate,
                                      BigDecimal additionalCost, BigDecimal tollCost, BigDecimal otherCost) {
    }

    public record UpdateRequest(
            @NotNull(message = "Укажите стоимость топлива")
            @DecimalMin(value = "0", message = "Стоимость топлива не может быть отрицательной")
            BigDecimal fuelPrice,
            @NotNull(message = "Укажите нормативный расход топлива")
            @DecimalMin(value = "0.01", message = "Нормативный расход должен быть больше нуля")
            BigDecimal defaultFuelConsumptionRate,
            @NotNull(message = "Укажите стоимость часа работы водителя")
            @DecimalMin(value = "0", message = "Ставка водителя не может быть отрицательной")
            BigDecimal driverHourlyRate,
            @NotNull(message = "Укажите стоимость обслуживания километра")
            @DecimalMin(value = "0", message = "Стоимость обслуживания не может быть отрицательной")
            BigDecimal maintenanceRate,
            @NotNull(message = "Укажите дополнительные расходы или 0")
            @DecimalMin(value = "0", message = "Дополнительные расходы не могут быть отрицательными")
            BigDecimal additionalCost,
            @NotNull(message = "Укажите стоимость платных дорог или 0")
            @DecimalMin(value = "0", message = "Стоимость платных дорог не может быть отрицательной")
            BigDecimal tollCost,
            @NotNull(message = "Укажите прочие расходы или 0")
            @DecimalMin(value = "0", message = "Прочие расходы не могут быть отрицательными")
            BigDecimal otherCost) {
    }

    private final EconomicSettingRepository repository;

    public EconomicSettingController(EconomicSettingRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public EconomicSettingsDto get() {
        return toDto(load());
    }

    @PutMapping
    @Transactional
    public EconomicSettingsDto update(@Valid @RequestBody UpdateRequest request) {
        EconomicSettingEntity entity = load();
        entity.setFuelPrice(request.fuelPrice());
        entity.setDefaultFuelConsumptionRate(request.defaultFuelConsumptionRate());
        entity.setDriverHourlyRate(request.driverHourlyRate());
        entity.setMaintenanceRate(request.maintenanceRate());
        entity.setAdditionalCost(request.additionalCost());
        entity.setTollCost(request.tollCost());
        entity.setOtherCost(request.otherCost());
        return toDto(entity);
    }

    private EconomicSettingEntity load() {
        return repository.findAll().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Экономические настройки не заданы"));
    }

    private EconomicSettingsDto toDto(EconomicSettingEntity e) {
        return new EconomicSettingsDto(e.getId(), e.getFuelPrice(), e.getDefaultFuelConsumptionRate(),
                e.getDriverHourlyRate(), e.getMaintenanceRate(), e.getAdditionalCost(), e.getTollCost(),
                e.getOtherCost());
    }
}
