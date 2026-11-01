package com.automind.telemetry;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API телеметрии (ТЗ 4.9): GET /api/telemetry (автопарк), GET /api/vehicles/{id}/telemetry.
 * Основной канал обновлений — WebSocket /ws/telemetry; REST используется для
 * первичной загрузки и как fallback при потере соединения (ТЗ 9.2).
 */
@RestController
@RequestMapping("/api")
public class TelemetryController {

    private final TelemetrySimulator simulator;

    public TelemetryController(TelemetrySimulator simulator) {
        this.simulator = simulator;
    }

    @GetMapping("/telemetry")
    public List<TelemetryEntity> fleet() {
        return simulator.latestAll();
    }

    @GetMapping("/vehicles/{id}/telemetry")
    public TelemetryEntity forVehicle(@PathVariable Long id) {
        return simulator.latestForVehicle(id);
    }
}
