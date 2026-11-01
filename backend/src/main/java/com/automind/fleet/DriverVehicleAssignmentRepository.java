package com.automind.fleet;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverVehicleAssignmentRepository extends JpaRepository<DriverVehicleAssignmentEntity, Long> {

    Optional<DriverVehicleAssignmentEntity> findByVehicleIdAndIsActiveTrue(Long vehicleId);

    Optional<DriverVehicleAssignmentEntity> findByDriverIdAndIsActiveTrue(Long driverId);

    List<DriverVehicleAssignmentEntity> findByIsActiveTrue();
}
