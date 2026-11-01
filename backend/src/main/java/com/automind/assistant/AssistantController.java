package com.automind.assistant;

import com.automind.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API интеллектуального помощника (ТЗ 6.6): POST /api/assistant/chat,
 * GET /api/assistant/history, DELETE /api/assistant/history.
 */
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    public record ChatRequest(
            @jakarta.validation.constraints.NotBlank(message = "Введите сообщение") String message,
            Long orderId) {
    }

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    private Long currentUserId() {
        var user = AuthService.currentUser();
        if (user == null) {
            throw new com.automind.common.ApiException(401, "Требуется авторизация");
        }
        return user.id();
    }

    @PostMapping("/chat")
    public AssistantService.AssistantResponse chat(@Valid @RequestBody ChatRequest request) {
        return assistantService.answer(request.message(), request.orderId(), currentUserId());
    }

    @GetMapping("/history")
    public List<AssistantService.ChatHistoryItem> history(@RequestParam(required = false) Long orderId) {
        return assistantService.history(currentUserId(), orderId);
    }

    @DeleteMapping("/history")
    public ResponseEntityHolder clear(@RequestParam(required = false) Long orderId) {
        assistantService.clearHistory(currentUserId(), orderId);
        return new ResponseEntityHolder(true, "История чата очищена");
    }

    public record ResponseEntityHolder(boolean success, String message) {
    }
}
