const aiToggle = document.getElementById("ai-toggle");
const aiChat = document.getElementById("ai-chat");
const aiClose = document.getElementById("ai-close");
const aiForm = document.getElementById("ai-form");
const aiInput = document.getElementById("ai-input");
const aiMessages = document.getElementById("ai-messages");
const aiSendButton = aiForm.querySelector('button[type="submit"]');

aiToggle.addEventListener("click", () => {
  aiChat.classList.remove("ai-hidden");
  aiToggle.classList.add("ai-hidden");
  aiToggle.setAttribute("aria-expanded", "true");
  aiInput.focus();
});

aiClose.addEventListener("click", () => {
  aiChat.classList.add("ai-hidden");
  aiToggle.classList.remove("ai-hidden");
  aiToggle.setAttribute("aria-expanded", "false");
  aiToggle.focus();
});

function aiAddMessage(text, type) {
  const bubble = document.createElement("div");
  bubble.className = type === "user" ? "ai-user-message" : "ai-bot-message";
  bubble.textContent = text;
  aiMessages.appendChild(bubble);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return bubble;
}

aiForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (aiSendButton.disabled) return;

  const message = aiInput.value.trim();
  if (!message) return;

  aiAddMessage(message, "user");
  aiInput.value = "";
  aiInput.disabled = true;
  aiSendButton.disabled = true;

  const loading = aiAddMessage("AI ფიქრობს...", "bot");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("სერვერის პასუხის წაკითხვა ვერ მოხერხდა.");
    }

    if (!response.ok) {
      throw new Error(data.error || "შეტყობინების გაგზავნა ვერ მოხერხდა.");
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("სერვერმა ცარიელი პასუხი დააბრუნა.");
    }

    loading.textContent = data.reply;
  } catch (error) {
    loading.textContent =
      error instanceof TypeError
        ? "სერვერთან კავშირი ვერ მოხერხდა. შეამოწმე, რომ სერვერი გაშვებულია."
        : error.message;
  } finally {
    aiInput.disabled = false;
    aiSendButton.disabled = false;
    aiInput.focus();
  }
});
