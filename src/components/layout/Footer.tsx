
import React from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cornhole-navy text-white py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center md:items-start">
            <img 
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
              alt="717 Rec Logo" 
              className="h-16 w-auto mb-4"
            />
          </div>

          <div className="md:border-l md:border-gray-700 md:pl-8">
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="flex flex-col space-y-2 text-sm text-gray-300">
              <li>
                <Link to="/teams" className="hover:text-white transition-colors hover:underline">Teams</Link>
              </li>
              <li>
                <Link to="/schedule" className="hover:text-white transition-colors hover:underline">Schedule</Link>
              </li>
              <li>
                <Link to="/stats" className="hover:text-white transition-colors hover:underline">Stats</Link>
              </li>
              <li>
                <Link to="/playoffs" className="hover:text-white transition-colors hover:underline">Playoffs</Link>
              </li>
            </ul>
          </div>

          <div className="md:border-l md:border-gray-700 md:pl-8">
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <p className="text-sm text-gray-300">
              Have questions or suggestions?
              <br />
              <a href="mailto:info@717rec.com" className="flex items-center gap-2 mt-2 hover:underline hover:text-white transition-colors">
                <Mail size={16} />
                <span>info@717rec.com</span>
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
          &copy; {currentYear} 717 Rec. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
