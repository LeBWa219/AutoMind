package com.automind.trip;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Выполненный рейс (ТЗ 7.2.7). */
@Entity
@Table(name = "trips")
public class TripEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "start_location", nullable = false, length = 120)
    private String startLocation;

    @Column(name = "end_location", nullable = false, length = 120)
    private String endLocation;

    @Column(nullable = false, precision = 8, scale = 1)
    private BigDecimal distance;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal duration;

    @Column(name = "fuel_consumption", nullable = false, precision = 8, scale = 1)
    private BigDecimal fuelConsumption;

    @Column(name = "fuel_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal fuelCost;

    @Column(name = "total_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    @Column(nullable = false, length = 20)
    private String status;

    public Long getId() {
        return id;
    }

    public Long getDriverId() {
        return driverId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public String getStartLocation() {
        return startLocation;
    }

    public String getEndLocation() {
        return endLocation;
    }

    public BigDecimal getDistance() {
        return distance;
    }

    public BigDecimal getDuration() {
        return duration;
    }

    public BigDecimal getFuelConsumption() {
        return fuelConsumption;
    }

    public BigDecimal getFuelCost() {
        return fuelCost;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public LocalDate getTripDate() {
        return tripDate;
    }

    public String getStatus() {
        return status;
    }
}
