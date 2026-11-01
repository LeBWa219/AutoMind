package com.automind.order;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Формулы расчёта себестоимости перевозки (ТЗ 5.5).
 * Все вычисления — на BigDecimal с округлением HALF_UP (ТЗ 5.5.6).
 * Класс не зависит от БД и Spring — покрывается модульными тестами (ТЗ 10.4).
 */
public final class EconomyCalculator {

    private EconomyCalculator() {
    }

    public record Costs(BigDecimal fuelVolume, BigDecimal fuelCost, BigDecimal driverCost,
                        BigDecimal maintenanceCost, BigDecimal totalCost, BigDecimal profit,
                        BigDecimal profitability) {
    }

    /**
     * @param loadedDistance  расстояние с грузом, км
     * @param emptyDistance   порожний пробег, км
     * @param fuelRate        расход топлива, л/100 км (индивидуальный или норматив — ТЗ 5.6)
     * @param fuelPrice       стоимость литра, ₽
     * @param plannedDuration плановое время, ч
     * @param driverHourlyRate ставка водителя, ₽/ч
     * @param maintenanceRate обслуживание, ₽/км
     */
    public static Costs calculate(BigDecimal loadedDistance, BigDecimal emptyDistance,
                                  BigDecimal fuelRate, BigDecimal fuelPrice,
                                  BigDecimal plannedDuration, BigDecimal driverHourlyRate,
                                  BigDecimal maintenanceRate, BigDecimal tollCost,
                                  BigDecimal additionalCost, BigDecimal otherCost,
                                  BigDecimal revenue) {
        require(loadedDistance, "Расстояние с грузом");
        require(emptyDistance, "Порожний пробег");
        require(fuelRate, "Расход топлива");
        require(fuelPrice, "Стоимость топлива");
        require(plannedDuration, "Плановое время");
        require(driverHourlyRate, "Оплата труда водителя");
        require(maintenanceRate, "Стоимость обслуживания");
        require(tollCost, "Стоимость платных дорог");
        require(additionalCost, "Дополнительные расходы");
        require(otherCost, "Прочие расходы");
        require(revenue, "Выручка");
        if (loadedDistance.signum() <= 0) {
            throw new IllegalArgumentException("Не указано расстояние маршрута");
        }
        if (emptyDistance.signum() < 0) {
            throw new IllegalArgumentException("Порожний пробег не может быть отрицательным");
        }
        if (plannedDuration.signum() <= 0) {
            throw new IllegalArgumentException("Плановое время должно быть больше нуля");
        }
        if (fuelPrice.signum() <= 0) {
            throw new IllegalArgumentException("Не задана стоимость топлива");
        }
        if (revenue.signum() <= 0) {
            throw new IllegalArgumentException("Укажите стоимость перевозки");
        }

        // TOTAL_DISTANCE = LOADED_DISTANCE + EMPTY_DISTANCE (ТЗ 5.5.1)
        BigDecimal totalDistance = loadedDistance.add(emptyDistance);
        // FUEL_VOLUME = TOTAL_DISTANCE * FUEL_RATE / 100
        BigDecimal fuelVolume = totalDistance.multiply(fuelRate)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        // FUEL_COST = FUEL_VOLUME * FUEL_PRICE
        BigDecimal fuelCost = fuelVolume.multiply(fuelPrice).setScale(2, RoundingMode.HALF_UP);
        // DRIVER_COST = TRIP_DURATION * DRIVER_HOURLY_RATE (ТЗ 5.5.2)
        BigDecimal driverCost = plannedDuration.multiply(driverHourlyRate).setScale(2, RoundingMode.HALF_UP);
        // MAINTENANCE_COST = TOTAL_DISTANCE * MAINTENANCE_RATE (ТЗ 5.5.3)
        BigDecimal maintenanceCost = totalDistance.multiply(maintenanceRate).setScale(2, RoundingMode.HALF_UP);
        // TOTAL_COST (ТЗ 5.5.4)
        BigDecimal totalCost = fuelCost.add(driverCost).add(maintenanceCost)
                .add(tollCost).add(additionalCost).add(otherCost)
                .setScale(2, RoundingMode.HALF_UP);
        // PROFIT = REVENUE - TOTAL_COST (ТЗ 5.5.5)
        BigDecimal profit = revenue.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);
        // PROFITABILITY = PROFIT / REVENUE * 100 (ТЗ 5.5.6)
        BigDecimal profitability = profit.multiply(BigDecimal.valueOf(100))
                .divide(revenue, 2, RoundingMode.HALF_UP);
        return new Costs(fuelVolume, fuelCost, driverCost, maintenanceCost, totalCost, profit, profitability);
    }

    private static void require(BigDecimal value, String label) {
        if (value == null) {
            throw new IllegalArgumentException("Заполните поле «" + label + "» или укажите 0 (пустое поле не равно нулю)");
        }
    }
}
