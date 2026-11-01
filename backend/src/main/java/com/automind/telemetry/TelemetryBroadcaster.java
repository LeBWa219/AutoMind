package com.automind.telemetry;

import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Трансляция телеметрии всем подписчикам WebSocket /ws/telemetry (ТЗ 4.7).
 * Потеря соединения с одним клиентом не влияет на остальных (ТЗ 9.2).
 */
@Component
public class TelemetryBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(TelemetryBroadcaster.class);

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    public void register(WebSocketSession session) {
        sessions.add(session);
        log.info("Клиент телеметрии подключён: {}, всего: {}", session.getId(), sessions.size());
    }

    public void unregister(WebSocketSession session) {
        sessions.remove(session);
        log.info("Клиент телеметрии отключён: {}, осталось: {}", session.getId(), sessions.size());
    }

    public synchronized void broadcast(List<TelemetryEntity> telemetry, ObjectMapper objectMapper) {
        if (sessions.isEmpty() || telemetry.isEmpty()) {
            return;
        }
        try {
            String payload = objectMapper.writeValueAsString(telemetry);
            TextMessage message = new TextMessage(payload);
            for (WebSocketSession session : sessions) {
                try {
                    if (session.isOpen()) {
                        synchronized (session) {
                            session.sendMessage(message);
                        }
                    } else {
                        sessions.remove(session);
                    }
                } catch (IOException e) {
                    sessions.remove(session);
                }
            }
        } catch (RuntimeException e) {
            log.warn("Не удалось сериализовать телеметрию: {}", e.getMessage());
        }
    }
}
