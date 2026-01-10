import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  LayoutDashboard,
  User,
  Settings,
  Plus,
  Workflow,
  MessageSquare,
  Sun,
  Moon,
  Keyboard,
  LogOut,
  Search,
  Zap,
  Calendar,
  FileText,
  Mail,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { showShortcutsHelp } from "@/hooks/useKeyboardShortcuts";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const openPalette = () => setOpen(true);

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-palette", openPalette);
    
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-palette", openPalette);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Home</span>
            <kbd className="ml-auto text-xs text-muted-foreground">Alt+H</kbd>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
            <kbd className="ml-auto text-xs text-muted-foreground">Alt+D</kbd>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <kbd className="ml-auto text-xs text-muted-foreground">Alt+P</kbd>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <kbd className="ml-auto text-xs text-muted-foreground">Alt+S</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Workflows">
          <CommandItem onSelect={() => runCommand(() => {
            navigate("/dashboard");
            setTimeout(() => document.dispatchEvent(new CustomEvent('new-workflow')), 100);
          })}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Workflow</span>
            <kbd className="ml-auto text-xs text-muted-foreground">Alt+N</kbd>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <Workflow className="mr-2 h-4 w-4" />
            <span>View All Workflows</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => {
            navigate("/dashboard");
            setTimeout(() => document.dispatchEvent(new CustomEvent('open-ai-assistant')), 100);
          })}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Open AI Assistant</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {
            navigate("/dashboard");
            setTimeout(() => document.dispatchEvent(new CustomEvent('create-email-workflow')), 100);
          })}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Create Email Automation</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {
            navigate("/dashboard");
            setTimeout(() => document.dispatchEvent(new CustomEvent('create-schedule-workflow')), 100);
          })}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule a Task</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {
            navigate("/dashboard");
            setTimeout(() => document.dispatchEvent(new CustomEvent('create-report-workflow')), 100);
          })}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Generate Report</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(showShortcutsHelp)}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
          </CommandItem>
          {user && (
            <CommandItem onSelect={() => runCommand(signOut)}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
