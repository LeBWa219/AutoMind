package com.automind.trip;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripRepository extends JpaRepository<TripEntity, Long> {

    List<TripEntity> findByDriverIdOrderByTripDateDesc(Long driverId, Pageable pageable);

    List<TripEntity> findByDriverIdOrderByTripDateDesc(Long driverId);

    List<TripEntity> findByDriverIdAndStatusOrderByTripDateDesc(Long driverId, String status, Pageable pageable);
}
