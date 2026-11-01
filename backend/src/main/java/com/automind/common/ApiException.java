package com.automind.common;

/**
 * Бизнес-исключение с HTTP-статусом. Обрабатывается централизованно
 * в GlobalExceptionHandler (ТЗ 8.4).
 */
public class ApiException extends RuntimeException {

    private final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(401, message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(400, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(404, message);
    }

    public static ApiException tooManyRequests(String message) {
        return new ApiException(429, message);
    }

    public int getStatus() {
        return status;
    }
}
