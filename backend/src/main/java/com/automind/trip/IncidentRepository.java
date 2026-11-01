package com.automind.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentRepository extends JpaRepository<IncidentEntity, Long> {
    List<IncidentEntity> findByDriverIdOrderByAccidentDateDesc(Long driverId);

    List<IncidentEntity> findByDriverId(Long driverId);
}
