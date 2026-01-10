import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkAssistantWidget } from "@/components/WorkAssistantWidget";
import { FloatingWidget } from "@/components/FloatingWidget";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeProvider } from "next-themes";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle keyboard shortcuts
const KeyboardShortcutsProvider = () => {
  useKeyboardShortcuts();
  return null;
};

// Component to conditionally render floating widgets
const FloatingWidgets = () => {
  const location = useLocation();
  const authenticatedPaths = ['/dashboard', '/profile', '/settings'];
  const showFloatingWidgets = authenticatedPaths.includes(location.pathname);
  
  if (!showFloatingWidgets) return null;
  
  return (
    <>
      <WorkAssistantWidget />
      <FloatingWidget />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <KeyboardShortcutsProvider />
            <CommandPalette />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingWidgets />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
