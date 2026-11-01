package com.automind.assistant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    List<ChatMessageEntity> findByUserIdOrderByCreatedAtAsc(Long userId);

    List<ChatMessageEntity> findByUserIdAndOrderIdOrderByCreatedAtAsc(Long userId, Long orderId);

    void deleteByUserId(Long userId);

    void deleteByUserIdAndOrderId(Long userId, Long orderId);
}
