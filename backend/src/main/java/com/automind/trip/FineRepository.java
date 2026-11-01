package com.automind.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FineRepository extends JpaRepository<FineEntity, Long> {
    List<FineEntity> findByDriverIdOrderByIssuedAtDesc(Long driverId);

    List<FineEntity> findByDriverId(Long driverId);
}
