package com.automind.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Результат экономического расчёта по одному кандидату (ТЗ 7.2.12).
 * calculation_snapshot хранит использованные параметры, чтобы последующие
 * изменения настроек не влияли на выполненные расчёты (ТЗ 5.10).
 */
@Entity
@Table(name = "order_calculations")
public class OrderCalculationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "fuel_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal fuelCost;

    @Column(name = "driver_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal driverCost;

    @Column(name = "maintenance_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal maintenanceCost;

    @Column(name = "toll_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal tollCost;

    @Column(name = "additional_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal additionalCost;

    @Column(name = "other_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal otherCost;

    @Column(name = "total_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCost;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal revenue;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal profit;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal profitability;

    @Column(name = "risk_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal riskScore;

    @Column(name = "total_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "insufficient_data", nullable = false)
    private boolean insufficientData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "calculation_snapshot", nullable = false, columnDefinition = "jsonb")
    private String calculationSnapshot;

    @Column(name = "calculated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime calculatedAt;

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getDriverId() {
        return driverId;
    }

    public void setDriverId(Long driverId) {
        this.driverId = driverId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public BigDecimal getFuelCost() {
        return fuelCost;
    }

    public void setFuelCost(BigDecimal fuelCost) {
        this.fuelCost = fuelCost;
    }

    public BigDecimal getDriverCost() {
        return driverCost;
    }

    public void setDriverCost(BigDecimal driverCost) {
        this.driverCost = driverCost;
    }

    public BigDecimal getMaintenanceCost() {
        return maintenanceCost;
    }

    public void setMaintenanceCost(BigDecimal maintenanceCost) {
        this.maintenanceCost = maintenanceCost;
    }

    public BigDecimal getTollCost() {
        return tollCost;
    }

    public void setTollCost(BigDecimal tollCost) {
        this.tollCost = tollCost;
    }

    public BigDecimal getAdditionalCost() {
        return additionalCost;
    }

    public void setAdditionalCost(BigDecimal additionalCost) {
        this.additionalCost = additionalCost;
    }

    public BigDecimal getOtherCost() {
        return otherCost;
    }

    public void setOtherCost(BigDecimal otherCost) {
        this.otherCost = otherCost;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.totalCost = totalCost;
    }

    public BigDecimal getRevenue() {
        return revenue;
    }

    public void setRevenue(BigDecimal revenue) {
        this.revenue = revenue;
    }

    public BigDecimal getProfit() {
        return profit;
    }

    public void setProfit(BigDecimal profit) {
        this.profit = profit;
    }

    public BigDecimal getProfitability() {
        return profitability;
    }

    public void setProfitability(BigDecimal profitability) {
        this.profitability = profitability;
    }

    public BigDecimal getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(BigDecimal riskScore) {
        this.riskScore = riskScore;
    }

    public BigDecimal getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(BigDecimal totalScore) {
        this.totalScore = totalScore;
    }

    public boolean isInsufficientData() {
        return insufficientData;
    }

    public void setInsufficientData(boolean insufficientData) {
        this.insufficientData = insufficientData;
    }

    public OffsetDateTime getCalculatedAt() {
        return calculatedAt;
    }

    public String getCalculationSnapshot() {
        return calculationSnapshot;
    }

    public void setCalculationSnapshot(String calculationSnapshot) {
        this.calculationSnapshot = calculationSnapshot;
    }
}
