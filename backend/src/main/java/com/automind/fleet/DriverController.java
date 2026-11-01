package com.automind.fleet;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API водителей (ТЗ 4.9): GET/POST /api/drivers, GET/PUT /api/drivers/{id},
 * GET /api/drivers/{id}/trips, GET /api/drivers/{id}/incidents.
 */
@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    @GetMapping
    public List<DriverService.DriverDto> list() {
        return driverService.listAll();
    }

    @GetMapping("/{id}")
    public DriverService.DriverDto get(@PathVariable Long id) {
        return driverService.get(id);
    }

    @PostMapping
    public ResponseEntity<DriverService.DriverDto> create(@Valid @RequestBody DriverService.DriverUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(driverService.create(request));
    }

    @PutMapping("/{id}")
    public DriverService.DriverDto update(@PathVariable Long id,
                                          @Valid @RequestBody DriverService.DriverUpsertRequest request) {
        return driverService.update(id, request);
    }

    @GetMapping("/{id}/trips")
    public List<DriverService.TripDto> trips(@PathVariable Long id,
                                             @RequestParam(required = false) Integer limit) {
        return driverService.trips(id, limit);
    }

    @GetMapping("/{id}/incidents")
    public List<DriverService.IncidentDto> incidents(@PathVariable Long id) {
        return driverService.incidents(id);
    }
}
