
import React from "react";
import { Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo Section */}
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
              alt="717 Rec Logo" 
              className="h-12 w-auto"
            />
          </div>

          {/* Contact Section */}
          <div className="text-center md:text-left w-full md:w-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-start gap-2">
              <Mail size={16} className="text-gray-600 dark:text-gray-300" />
              <a 
                href="mailto:info@717rec.com" 
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                info@717rec.com
              </a>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
          &copy; {currentYear} 717 Rec. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
