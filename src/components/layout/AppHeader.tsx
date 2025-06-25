import React, { useState } from "react";

const mockUser = {
  name: "Dante Galeazzi",
  avatarUrl: "https://ui-avatars.com/api/?name=Dante+Galeazzi&background=7c3aed&color=fff"
};

const AppHeader: React.FC<{ role: string; setRole: (role: string) => void }> = ({ role, setRole }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  return (
    <header className="w-full h-16 flex items-center justify-between px-6 bg-white border-b shadow-sm z-10">
      <div className="flex items-center gap-2">
        <span className="font-bold text-xl text-violet-700">Chiliz Collectibles</span>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <button
            className="w-10 h-10 rounded-full border-2 border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            <img
              src={mockUser.avatarUrl}
              alt="User avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
              <div className="px-4 py-2 text-sm text-gray-700 font-semibold">{mockUser.name}</div>
              <div className="px-4 py-2 text-xs text-violet-700 bg-violet-50 font-bold rounded mb-2">{role.toUpperCase()}</div>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-violet-50"
                onClick={() => { setRole("admin"); setDropdownOpen(false); }}
              >Admin</button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-violet-50"
                onClick={() => { setRole("user"); setDropdownOpen(false); }}
              >User</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader; 