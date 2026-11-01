package com.automind.auth;

import com.automind.common.ApiException;
import com.automind.user.UserEntity;
import com.automind.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Проверка кода доступа и создание сессии (ТЗ разд. 3).
 * Код никогда не хранится во frontend; в БД — только BCrypt-хеш (ТЗ 3.4).
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginRateLimiter rateLimiter;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       LoginRateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    public record SessionUser(Long id, String role) {
    }

    public record LoginResult(UserEntity user) {
    }

    @Transactional(readOnly = true)
    public LoginResult login(String accessCode, String clientKey) {
        if (accessCode == null || accessCode.isBlank()) {
            throw ApiException.badRequest("Введите код доступа");
        }
        rateLimiter.checkAllowed(clientKey);

        // MVP: в системе один действующий код доступа (одна запись users)
        UserEntity user = userRepository.findAll().stream()
                .filter(UserEntity::isActive)
                .findFirst()
                .orElseThrow(() -> ApiException.unauthorized("Код доступа не настроен. Обратитесь к администратору."));

        if (!passwordEncoder.matches(accessCode, user.getAccessCodeHash())) {
            rateLimiter.recordFailure(clientKey);
            int remaining = rateLimiter.remainingAttempts(clientKey);
            log.warn("Неудачная попытка входа (client={}, осталось попыток: {})", clientKey, remaining);
            throw ApiException.unauthorized("Неверный код доступа. Осталось попыток: " + remaining);
        }

        rateLimiter.reset(clientKey);
        log.info("Успешная авторизация, user id={}", user.getId());
        return new LoginResult(user);
    }

    /** Помещает аутентификацию пользователя в текущую сессию. */
    public void establishSession(UserEntity user) {
        SessionUser principal = new SessionUser(user.getId(), user.getRole());
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    public static SessionUser currentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof SessionUser su) {
            return su;
        }
        return null;
    }
}
