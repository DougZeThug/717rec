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
    { name: "Home", path: "/" },
    { name: "Teams", path: "/teams" },
    { name: "Schedule", path: "/schedule" },
    { name: "Stats", path: "/stats" },
    { name: "Playoffs", path: "/playoffs" },
    { name: "Timeslots", path: "/timeslots" },
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
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              Cornhole League
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  className={
                    isActive(item.path)
                      ? "bg-white text-cornhole-navy hover:bg-gray-100"
                      : "text-white hover:bg-cornhole-navy-light"
                  }
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  className={
                    isActive(item.path)
                      ? "bg-white text-cornhole-navy hover:bg-gray-100 w-full justify-start"
                      : "text-white hover:bg-cornhole-navy-light w-full justify-start"
                  }
                >
                  {item.name}
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
