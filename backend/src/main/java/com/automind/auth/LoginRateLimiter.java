package com.automind.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Ограничение неудачных попыток входа: не более 5 за 5 минут на клиента
 * (ТЗ 3.4, решение п.9). In-memory — для MVP достаточно; при расширении
 * заменяется на хранение в БД/Redis без изменения контракта.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration WINDOW = Duration.ofMinutes(5);

    private record Window(int attempts, Instant resetAt) {
    }

    private final Map<String, Window> failures = new ConcurrentHashMap<>();

    /** Регистрирует неудачную попытку. */
    public void recordFailure(String clientKey) {
        Instant now = Instant.now();
        failures.compute(clientKey, (k, w) -> {
            if (w == null || now.isAfter(w.resetAt())) {
                return new Window(1, now.plus(WINDOW));
            }
            return new Window(w.attempts() + 1, w.resetAt());
        });
    }

    /** Сбрасывает счётчик после успешного входа. */
    public void reset(String clientKey) {
        failures.remove(clientKey);
    }

    /** Бросает 429, если лимит исчерпан. */
    public void checkAllowed(String clientKey) {
        Window w = failures.get(clientKey);
        if (w != null && !Instant.now().isAfter(w.resetAt()) && w.attempts() >= MAX_ATTEMPTS) {
            long minutes = Math.max(1, Duration.between(Instant.now(), w.resetAt()).toMinutes());
            throw com.automind.common.ApiException.tooManyRequests(
                    "Слишком много неудачных попыток входа. Повторите через " + minutes + " мин.");
        }
    }

    /** Остаток попыток в текущем окне — для сообщения об ошибке. */
    public int remainingAttempts(String clientKey) {
        Window w = failures.get(clientKey);
        if (w == null || Instant.now().isAfter(w.resetAt())) {
            return MAX_ATTEMPTS;
        }
        return Math.max(0, MAX_ATTEMPTS - w.attempts());
    }
}
