package com.automind.auth;

import com.automind.common.GlobalExceptionHandler.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API авторизации (ТЗ 3.3): POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank(message = "Введите код доступа") String accessCode) {
    }

    public record UserDto(Long id, String role) {
    }

    public record AuthResponse(boolean success, String message, UserDto user) {
    }

    private static final int SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 часов

    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse httpResponse) {
        String clientKey = clientKey(httpRequest);
        var result = authService.login(request.accessCode(), clientKey);
        authService.establishSession(result.user());

        SecurityContext context = SecurityContextHolder.getContext();
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        HttpSession session = httpRequest.getSession(true);
        session.setMaxInactiveInterval(SESSION_TTL_SECONDS);

        return ResponseEntity.ok(new AuthResponse(true, "Авторизация выполнена",
                new UserDto(result.user().getId(), result.user().getRole())));
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(new AuthResponse(true, "Выход выполнен", null));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        var user = AuthService.currentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(ApiError.of("Сессия не активна"));
        }
        return ResponseEntity.ok(new AuthResponse(true, "Сессия активна",
                new UserDto(user.id(), user.role())));
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
