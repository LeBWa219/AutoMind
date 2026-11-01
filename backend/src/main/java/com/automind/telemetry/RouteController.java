package com.automind.telemetry;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** API маршрутов для отрисовки на карте (ТЗ 4.6). */
@RestController
@RequestMapping("/api/routes")
public class RouteController {

    public record RouteDto(Long id, Long vehicleId, String routeName, String routeCoordinates,
                           String routeStatus) {
    }

    private final RouteRepository routeRepository;

    public RouteController(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }

    @GetMapping
    public List<RouteDto> list() {
        return routeRepository.findAllByOrderByVehicleIdAsc().stream()
                .map(r -> new RouteDto(r.getId(), r.getVehicleId(), r.getRouteName(),
                        r.getRouteCoordinates(), r.getRouteStatus()))
                .toList();
    }
}
