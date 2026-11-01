package com.automind.fleet;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API автомобилей (ТЗ 4.9): GET/POST /api/vehicles, GET/PUT /api/vehicles/{id},
 * PATCH /api/vehicles/{id}/status, PATCH /api/vehicles/{id}/driver (закрепление, ТЗ 4.3.1).
 */
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @GetMapping
    public List<VehicleService.VehicleDto> list() {
        return vehicleService.listAll();
    }

    @GetMapping("/{id}")
    public VehicleService.VehicleDto get(@PathVariable Long id) {
        return vehicleService.get(id);
    }

    @PostMapping
    public ResponseEntity<VehicleService.VehicleDto> create(@Valid @RequestBody VehicleService.VehicleUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vehicleService.create(request));
    }

    @PutMapping("/{id}")
    public VehicleService.VehicleDto update(@PathVariable Long id,
                                            @Valid @RequestBody VehicleService.VehicleUpsertRequest request) {
        return vehicleService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public VehicleService.VehicleDto changeStatus(@PathVariable Long id,
                                                  @Valid @RequestBody VehicleService.StatusRequest request) {
        return vehicleService.changeStatus(id, request.status());
    }

    @PatchMapping("/{id}/driver")
    public VehicleService.VehicleDto assignDriver(@PathVariable Long id,
                                                  @RequestBody VehicleService.DriverLinkRequest request) {
        return vehicleService.assignDriver(id, request == null ? null : request.driverId());
    }
}
