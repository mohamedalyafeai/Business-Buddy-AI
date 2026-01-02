import { useState, useRef, useEffect } from "react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import { 
  Zap, X, Minimize2, Maximize2, GripVertical,
  Workflow, History, Settings, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FloatingWidgetProps {
  className?: string;
}

export const FloatingWidget = ({ className }: FloatingWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const navigate = useNavigate();
  const location = useLocation();

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('floating-widget-position');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition(pos);
      } catch {
        // Use default position
      }
    }
  }, []);

  // Save position to localStorage
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const newPos = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };
    setPosition(newPos);
    localStorage.setItem('floating-widget-position', JSON.stringify(newPos));
  };

  const quickActions = [
    {
      label: "Workflows",
      icon: Workflow,
      path: "/dashboard",
      badge: "New",
    },
    {
      label: "Execution History",
      icon: History,
      path: "/dashboard",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/profile",
    },
  ];

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
    setIsExpanded(false);
  };

  if (isMinimized) {
    return (
      <motion.div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-50"
      >
        <motion.button
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          initial={position}
          animate={position}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => !isDragging && setIsMinimized(false)}
          className={cn(
            "pointer-events-auto absolute bottom-6 right-6",
            "w-12 h-12 rounded-full",
            "bg-primary text-primary-foreground shadow-lg",
            "flex items-center justify-center cursor-grab active:cursor-grabbing",
            "hover:shadow-xl transition-shadow",
            className
          )}
        >
          <Zap className="w-5 h-5" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={constraintsRef}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={position}
        animate={{
          ...position,
          width: isExpanded ? 280 : 200,
        }}
        className={cn(
          "pointer-events-auto absolute bottom-6 right-6",
          "bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl",
          "overflow-hidden",
          className
        )}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-grab active:cursor-grabbing border-b border-border"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Quick Actions</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => setIsMinimized(true)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="overflow-hidden"
        >
          <div className="p-3 space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleNavigate(action.path)}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg",
                  "hover:bg-muted/50 transition-colors text-left",
                  location.pathname === action.path && "bg-primary/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{action.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {action.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {action.badge}
                    </Badge>
                  )}
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          {/* Current Page Indicator */}
          <div className="px-3 pb-3 pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Current: <span className="text-foreground font-medium">
                {location.pathname === "/" ? "Home" : 
                 location.pathname.slice(1).charAt(0).toUpperCase() + 
                 location.pathname.slice(2)}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Collapsed View */}
        {!isExpanded && (
          <div className="p-2 flex items-center justify-around">
            {quickActions.slice(0, 3).map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => handleNavigate(action.path)}
                title={action.label}
              >
                <action.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
