package com.automind.telemetry;

import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;

/** WebSocket-хендлер /ws/telemetry: регистрация подписчиков и мгновенный слепок при подключении (ТЗ 4.7). */
@Component
public class TelemetryWebSocketHandler extends TextWebSocketHandler {

    private final TelemetryBroadcaster broadcaster;
    private final TelemetrySimulator simulator;
    private final ObjectMapper objectMapper;

    public TelemetryWebSocketHandler(TelemetryBroadcaster broadcaster,
                                     TelemetrySimulator simulator,
                                     ObjectMapper objectMapper) {
        this.broadcaster = broadcaster;
        this.simulator = simulator;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        broadcaster.register(session);
        List<TelemetryEntity> snapshot = simulator.latestAll();
        if (!snapshot.isEmpty()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(snapshot)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        broadcaster.unregister(session);
    }
}
