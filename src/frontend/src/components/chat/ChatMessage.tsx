import { Bot, User } from "lucide-react";

import { PlanDisplay } from "@/components/chat/PlanDisplay";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

// ChatMessage renders a single turn in the conversation. User turns are
// right-aligned cyan bubbles; assistant turns are left-aligned neutral cards.
// When an assistant turn looks like a plan, it renders PlanDisplay with
// copy/save affordances for MCP-connected AI agents.

type ChatMessageProps = {
  message: ChatMessage;
  onSavePlan?: () => void;
  onRetryPlan?: () => void;
  isSavingPlan?: boolean;
  isLastAssistant?: boolean;
};

export function ChatMessageItem({
  message,
  onSavePlan,
  onRetryPlan,
  isSavingPlan = false,
  isLastAssistant = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div data-ocid="chat.message.user" className="flex justify-end gap-3">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          <div className="rounded-2xl rounded-br-sm border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm leading-relaxed text-foreground">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden
        >
          <User className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  const looksLikePlan = /(^|\n)\s*\d+[\.)]\s/m.test(message.content);

  return (
    <div data-ocid="chat.message.assistant" className="flex gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden
      >
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex min-w-0 max-w-[85%] flex-1 flex-col gap-1.5">
        {looksLikePlan && onSavePlan ? (
          <PlanDisplay
            planText={message.content}
            onSave={onSavePlan}
            onRetry={onRetryPlan ?? (() => {})}
            isSaving={isSavingPlan}
            canRetry={isLastAssistant && Boolean(onRetryPlan)}
          />
        ) : (
          <div
            className={cn(
              "rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-subtle",
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatMessageLoading({
  label = "Drafting your workflow plan…",
}: {
  label?: string;
}) {
  return (
    <div data-ocid="chat.message.loading" className="flex gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden
      >
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]"
            aria-hidden
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]"
            aria-hidden
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
            aria-hidden
          />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
      </div>
    </div>
  );
}
