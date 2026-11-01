package com.automind.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScoringWeightRepository extends JpaRepository<ScoringWeightEntity, Long> {
    List<ScoringWeightEntity> findByCargoType(String cargoType);
}
