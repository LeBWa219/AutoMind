package com.automind.telemetry;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TelemetryRepository extends JpaRepository<TelemetryEntity, Long> {

    Optional<TelemetryEntity> findFirstByVehicleIdOrderByRecordedAtDesc(Long vehicleId);

    List<TelemetryEntity> findByVehicleIdOrderByRecordedAtDesc(Long vehicleId, Pageable pageable);
}
