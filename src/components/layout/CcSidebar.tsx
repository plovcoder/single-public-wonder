import React from "react";
import { Link, useLocation } from "react-router-dom";

const navigationItems = [
  {
    id: "landing",
    name: "Landing",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7h20L12 2zm0 2.18L18.09 7H5.91L12 4.18zM2 9v11h20V9H2zm2 2h16v7H4v-7z" fill="currentColor"/></svg>
    ),
    route: "/",
    count: null,
  },
  {
    id: "dashboard",
    name: "Dashboard",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg>
    ),
    route: "/dashboard",
    count: null,
  },
  {
    id: "home",
    name: "Mis Collectibles",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/></svg>
    ),
    route: "/home",
    count: null,
  },
  // Puedes agregar más secciones aquí
];

const CcSidebar: React.FC<{ role: string }> = ({ role }) => {
  const location = useLocation();
  // Filtrar navegación según el rol
  const filteredItems = role === "user"
    ? navigationItems.filter((item) => item.id === "home")
    : navigationItems;
  return (
    <aside className="h-full w-64 bg-white border-r flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-lg border border-violet-200">CC</div>
        <span className="font-semibold text-lg text-violet-700">Dashboard</span>
      </div>
      {role !== "user" && (
        <Link
          to="/create"
          className="mb-4 w-full flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-lg shadow transition-colors text-base"
          style={{ textDecoration: "none" }}
        >
          + Create
        </Link>
      )}
      <nav className="flex-1 space-y-2">
        {filteredItems.map((item) => (
          <Link
            key={item.id}
            to={item.route}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 ${location.pathname === item.route ? "bg-violet-100 text-violet-700" : ""}`}
          >
            {item.icon}
            <span>{item.name}</span>
            {item.count !== null && (
              <span className="ml-auto bg-violet-200 text-violet-700 rounded-full px-2 text-xs font-semibold">{item.count}</span>
            )}
          </Link>
        ))}
      </nav>
      {/* Espacio para CTA o avatar abajo si se desea */}
    </aside>
  );
};

export default CcSidebar; 