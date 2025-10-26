import { Home, Calendar, User, Users, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  role?: "employee" | "manager" | "admin";
}

export const BottomNav = ({ role = "employee" }: BottomNavProps) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/schedule", icon: Calendar, label: "Wochenplan" },
    ...(role === "manager" || role === "admin"
      ? [{ path: "/manager/schedule", icon: Calendar, label: "Manager Plan" }]
      : []),
    { path: "/profile", icon: User, label: "Profil" },
    ...(role === "manager" || role === "admin"
      ? [{ path: "/users", icon: Users, label: "Benutzer" }]
      : []),
    ...(role === "admin"
      ? [{ path: "/admin/settings", icon: Settings, label: "Einstellungen" }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
