package com.automind.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/** Веса критериев оценки водителей (ТЗ 5.8, решение п.5). cargo_type NULL = базовый набор. */
@Entity
@Table(name = "scoring_weights")
public class ScoringWeightEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String criterion;

    @Column(name = "weight_percent", nullable = false)
    private int weightPercent;

    @Column(name = "cargo_type", length = 30)
    private String cargoType;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public String getCriterion() {
        return criterion;
    }

    public int getWeightPercent() {
        return weightPercent;
    }
}
