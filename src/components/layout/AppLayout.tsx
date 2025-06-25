import React from "react";
import CcSidebar from "./CcSidebar";
import AppHeader from "./AppHeader";

const AppLayout: React.FC<{ children: React.ReactNode; role: string; setRole: (role: string) => void }> = ({ children, role, setRole }) => {
  return (
    <div className="h-screen flex bg-gray-50">
      <CcSidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader role={role} setRole={setRole} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout; 