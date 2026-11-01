package com.automind.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderAssignmentRepository extends JpaRepository<OrderAssignmentEntity, Long> {
    Optional<OrderAssignmentEntity> findByOrderIdAndAssignmentStatus(Long orderId, String status);

    List<OrderAssignmentEntity> findByDriverIdAndAssignmentStatus(Long driverId, String status);
}
