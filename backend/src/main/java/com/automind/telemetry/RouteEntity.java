package com.automind.telemetry;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/** Маршрут (ТЗ 7.2.6). Координаты — JSON-массив [{"lat":..,"lng":..}, ...]. */
@Entity
@Table(name = "routes")
public class RouteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "route_name", nullable = false, length = 120)
    private String routeName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "route_coordinates", nullable = false, columnDefinition = "jsonb")
    private String routeCoordinates;

    @Column(name = "route_status", nullable = false, length = 20)
    private String routeStatus;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Long getId() {
        return id;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public String getRouteName() {
        return routeName;
    }

    public String getRouteCoordinates() {
        return routeCoordinates;
    }

    public String getRouteStatus() {
        return routeStatus;
    }
}
