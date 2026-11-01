package com.automind.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderCalculationRepository extends JpaRepository<OrderCalculationEntity, Long> {
    List<OrderCalculationEntity> findByOrderIdOrderByTotalScoreDesc(Long orderId);

    Optional<OrderCalculationEntity> findByOrderIdAndDriverId(Long orderId, Long driverId);

    List<OrderCalculationEntity> findByOrderId(Long orderId);

    void deleteByOrderId(Long orderId);
}
