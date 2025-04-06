
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cornhole-navy text-white py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Bag It Up League</h3>
            <p className="text-sm text-gray-300">
              Managing recreational cornhole leagues with ease.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link to="/teams" className="hover:text-white">Teams</Link>
              </li>
              <li>
                <Link to="/schedule" className="hover:text-white">Schedule</Link>
              </li>
              <li>
                <Link to="/stats" className="hover:text-white">Stats</Link>
              </li>
              <li>
                <Link to="/playoffs" className="hover:text-white">Playoffs</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <p className="text-sm text-gray-300">
              Have questions or suggestions?
              <br />
              Email us at: <a href="mailto:info@bagitupleague.com" className="underline hover:text-white">info@bagitupleague.com</a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
          &copy; {currentYear} Bag It Up League. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
