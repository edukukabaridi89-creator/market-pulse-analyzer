import { Link, useLocation } from "wouter";
import { Activity, BarChart2, History, Settings, LogOut, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className={cn("flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border py-6 shrink-0", className)}>
      <div className="px-6 mb-8 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-primary fill-primary/20" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">PrimeAnalysis</span>
        </div>
        <Badge variant="outline" className="w-fit border-primary/50 text-primary bg-primary/10 font-mono text-xs">
          PREMIUM ACTIVE
        </Badge>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
        <NavItem href="/dashboard" icon={Activity}   label="Dashboard" active={location === "/dashboard"} />
        <NavItem href="/analysis"  icon={BarChart2}   label="Analysis"  active={location === "/analysis"} />
        <NavItem href="/history"   icon={History}     label="History"   active={location === "/history"} />
        <NavItem href="/settings"  icon={Settings}    label="Settings"  active={location === "/settings"} />
      </nav>

      <div className="px-3 mt-auto">
        <button
          onClick={logout}
          data-testid="button-logout"
          className="flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

function NavItem({
  href, icon: Icon, label, active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <span className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}>
        <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
        {label}
      </span>
    </Link>
  );
}
