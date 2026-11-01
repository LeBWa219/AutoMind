package com.automind.assistant;

import com.automind.common.ApiException;
import com.automind.fleet.DriverEntity;
import com.automind.fleet.DriverRepository;
import com.automind.order.OrderCalculationEntity;
import com.automind.order.OrderCalculationRepository;
import com.automind.order.OrderRepository;
import com.automind.order.OrderService;
import com.automind.trip.IncidentEntity;
import com.automind.trip.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * AI Logistics Copilot — программная заглушка (ТЗ разд. 6).
 *
 * Отвечает по шаблонам на основе контекста из backend: заказ, результаты
 * расчёта, кандидаты, история ДТП и штрафов. Не придумывает показатели:
 * если данных недостаточно — прямо об этом сообщает. Архитектура позволяет
 * заменить заглушку внешней LLM без изменения бизнес-логики (ТЗ 6.7):
 * LLM получает только подготовленный контекст.
 */
@Service
public class AssistantService {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final OrderCalculationRepository calculationRepository;
    private final DriverRepository driverRepository;
    private final IncidentRepository incidentRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;

    public AssistantService(OrderService orderService,
                            OrderRepository orderRepository,
                            OrderCalculationRepository calculationRepository,
                            DriverRepository driverRepository,
                            IncidentRepository incidentRepository,
                            ChatMessageRepository chatMessageRepository,
                            ObjectMapper objectMapper) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.calculationRepository = calculationRepository;
        this.driverRepository = driverRepository;
        this.incidentRepository = incidentRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
    }

    public record Recommendation(Long driverId, String reason) {
    }

    public record AssistantResponse(String answer, Recommendation recommendation) {
    }

    public record ChatHistoryItem(Long id, Long orderId, String message, String response,
                                  java.time.OffsetDateTime createdAt) {
    }

    private static final String HELP_WITHOUT_ORDER =
            "Я — AI Logistics Copilot. Помогаю разобраться с экономикой перевозок и выбором водителя.\n\n" +
            "Чтобы я работал с цифрами конкретного заказа, выберите заказ в панели справа — " +
            "и спрашивайте, например:\n" +
            "• «Почему перевозка этим водителем дороже?»\n" +
            "• «Кого лучше отправить на перевозку хрупкого груза?»\n" +
            "• «Почему система рекомендует второго водителя, если первый дешевле?»\n" +
            "• «Из чего состоит себестоимость?»\n" +
            "• «Какой у водителей риск ДТП и штрафов?»";

    // --- Точка входа -------------------------------------------------------------

    @Transactional
    public AssistantResponse answer(String message, Long orderId, Long userId) {
        if (message == null || message.isBlank()) {
            throw ApiException.badRequest("Введите сообщение");
        }
        String answer;
        Recommendation recommendation = null;

        if (orderId == null) {
            answer = HELP_WITHOUT_ORDER;
        } else {
            var order = orderRepository.findById(orderId)
                    .orElseThrow(() -> ApiException.notFound("Заказ не найден"));
            var analysis = orderService.analysis(orderId);
            var calculatedRows = calculationRepository.findByOrderIdOrderByTotalScoreDesc(orderId);
            if (calculatedRows.isEmpty()) {
                answer = "Для заказа №" + orderId + " расчёт ещё не выполнен. Запустите «Рассчитать " +
                        "себестоимость» — и я смогу объяснить себестоимость, сравнить водителей и обосновать " +
                        "рекомендацию. Выдумывать показатели я не буду (ТЗ 6.5).";
            } else {
                Context ctx = buildContext(orderId, order, analysis, calculatedRows);
                Answer routed = route(message, ctx);
                answer = routed.text();
                recommendation = routed.recommendation();
            }
        }

        ChatMessageEntity row = new ChatMessageEntity();
        row.setUserId(userId);
        row.setOrderId(orderId);
        row.setMessage(message);
        row.setResponse(answer);
        chatMessageRepository.save(row);
        return new AssistantResponse(answer, recommendation);
    }

    // --- Контекст заказа -----------------------------------------------------------

    /** Контекст для шаблонов: только реальные данные из БД и расчётов. */
    private class Context {
        OrderService.OrderDto order;
        OrderService.AnalysisDto analysis;
        Long bestDriverId;
        OrderService.CandidateDto best;
        OrderService.CandidateDto cheapest;
        Map<String, Integer> weights = Map.of();
        String fuelRateSource = "";
        String cargoLabel;
        boolean assigned;
    }

    private Context buildContext(Long orderId, com.automind.order.OrderEntity order,
                                 OrderService.AnalysisDto analysis,
                                 List<OrderCalculationEntity> rows) {
        Context ctx = new Context();
        ctx.order = orderService.toDto(order);
        ctx.analysis = analysis;
        ctx.bestDriverId = analysis.bestCandidateId();
        ctx.best = analysis.candidates().stream()
                .filter(c -> Objects.equals(c.driverId(), ctx.bestDriverId))
                .findFirst().orElse(null);
        ctx.cheapest = analysis.candidates().stream()
                .filter(c -> c.status() == OrderService.CandidateStatus.AVAILABLE)
                .reduce((a, b) -> a.totalCost().compareTo(b.totalCost()) <= 0 ? a : b)
                .orElse(null);
        ctx.assigned = "ASSIGNED".equals(order.getStatus()) || !"NEW".equals(order.getStatus())
                && assignmentExists(orderId);
        ctx.cargoLabel = cargoLabel(order.getCargoType());
        OrderCalculationEntity bestRow = rows.stream()
                .filter(r -> ctx.bestDriverId != null && Objects.equals(r.getDriverId(), ctx.bestDriverId))
                .findFirst()
                .orElse(rows.get(0));
        try {
            JsonNode snap = objectMapper.readTree(bestRow.getCalculationSnapshot());
            if (snap.has("weights") && snap.get("weights").isObject()) {
                Map<String, Integer> weights = new java.util.HashMap<>();
                snap.get("weights").properties().forEach(e -> weights.put(e.getKey(), e.getValue().asInt()));
                ctx.weights = weights;
            }
            if (snap.has("fuelRateSource")) {
                ctx.fuelRateSource = snap.get("fuelRateSource").asString("");
            }
        } catch (Exception e) {
            // снимок недоступен — весовые пояснения будут опущены, цифры остаются из расчётов
        }
        return ctx;
    }

    private boolean assignmentExists(Long orderId) {
        return orderService.get(orderId).assignedDriver() != null;
    }

    private String cargoLabel(String cargoType) {
        return switch (cargoType) {
            case "ORDINARY" -> "обычный";
            case "FRAGILE" -> "хрупкий";
            case "DANGEROUS" -> "опасный";
            case "PERISHABLE" -> "скоропортящийся";
            case "OVERSIZED" -> "крупногабаритный";
            default -> "другой";
        };
    }

    // --- Маршрутизация интентов ------------------------------------------------------

    private record Answer(String text, Recommendation recommendation) {
    }

    private Answer route(String message, Context ctx) {
        String m = message.toLowerCase();

        if (m.matches(".*(привет|здравствуй|что ты умеешь|помощь|help).*")) {
            return new Answer(helpText(ctx), null);
        }
        if (m.matches(".*(рекоменд|кого.*(отправить|выбрать|назначить)|кто лучше|кого лучше|советуешь).*")) {
            return recommend(ctx);
        }
        if (m.matches(".*(почему.*(дороже|дешевле|рекоменд)|разниц|различ|дороже|дешевле).*")) {
            return explainDifference(ctx);
        }
        if (m.matches(".*(затратн|составляющ|больше всего.*расход|что.*дороже всего).*")) {
            return new Answer(mostExpensivePart(ctx), null);
        }
        if (m.matches(".*(себестоимост|из чего состоит|расчёт|стоимость.*состоит|стоит так).*")) {
            return new Answer(costBreakdown(ctx, null), null);
        }
        if (m.matches(".*(дтп|авари|штраф|нарушен|историю|история).*")) {
            return new Answer(incidentAnalysis(ctx, m), null);
        }
        if (m.matches(".*(риск|риски|опасн|надёжн).*")) {
            return new Answer(riskAssessment(ctx), null);
        }
        if (m.matches(".*(рентабельн|прибыль|окупаемость).*")) {
            return new Answer(profitabilityExplanation(ctx), null);
        }
        if (m.matches(".*(груз|хрупк|опасн|скоропорт|крупногабарит).*")) {
            return new Answer(cargoInfluence(ctx), null);
        }

        // Поиск водителя по фамилии в вопросе
        for (OrderService.CandidateDto c : ctx.analysis.candidates()) {
            String surname = c.driverName().split(" ")[0].toLowerCase();
            if (m.contains(surname)) {
                return new Answer(driverProfile(ctx, c), null);
            }
        }

        return new Answer(fallbackSummary(ctx), null);
    }

    // --- Шаблоны ответов -----------------------------------------------------------

    private String helpText(Context ctx) {
        return "Работаю с заказом №" + ctx.order.id() + " «" + ctx.order.orderName() + "» (" +
                ctx.cargoLabel + " груз, " + ctx.order.cargoWeight() + " кг).\n\nМогу объяснить: " +
                "себестоимость, разницу между водителями, обосновать рекомендацию, разобрать историю ДТП и " +
                "штрафов, оценить риски и рентабельность. Все цифры беру из выполненного расчёта.";
    }

    private Answer recommend(Context ctx) {
        OrderService.CandidateDto best = ctx.best;
        if (best == null) {
            return new Answer("Среди кандидатов нет доступных водителей: все исключены по ограничениям " +
                    "(грузоподъёмность, обслуживание) или заняты. Рекомендацию дать честно не могу.", null);
        }
        StringBuilder sb = new StringBuilder();
        sb.append("По заказу №").append(ctx.order.id()).append(" «").append(ctx.order.orderName())
                .append("» (").append(ctx.cargoLabel).append(" груз, ").append(ctx.order.cargoWeight())
                .append(" кг) я рекомендую ").append(best.driverName()).append(".\n\n");
        sb.append("Аргументы из расчёта:\n");
        sb.append("• итоговая оценка — ").append(best.totalScore()).append(" из 100, риск ")
                .append(fmtNum(best.riskScore())).append(" из 100;\n");
        sb.append("• прогноз себестоимости — ").append(money(best.totalCost()))
                .append(", прибыль ").append(money(best.profit()))
                .append(" (рентабельность ").append(fmtNum(best.profitability())).append(" %);\n");
        sb.append("• история: ДТП с виной — ").append(best.faultAccidents())
                .append(", нарушений — ").append(best.violations())
                .append(", штрафы — ").append(money(best.finesTotal()));
        if (best.insufficientData()) {
            sb.append(";\n• данных мало: оценка опиралась на нормативы автомобиля (ТЗ 5.6)");
        }
        sb.append(".\n\n");
        if (!ctx.weights.isEmpty()) {
            sb.append("Веса критериев для груза типа «").append(ctx.cargoLabel).append("»: ");
            sb.append(weightsText(ctx.weights));
            sb.append(".\n");
        }
        if (ctx.order.assignedDriver() != null) {
            sb.append("\nНа заказ уже назначен водитель: ")
              .append(shortName(ctx.order.assignedDriver().driverName())).append(".");
        }
        sb.append("\nОкончательное решение принимает диспетчер (ТЗ 1.5).");
        String reason = best.riskScore().compareTo(new BigDecimal("15")) <= 0
                ? "Минимальный эксплуатационный риск — " + fmtNum(best.riskScore()) + "/100"
                : "Лучший итоговый баланс экономики и рисков — оценка " + best.totalScore() + "/100";
        return new Answer(sb.toString(), new Recommendation(best.driverId(), reason));
    }

    private Answer explainDifference(Context ctx) {
        OrderService.CandidateDto cheapest = ctx.cheapest;
        OrderService.CandidateDto best = ctx.best;
        if (cheapest == null || best == null) {
            return new Answer("Недостаточно данных: нет доступных кандидатов с расчётом.", null);
        }
        if (cheapest.driverId().equals(best.driverId())) {
            return new Answer(costBreakdown(ctx, best), best != null ? new Recommendation(best.driverId(),
                    "Минимальная себестоимость и минимальный риск одновременно") : null);
        }
        BigDecimal diff = cheapest.totalCost().subtract(best.totalCost()).abs();
        StringBuilder sb = new StringBuilder();
        sb.append("Самая низкая себестоимость у ").append(shortName(cheapest.driverName())).append(" — ")
                .append(money(cheapest.totalCost())).append(", у рекомендуемого ").append(shortName(best.driverName()))
                .append(" — ").append(money(best.totalCost())).append(". Разница — ").append(money(diff))
                .append(".\n\n");
        sb.append("Почему система всё равно рекомендует ").append(best.driverName().split(" ")[0]).append(":\n");
        sb.append("• риск: ").append(fmtNum(cheapest.riskScore())).append(" против ")
                .append(fmtNum(best.riskScore())).append(" у рекомендуемого (чем выше риск, тем вероятнее " +
                "ДТП, штрафы и срывы);\n");
        sb.append("• история эксплуатации: у ").append(shortName(cheapest.driverName())).append(" — ДТП с виной ")
                .append(cheapest.faultAccidents()).append(", нарушений ").append(cheapest.violations())
                .append(", штрафы ").append(money(cheapest.finesTotal())).append("; у ")
                .append(shortName(best.driverName())).append(" — ").append(best.faultAccidents())
                .append(", ").append(best.violations()).append(" и ").append(money(best.finesTotal()))
                .append(" соответственно.\n\n");
        sb.append("Экономическая эффективность и эксплуатационный риск взвешиваются вместе (ТЗ 5.8): " +
                "для груза типа «").append(ctx.cargoLabel).append("» вес истории ДТП повышен. " +
                "Итоговые оценки: ").append(best.driverName().split(" ")[0]).append(" — ")
                .append(best.totalScore()).append(", ").append(shortName(cheapest.driverName()))
                .append(" — ").append(cheapest.totalScore()).append(".");
        return new Answer(sb.toString(), new Recommendation(best.driverId(),
                "Более низкий эксплуатационный риск при сопоставимой себестоимости"));
    }

    private String costBreakdown(Context ctx, OrderService.CandidateDto target) {
        OrderService.CandidateDto c = target != null ? target : ctx.best != null ? ctx.best : ctx.cheapest;
        if (c == null) {
            return "Нет кандидатов с расчётом.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Себестоимость заказа №").append(ctx.order.id()).append(" для ").append(shortName(c.driverName()))
                .append(" — ").append(money(c.totalCost())).append(". Состав по расчёту:\n");
        sb.append("• топливо: ").append(money(c.fuelCost()))
                .append(" (маршрут ").append(fmtNum(ctx.order.loadedDistance().add(ctx.order.emptyDistance())))
                .append(" км — ").append(fmtNum(ctx.order.loadedDistance())).append(" с грузом + ")
                .append(fmtNum(ctx.order.emptyDistance())).append(" порожний);\n");
        sb.append("• оплата труда водителя: ").append(money(c.driverCost()))
                .append(" (").append(fmtNum(ctx.order.plannedDuration())).append(" ч);\n");
        sb.append("• обслуживание автомобиля: ").append(money(c.maintenanceCost())).append(";\n");
        sb.append("• платные дороги: ").append(money(c.tollCost())).append(";\n");
        sb.append("• дополнительные расходы: ").append(money(c.additionalCost()))
                .append("; прочие: ").append(money(c.otherCost())).append(".\n\n");
        sb.append("Выручка ").append(money(c.revenue())).append(", прибыль ").append(money(c.profit()))
                .append(", рентабельность ").append(fmtNum(c.profitability())).append(" %.");
        return sb.toString();
    }

    private String mostExpensivePart(Context ctx) {
        OrderService.CandidateDto c = ctx.best != null ? ctx.best : ctx.cheapest;
        if (c == null) {
            return "Нет кандидатов с расчётом.";
        }
        Map<String, BigDecimal> parts = new java.util.LinkedHashMap<>();
        parts.put("топливо", c.fuelCost());
        parts.put("оплата труда", c.driverCost());
        parts.put("обслуживание", c.maintenanceCost());
        parts.put("платные дороги", c.tollCost());
        parts.put("дополнительные расходы", c.additionalCost());
        parts.put("прочие расходы", c.otherCost());
        var max = parts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);
        StringBuilder sb = new StringBuilder();
        sb.append("Для ").append(shortName(c.driverName())).append(" самая затратная составляющая — ")
                .append(max.getKey()).append(": ").append(money(max.getValue()))
                .append(" из ").append(money(c.totalCost())).append(" общей себестоимости.\n\n");
        sb.append("Полный состав:\n");
        parts.forEach((k, v) -> sb.append("• ").append(k).append(" — ").append(money(v)).append("\n"));
        return sb.toString();
    }

    private String incidentAnalysis(Context ctx, String message) {
        StringBuilder sb = new StringBuilder();
        for (OrderService.CandidateDto c : ctx.analysis.candidates()) {
            if (c.status() == OrderService.CandidateStatus.EXCLUDED) continue;
            sb.append("• ").append(shortName(c.driverName())).append(": ДТП с виной — ").append(c.faultAccidents())
                    .append(", нарушений — ").append(c.violations()).append(", штрафы — ")
                    .append(money(c.finesTotal())).append(".\n");
        }
        String result = sb.toString();
        if (result.isEmpty()) {
            return "История ДТП и штрафов по кандидатам недоступна.";
        }
        return "История ДТП и штрафов по кандидатам заказа №" + ctx.order.id() + ":\n" + result +
                "\nФакт события и установленная виновность разделяются в системе (ТЗ 5.8): ДТП без вины " +
                "не влияет на риск.";
    }

    private String riskAssessment(Context ctx) {
        StringBuilder sb = new StringBuilder();
        for (OrderService.CandidateDto c : ctx.analysis.candidates()) {
            if (c.status() == OrderService.CandidateStatus.EXCLUDED) continue;
            BigDecimal r = c.riskScore();
            String level = r.compareTo(new BigDecimal("70")) >= 0 ? "высокий" : r.compareTo(new BigDecimal("40")) >= 0 ? "повышенный" : r.compareTo(new BigDecimal("15")) >= 0 ? "умеренный" : "низкий";
            sb.append("• ").append(shortName(c.driverName())).append(" — риск ").append(fmtNum(c.riskScore()))
                    .append(" из 100 (").append(level).append(");\n");
        }
        return "Оценка рисков по заказу №" + ctx.order.id() + ":\n" + sb +
                "\nРиск складывается из ДТП (50 %), нарушений (30 %) и штрафов на рейс (20 %) — решение п.4.";
    }

    private String profitabilityExplanation(Context ctx) {
        OrderService.CandidateDto c = ctx.best != null ? ctx.best : ctx.cheapest;
        if (c == null) {
            return "Нет кандидатов с расчётом.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Рентабельность для ").append(shortName(c.driverName())).append(" — ")
                .append(fmtNum(c.profitability())).append(" %: прибыль ").append(money(c.profit()))
                .append(" при выручке ").append(money(c.revenue())).append(".\n\n");
        if (c.profitability().compareTo(new BigDecimal("10")) < 0) {
            sb.append("Рентабельность низкая. Основные причины:\n");
            sb.append("• себестоимость ").append(money(c.totalCost()))
                    .append(" составляет значительную часть выручки;\n");
            var mostExpensive = mostExpensivePartName(c);
            sb.append("• главная статья расходов — ").append(mostExpensive.getKey()).append(" (")
                    .append(money(mostExpensive.getValue())).append(");\n");
            sb.append("• возможные действия: пересмотреть выручку, сократить порожний пробег (сейчас ")
                    .append(fmtNum(ctx.order.emptyDistance())).append(" км) или сравнить других кандидатов.");
        } else {
            sb.append("Рентабельность в норме: заказ окупается с запасом.");
        }
        return sb.toString();
    }

    private String cargoInfluence(Context ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("Груз в заказе №").append(ctx.order.id()).append(" — ").append(ctx.cargoLabel)
                .append(", ").append(ctx.order.cargoWeight()).append(" кг");
        if (ctx.order.cargoVolume() != null) {
            sb.append(", ").append(ctx.order.cargoVolume()).append(" м³");
        }
        sb.append(".\n\n");
        sb.append("Для хрупкого груза система повышает вес истории ДТП до 35 % и надёжности до 15 % (решение п.5): ");
        sb.append("повреждения груза чаще связаны с резкими манёврами, поэтому важнее аккуратность, а не только цена.\n");
        sb.append("Для обычного груза больший вес имеет экономическая эффективность (35 %).\n\n");
        if (!ctx.weights.isEmpty()) {
            sb.append("Текущие веса: ").append(weightsText(ctx.weights)).append(".");
        }
        sb.append("Отсев по грузоподъёмности уже применён: кандидаты с недостаточной ТС исключены.");
        return sb.toString();
    }

    private String driverProfile(Context ctx, OrderService.CandidateDto c) {
        StringBuilder sb = new StringBuilder();
        sb.append(c.driverName()).append(" — ").append(c.vehicleLabel()).append(".\n\n");
        if (c.statusReason() != null) {
            sb.append("Статус: ").append(c.statusReason()).append(".\n");
        }
        if (c.totalCost().signum() > 0) {
            sb.append("Расчёт по заказу: себестоимость ").append(money(c.totalCost()))
                    .append(", прибыль ").append(money(c.profit()))
                    .append(", оценка ").append(c.totalScore()).append(", риск ")
                    .append(fmtNum(c.riskScore())).append(".\n");
        }
        sb.append("История: ДТП с виной ").append(c.faultAccidents()).append(", нарушений ")
                .append(c.violations()).append(", штрафы ").append(money(c.finesTotal()));
        if (c.insufficientData()) {
            sb.append(". Истории рейсов мало — показатели взяты с осторожностью.");
        } else {
            sb.append(".");
        }
        List<IncidentEntity> incidents = incidentRepository.findByDriverId(c.driverId());
        if (!incidents.isEmpty() && c.status() != OrderService.CandidateStatus.EXCLUDED) {
            sb.append("\nПоследние события:\n");
            incidents.stream().limit(3).forEach(i -> sb.append("• ")
                    .append(i.getAccidentDate())
                    .append(" — ").append("ACCIDENT".equals(i.getIncidentType()) ? "ДТП" : "нарушение")
                    .append(" (").append(i.getDescription()).append("), виновность: ")
                    .append("FAULT_FOUND".equals(i.getFaultStatus()) ? "виновен"
                            : "NO_FAULT".equals(i.getFaultStatus()) ? "не виновен" : "устанавливается")
                    .append("\n"));
        }
        return sb.toString();
    }

    private String fallbackSummary(Context ctx) {
        OrderService.CandidateDto c = ctx.best;
        StringBuilder sb = new StringBuilder();
        sb.append("Я не нашёл в вопросе знакомого сценария, но вот положение по заказу №")
                .append(ctx.order.id()).append(" «").append(ctx.order.orderName()).append("»:\n");
        sb.append("• ").append(ctx.cargoLabel).append(" груз, ").append(ctx.order.cargoWeight())
                .append(" кг, ").append(fmtNum(ctx.order.loadedDistance().add(ctx.order.emptyDistance())))
                .append(" км, выручка ").append(money(ctx.order.revenue())).append(";\n");
        if (c != null) {
            sb.append("• рекомендуемый кандидат — ").append(c.driverName())
                    .append(" (оценка ").append(c.totalScore()).append(", риск ")
                    .append(fmtNum(c.riskScore())).append(").\n");
        }
        sb.append("\nСпросите, например: «Из чего состоит себестоимость?», «Кого отправить?», " +
                "«Почему дороже у Гулиева?», «Какие риски у Ерёмина?»");
        return sb.toString();
    }

    // --- Утилиты -----------------------------------------------------------------

    private Map.Entry<String, BigDecimal> mostExpensivePartName(OrderService.CandidateDto c) {
        Map<String, BigDecimal> parts = new java.util.LinkedHashMap<>();
        parts.put("топливо", c.fuelCost());
        parts.put("оплата труда", c.driverCost());
        parts.put("обслуживание", c.maintenanceCost());
        parts.put("платные дороги", c.tollCost());
        parts.put("дополнительные расходы", c.additionalCost());
        parts.put("прочие расходы", c.otherCost());
        return parts.entrySet().stream().max(Map.Entry.comparingByValue()).orElse(Map.entry("топливо", BigDecimal.ZERO));
    }

    private String weightsText(Map<String, Integer> weights) {
        Map<String, String> labels = Map.of(
                "ECONOMIC", "экономика",
                "ACCIDENT", "история ДТП",
                "VIOLATION", "нарушения и штрафы",
                "FUEL", "расход топлива",
                "RELIABILITY", "надёжность");
        StringBuilder sb = new StringBuilder();
        labels.forEach((k, label) -> {
            Integer w = weights.get(k);
            if (w != null) {
                if (sb.length() > 0) {
                    sb.append(", ");
                }
                sb.append(label).append(" ").append(w).append(" %");
            }
        });
        return sb.toString();
    }

    /** Фамилия и инициалы: «Смирнов П. В.» */
    private String shortName(String fullName) {
        String[] parts = fullName.trim().split("\s+");
        if (parts.length < 2) {
            return fullName;
        }
        StringBuilder sb = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                sb.append(" ").append(parts[i].charAt(0)).append(".");
            }
        }
        return sb.toString();
    }

    private String money(BigDecimal value) {
        if (value == null) {
            return "0 ₽";
        }
        return String.format(Locale.forLanguageTag("ru"), "%,.2f ₽", value);
    }

    private String fmtNum(Number value) {
        if (value == null) {
            return "0";
        }
        return String.format(Locale.forLanguageTag("ru"), "%,.2f", value.doubleValue()).replaceAll("[,.]0{1,2}$", "");
    }

    // --- История (ТЗ 6.6) ----------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ChatHistoryItem> history(Long userId, Long orderId) {
        List<ChatMessageEntity> rows = orderId == null
                ? chatMessageRepository.findByUserIdOrderByCreatedAtAsc(userId)
                : chatMessageRepository.findByUserIdAndOrderIdOrderByCreatedAtAsc(userId, orderId);
        return rows.stream()
                .map(r -> new ChatHistoryItem(r.getId(), r.getOrderId(), r.getMessage(), r.getResponse(), r.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void clearHistory(Long userId, Long orderId) {
        if (orderId == null) {
            chatMessageRepository.deleteByUserId(userId);
        } else {
            chatMessageRepository.deleteByUserIdAndOrderId(userId, orderId);
        }
    }
}
