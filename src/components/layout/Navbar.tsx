
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { name: "Teams", path: "/teams" },
  { name: "Schedule", path: "/schedule" },
  { name: "Stats", path: "/stats" },
  { name: "Playoffs", path: "/playoffs" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="w-full bg-white shadow-md py-4 px-4 md:px-8 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
              alt="717 Rec Logo" 
              className="h-10 w-auto"
            />
            <span className="ml-2 text-xl font-bold text-cornhole-navy hidden md:inline-block">
              717 Rec
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`font-medium ${
                location.pathname === item.path
                  ? "text-cornhole-green border-b-2 border-cornhole-green"
                  : "text-gray-600 hover:text-cornhole-navy"
              } transition-colors`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[240px] sm:w-[300px]">
              <div className="flex items-center mb-8">
                <img 
                  src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
                  alt="717 Rec Logo" 
                  className="h-10 w-auto mr-2"
                />
                <span className="text-xl font-bold text-cornhole-navy">
                  717 Rec
                </span>
              </div>
              <div className="flex flex-col space-y-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`text-lg font-medium py-2 px-4 rounded-md ${
                      location.pathname === item.path
                        ? "bg-cornhole-cream text-cornhole-green"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
