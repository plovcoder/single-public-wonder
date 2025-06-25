import React from "react";
import WalletConnect from "../auth/WalletConnect";

const Header: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-lg border border-violet-200">CC</div>
          <div className="w-px h-8 bg-violet-200 mx-2" />
          <span className="text-xl font-semibold text-violet-700">Chiliz Collectibles</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Aquí se pueden agregar más botones de navegación en el futuro */}
        <WalletConnect />
      </div>
    </header>
  );
};

export default Header; 