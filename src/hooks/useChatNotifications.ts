import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export const useChatNotifications = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVsOMa7k+nFLFxyZ3PR8W0k0nNHwb1NBPY/D6GxMQVKKueJoTkJYjrLcZU5FXpGs1GJSRmWTpspgVUhrlZvBYFhKcpiVuWJbTXqbl7JkX1CAnJWrZ2NTh52UnWxnVo6cj5BwbFuUm4qGdXJgmpmIf3pti5WJfYF4aoWOh3yFfnR+iIN8h4J3eoR/e4iCdX2EfXqJgHWBg3p8iH93hIF4foh9eISBd3+He3mGf3eEgXd/hXp6hX53g4F3foV5eoV9d4OAd3+EeXqEfHeDgHd/g3l6hHx3g4B3f4N5eoR8d4OAd3+DeXqEfHeDgHd/g3l6hHx3g4B3f4N5eoR8d4OAd3+DeXqEfHeDf3d/g3l6hHx3g4B3f4N5eoR8d4OAd3+DeXqEfHeDf3d/g3l6hHx3g4B3f4N5eoR8d4N/d3+DeXqEfHeDf3d/g3l6hHx3g393f4N5eoR8d4N/d3+DeXqEfHeDf3d/g3l6hHx3g393");

    if (!user) return;

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel("chat-messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as { role: string; content: string };
          
          // Only notify for assistant messages
          if (newMessage.role === "assistant") {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(() => {
                // Audio play failed, likely due to autoplay policy
              });
            }

            // Show toast notification
            toast.success("New message received!", {
              description: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? "..." : ""),
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
