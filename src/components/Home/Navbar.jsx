import { Link, useNavigate } from "react-router-dom";
import palmTree from "../../assets/palmtree.png";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logout();
    setShowDropdown(false);
    navigate("/auth");
  };

  return (
    <nav className="navbar full-bleed bg-white shadow-md p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={palmTree} alt="Palm tree" className="trippy-palm-navbar" />
        <Link to="/" className="trippy-logo">Trippy</Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity"
            title={user?.name || "Profile"}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-800">{user?.name || "Guest"}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email || "Not logged in"}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
