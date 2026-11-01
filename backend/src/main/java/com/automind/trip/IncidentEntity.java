package com.automind.trip;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** ДТП и эксплуатационные события (ТЗ 7.2.8). Виновность отделена от факта (ТЗ 5.8). */
@Entity
@Table(name = "incidents")
public class IncidentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "incident_type", nullable = false, length = 20)
    private String incidentType;

    @Column(length = 255)
    private String description;

    @Column(name = "accident_date", nullable = false)
    private LocalDate accidentDate;

    @Column(name = "fault_status", nullable = false, length = 20)
    private String faultStatus;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Long getId() {
        return id;
    }

    public Long getDriverId() {
        return driverId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public String getIncidentType() {
        return incidentType;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getAccidentDate() {
        return accidentDate;
    }

    public String getFaultStatus() {
        return faultStatus;
    }
}
