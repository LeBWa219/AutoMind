package com.automind.economy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Экономические настройки компании (ТЗ 7.2.10, решение п.1). */
@Entity
@Table(name = "economic_settings")
public class EconomicSettingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fuel_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal fuelPrice;

    @Column(name = "default_fuel_consumption_rate", nullable = false, precision = 6, scale = 2)
    private BigDecimal defaultFuelConsumptionRate;

    @Column(name = "driver_hourly_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal driverHourlyRate;

    @Column(name = "maintenance_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal maintenanceRate;

    @Column(name = "additional_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal additionalCost;

    @Column(name = "toll_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal tollCost;

    @Column(name = "other_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal otherCost;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public BigDecimal getFuelPrice() {
        return fuelPrice;
    }

    public void setFuelPrice(BigDecimal fuelPrice) {
        this.fuelPrice = fuelPrice;
    }

    public BigDecimal getDefaultFuelConsumptionRate() {
        return defaultFuelConsumptionRate;
    }

    public void setDefaultFuelConsumptionRate(BigDecimal defaultFuelConsumptionRate) {
        this.defaultFuelConsumptionRate = defaultFuelConsumptionRate;
    }

    public BigDecimal getDriverHourlyRate() {
        return driverHourlyRate;
    }

    public void setDriverHourlyRate(BigDecimal driverHourlyRate) {
        this.driverHourlyRate = driverHourlyRate;
    }

    public BigDecimal getMaintenanceRate() {
        return maintenanceRate;
    }

    public void setMaintenanceRate(BigDecimal maintenanceRate) {
        this.maintenanceRate = maintenanceRate;
    }

    public BigDecimal getAdditionalCost() {
        return additionalCost;
    }

    public void setAdditionalCost(BigDecimal additionalCost) {
        this.additionalCost = additionalCost;
    }

    public BigDecimal getTollCost() {
        return tollCost;
    }

    public void setTollCost(BigDecimal tollCost) {
        this.tollCost = tollCost;
    }

    public BigDecimal getOtherCost() {
        return otherCost;
    }

    public void setOtherCost(BigDecimal otherCost) {
        this.otherCost = otherCost;
    }
}
