package com.automind.telemetry;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<RouteEntity, Long> {
    Optional<RouteEntity> findFirstByVehicleId(Long vehicleId);

    List<RouteEntity> findAllByOrderByVehicleIdAsc();
}
