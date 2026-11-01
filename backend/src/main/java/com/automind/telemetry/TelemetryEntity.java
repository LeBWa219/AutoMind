package com.automind.telemetry;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/** Запись телеметрии (ТЗ 7.2.5, 4.7). */
@Entity
@Table(name = "telemetry")
public class TelemetryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(nullable = false)
    private double speed;

    @Column(name = "engine_rpm")
    private Integer engineRpm;

    @Column(name = "engine_temperature")
    private Double engineTemperature;

    @Column(name = "coolant_temperature")
    private Double coolantTemperature;

    @Column(name = "fuel_level")
    private Double fuelLevel;

    @Column(name = "fuel_consumption")
    private Double fuelConsumption;

    @Column(name = "battery_voltage")
    private Double batteryVoltage;

    @Column(name = "battery_ok", nullable = false)
    private boolean batteryOk;

    @Column(nullable = false)
    private double mileage;

    @Column(name = "oil_pressure")
    private Double oilPressure;

    @Column(name = "ignition_status", nullable = false)
    private boolean ignitionStatus;

    @Column(name = "movement_status", nullable = false)
    private boolean movementStatus;

    @Column(length = 120)
    private String warning;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    public Long getId() {
        return id;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public double getSpeed() {
        return speed;
    }

    public Integer getEngineRpm() {
        return engineRpm;
    }

    public Double getEngineTemperature() {
        return engineTemperature;
    }

    public Double getCoolantTemperature() {
        return coolantTemperature;
    }

    public Double getFuelLevel() {
        return fuelLevel;
    }

    public Double getFuelConsumption() {
        return fuelConsumption;
    }

    public Double getBatteryVoltage() {
        return batteryVoltage;
    }

    public boolean isBatteryOk() {
        return batteryOk;
    }

    public double getMileage() {
        return mileage;
    }

    public Double getOilPressure() {
        return oilPressure;
    }

    public boolean isIgnitionStatus() {
        return ignitionStatus;
    }

    public boolean isMovementStatus() {
        return movementStatus;
    }

    public String getWarning() {
        return warning;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public void setSpeed(double speed) {
        this.speed = speed;
    }

    public void setEngineRpm(Integer engineRpm) {
        this.engineRpm = engineRpm;
    }

    public void setEngineTemperature(Double engineTemperature) {
        this.engineTemperature = engineTemperature;
    }

    public void setCoolantTemperature(Double coolantTemperature) {
        this.coolantTemperature = coolantTemperature;
    }

    public void setFuelLevel(Double fuelLevel) {
        this.fuelLevel = fuelLevel;
    }

    public void setFuelConsumption(Double fuelConsumption) {
        this.fuelConsumption = fuelConsumption;
    }

    public void setBatteryVoltage(Double batteryVoltage) {
        this.batteryVoltage = batteryVoltage;
    }

    public void setBatteryOk(boolean batteryOk) {
        this.batteryOk = batteryOk;
    }

    public void setMileage(double mileage) {
        this.mileage = mileage;
    }

    public void setOilPressure(Double oilPressure) {
        this.oilPressure = oilPressure;
    }

    public void setIgnitionStatus(boolean ignitionStatus) {
        this.ignitionStatus = ignitionStatus;
    }

    public void setMovementStatus(boolean movementStatus) {
        this.movementStatus = movementStatus;
    }

    public void setWarning(String warning) {
        this.warning = warning;
    }

    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
