import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Database, Upload, Settings, Briefcase, ChevronRight, User } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const links = [
    { to: '/', label: 'Search', icon: Search },
    { to: '/database', label: 'Database', icon: Database },
    { to: '/pipeline', label: 'Pipeline', icon: Upload },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-gradient-to-r from-frank-blue to-frank-light-blue shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <Briefcase className="h-6 w-6 text-frank-blue" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Frank</h1>
              <p className="text-blue-100 text-xs">by Innovera</p>
            </div>
          </Link>

          <div className="hidden md:flex items-baseline space-x-2">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  isActive(to) ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}

            {location.pathname.startsWith('/contact/') && (
              <div className="px-3 py-2 rounded-md text-sm font-medium bg-white/20 text-white flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button
              type="button"
              className="bg-white/20 p-2 rounded-md text-white hover:bg-white/30"
              aria-label="Mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {location.pathname.startsWith('/contact/') && (
        <div className="bg-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center space-x-2 text-sm text-blue-100">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/database" className="hover:text-white">Database</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">Profile</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
