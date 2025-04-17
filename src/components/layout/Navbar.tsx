import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Teams", href: "/teams" },
    { label: "Schedule", href: "/schedule" },
    { label: "Standings", href: "/stats" },
    { label: "Playoffs", href: "/playoffs" },
    { label: "Admin", href: "/admin" }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-cornhole-navy text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/faa54084-d274-43b9-9862-5544b188b4ca.png" 
                alt="717Rec League Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold">717Rec</span>
            </Link>
          </div>

          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className={
                    isActive(item.href)
                      ? "bg-white text-cornhole-navy hover:bg-gray-100"
                      : "text-white hover:bg-cornhole-navy-light"
                  }
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className={
                    isActive(item.href)
                      ? "bg-white text-cornhole-navy hover:bg-gray-100 w-full justify-start"
                      : "text-white hover:bg-cornhole-navy-light w-full justify-start"
                  }
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
