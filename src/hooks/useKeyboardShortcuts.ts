import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    // Navigation shortcuts
    { key: "h", alt: true, action: () => navigate("/"), description: "Go to Home" },
    { key: "d", alt: true, action: () => navigate("/dashboard"), description: "Go to Dashboard" },
    { key: "p", alt: true, action: () => navigate("/profile"), description: "Go to Profile" },
    { key: "s", alt: true, action: () => navigate("/settings"), description: "Go to Settings" },
    
    // Quick actions
    { key: "k", ctrl: true, action: () => document.dispatchEvent(new CustomEvent('open-command-palette')), description: "Open Command Palette" },
    { key: "/", ctrl: true, action: () => document.dispatchEvent(new CustomEvent('focus-search')), description: "Focus Search" },
    { key: "n", alt: true, action: () => document.dispatchEvent(new CustomEvent('new-workflow')), description: "New Workflow" },
    { key: "Escape", action: () => document.dispatchEvent(new CustomEvent('close-dialogs')), description: "Close Dialogs" },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      // Allow Escape key to work even in inputs
      if (event.key !== "Escape") return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
};

// Function to show keyboard shortcuts help
export const showShortcutsHelp = () => {
  toast.info(
    "Keyboard Shortcuts: Alt+H (Home), Alt+D (Dashboard), Alt+P (Profile), Alt+S (Settings), Ctrl+K (Command Palette), Alt+N (New Workflow)",
    { duration: 5000 }
  );
};
