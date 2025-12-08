
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AnimatedBreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const routeLabels: Record<string, string> = {
  "": "Home",
  "teams": "Teams",
  "stats": "Standings",
  "schedule": "Schedule",
  "playoffs": "Playoffs",
  "history": "History",
  "message-board": "Messages",
  "admin": "Admin",
};

export const AnimatedBreadcrumbs: React.FC<AnimatedBreadcrumbsProps> = ({
  items: propItems,
  className,
}) => {
  const location = useLocation();

  // Generate breadcrumbs from current path if not provided
  const items = React.useMemo(() => {
    if (propItems) return propItems;

    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Check if it's a known route or a dynamic segment (like team ID)
      const label = routeLabels[segment] || segment;
      
      breadcrumbs.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href: isLast ? undefined : currentPath,
      });
    });

    return breadcrumbs;
  }, [location.pathname, propItems]);

  // Don't show breadcrumbs on home page
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center flex-wrap gap-1 text-sm">
        {items.map((item, index) => (
          <motion.li
            key={item.label + index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.2, 
              delay: index * 0.05,
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className="flex items-center"
          >
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
            {item.href ? (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
                  "hover:underline underline-offset-4"
                )}
              >
                {index === 0 && <Home className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-foreground font-medium">
                {item.label}
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
};

export default AnimatedBreadcrumbs;
