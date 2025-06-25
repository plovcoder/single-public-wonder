import React from "react";
import AppLayout from "./AppLayout";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppLayout>{children}</AppLayout>;
};

export default Layout; 