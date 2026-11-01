package com.automind.order;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API экономического анализа (ТЗ 5.11): CRUD заказов, расчёт, кандидаты, назначение, история.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderService.OrderDto> list() {
        return orderService.listAll();
    }

    @GetMapping("/{id}")
    public OrderService.OrderDto get(@PathVariable Long id) {
        return orderService.get(id);
    }

    @PostMapping
    public ResponseEntity<OrderService.OrderDto> create(@Valid @RequestBody OrderService.OrderUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(request));
    }

    @PutMapping("/{id}")
    public OrderService.OrderDto update(@PathVariable Long id,
                                        @Valid @RequestBody OrderService.OrderUpsertRequest request) {
        return orderService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/calculate")
    public OrderService.AnalysisDto calculate(@PathVariable Long id,
                                              @Valid @RequestBody OrderService.CalculateRequest request) {
        return orderService.calculate(id, request.params());
    }

    @GetMapping("/{id}/analysis")
    public OrderService.AnalysisDto analysis(@PathVariable Long id) {
        return orderService.analysis(id);
    }

    @GetMapping("/{id}/candidates")
    public List<OrderService.CandidateDto> candidates(@PathVariable Long id) {
        return orderService.analysis(id).candidates();
    }

    @PostMapping("/{id}/assign")
    public OrderService.OrderDto assign(@PathVariable Long id,
                                        @Valid @RequestBody OrderService.AssignRequest request) {
        return orderService.assign(id, request.driverId());
    }

    @GetMapping("/{id}/history")
    public List<OrderService.HistoryEvent> history(@PathVariable Long id) {
        return orderService.history(id);
    }
}
