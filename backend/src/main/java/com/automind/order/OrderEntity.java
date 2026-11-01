package com.automind.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Заказ на перевозку (ТЗ 7.2.11, решение п.2). */
@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_name", nullable = false, length = 150)
    private String orderName;

    @Column(name = "cargo_type", nullable = false, length = 30)
    private String cargoType;

    @Column(name = "cargo_description", length = 255)
    private String cargoDescription;

    @Column(name = "cargo_weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal cargoWeight;

    @Column(name = "cargo_volume", precision = 10, scale = 2)
    private BigDecimal cargoVolume;

    @Column(name = "is_fragile", nullable = false)
    private boolean isFragile;

    @Column(name = "special_conditions", length = 255)
    private String specialConditions;

    @Column(nullable = false, length = 120)
    private String origin;

    @Column(nullable = false, length = 120)
    private String destination;

    @Column(name = "loaded_distance", nullable = false, precision = 8, scale = 1)
    private BigDecimal loadedDistance;

    @Column(name = "empty_distance", nullable = false, precision = 8, scale = 1)
    private BigDecimal emptyDistance;

    @Column(name = "planned_duration", nullable = false, precision = 5, scale = 1)
    private BigDecimal plannedDuration;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal revenue;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public String getOrderName() {
        return orderName;
    }

    public void setOrderName(String orderName) {
        this.orderName = orderName;
    }

    public String getCargoType() {
        return cargoType;
    }

    public void setCargoType(String cargoType) {
        this.cargoType = cargoType;
    }

    public String getCargoDescription() {
        return cargoDescription;
    }

    public void setCargoDescription(String cargoDescription) {
        this.cargoDescription = cargoDescription;
    }

    public BigDecimal getCargoWeight() {
        return cargoWeight;
    }

    public void setCargoWeight(BigDecimal cargoWeight) {
        this.cargoWeight = cargoWeight;
    }

    public BigDecimal getCargoVolume() {
        return cargoVolume;
    }

    public void setCargoVolume(BigDecimal cargoVolume) {
        this.cargoVolume = cargoVolume;
    }

    public boolean isFragile() {
        return isFragile;
    }

    public void setFragile(boolean fragile) {
        isFragile = fragile;
    }

    public String getSpecialConditions() {
        return specialConditions;
    }

    public void setSpecialConditions(String specialConditions) {
        this.specialConditions = specialConditions;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public BigDecimal getLoadedDistance() {
        return loadedDistance;
    }

    public void setLoadedDistance(BigDecimal loadedDistance) {
        this.loadedDistance = loadedDistance;
    }

    public BigDecimal getEmptyDistance() {
        return emptyDistance;
    }

    public void setEmptyDistance(BigDecimal emptyDistance) {
        this.emptyDistance = emptyDistance;
    }

    public BigDecimal getPlannedDuration() {
        return plannedDuration;
    }

    public void setPlannedDuration(BigDecimal plannedDuration) {
        this.plannedDuration = plannedDuration;
    }

    public BigDecimal getRevenue() {
        return revenue;
    }

    public void setRevenue(BigDecimal revenue) {
        this.revenue = revenue;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
