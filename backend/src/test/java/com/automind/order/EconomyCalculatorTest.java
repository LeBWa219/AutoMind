package com.automind.order;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Модульные тесты формул расчёта (ТЗ 10.4): топливо, оплата труда, обслуживание,
 * общая себестоимость, прибыль, рентабельность, нулевые и незаполненные значения.
 * Контрольные числа сверены с фактическим расчётом заказа на тестовой базе.
 */
class EconomyCalculatorTest {

    private static final BigDecimal D185 = new BigDecimal("185");
    private static final BigDecimal D40 = new BigDecimal("40");
    private static final BigDecimal RATE = new BigDecimal("18.50");
    private static final BigDecimal PRICE = new BigDecimal("62.50");
    private static final BigDecimal HOURS = new BigDecimal("6");
    private static final BigDecimal HOUR_RATE = new BigDecimal("320");
    private static final BigDecimal MAINT = new BigDecimal("4.20");
    private static final BigDecimal TOLL = new BigDecimal("1250");
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal REVENUE = new BigDecimal("86500");

    @Test
    void топливо_учитывает_порожний_пробег() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        // 225 км * 18.5 / 100 = 41.625 -> 41.63 л (HALF_UP)
        assertEquals(new BigDecimal("41.63"), costs.fuelVolume());
        // 41.63 * 62.50 = 2601.875 -> 2601.88 ₽
        assertEquals(new BigDecimal("2601.88"), costs.fuelCost());
    }

    @Test
    void оплата_труда_по_часам() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        // 6 ч * 320 = 1920.00 ₽ (ТЗ 5.5.2)
        assertEquals(new BigDecimal("1920.00"), costs.driverCost());
    }

    @Test
    void обслуживание_за_километр() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        // 225 * 4.20 = 945.00 ₽ (ТЗ 5.5.3)
        assertEquals(new BigDecimal("945.00"), costs.maintenanceCost());
    }

    @Test
    void общая_себестоимость_складывается_из_всех_статей() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        // 2601.88 + 1920 + 945 + 1250 + 0 + 0 = 6716.88 ₽ (ТЗ 5.5.4)
        assertEquals(new BigDecimal("6716.88"), costs.totalCost());
    }

    @Test
    void прибыль_и_рентабельность() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        // PROFIT = 86500 - 6716.88 = 79783.12 (ТЗ 5.5.5)
        assertEquals(new BigDecimal("79783.12"), costs.profit());
        // PROFITABILITY = 79783.12 / 86500 * 100 = 92.2339... -> 92.23 (ТЗ 5.5.6)
        assertEquals(new BigDecimal("92.23"), costs.profitability());
    }

    @Test
    void нулевая_выручка_отклоняется() {
        assertThrows(IllegalArgumentException.class,
                () -> EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, ZERO));
    }

    @Test
    void незаполненное_поле_не_считается_нулём() {
        // ТЗ 5.3.3: пустое поле не равно нулю — null отклоняется с сообщением
        var e = assertThrows(IllegalArgumentException.class,
                () -> EconomyCalculator.calculate(D185, D40, RATE, null, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE));
        assertEquals("Заполните поле «Стоимость топлива» или укажите 0 (пустое поле не равно нулю)", e.getMessage());
    }

    @Test
    void нулевой_дополнительный_пробег_допустим_явно() {
        // ТЗ 5.3.2: порожний пробег 0 — допустимо, если указан явно
        var costs = EconomyCalculator.calculate(D185, ZERO, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE);
        assertEquals(new BigDecimal("34.23"), costs.fuelVolume()); // 185 * 18.5 / 100 = 34.225 -> 34.23
        assertEquals(new BigDecimal("2139.38"), costs.fuelCost()); // 34.23 * 62.50 = 2139.375 -> 2139.38
    }

    @Test
    void отрицательное_расстояние_отклоняется() {
        assertThrows(IllegalArgumentException.class,
                () -> EconomyCalculator.calculate(new BigDecimal("-5"), D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO, REVENUE));
    }

    @Test
    void убыточный_заказ_даёт_отрицательную_рентабельность() {
        var costs = EconomyCalculator.calculate(D185, D40, RATE, PRICE, HOURS, HOUR_RATE, MAINT, TOLL, ZERO, ZERO,
                new BigDecimal("5000"));
        assertEquals(new BigDecimal("-1716.88"), costs.profit());
        assertEquals(new BigDecimal("-34.34"), costs.profitability());
    }
}
