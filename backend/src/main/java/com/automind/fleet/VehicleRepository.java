package com.automind.fleet;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
    Optional<VehicleEntity> findByRegistrationNumberIgnoreCase(String registrationNumber);

    Optional<VehicleEntity> findByVinIgnoreCase(String vin);

    boolean existsByRegistrationNumberIgnoreCaseAndIdNot(String registrationNumber, Long id);

    boolean existsByVinIgnoreCaseAndIdNot(String vin, Long id);
}
