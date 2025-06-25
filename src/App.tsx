import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import NftSenderDashboard from "@/components/dashboard/NftSenderDashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ConfigForm from "@/components/ConfigForm";
import AppLayout from "@/components/layout/AppLayout";

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useState("admin");

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {isConnected ? (
          <AppLayout role={role} setRole={setRole}>
            <Routes>
              <Route path="/dashboard" element={<NftSenderDashboard />} />
              <Route path="/home" element={<Index />} />
              <Route
                path="/create"
                element={
                  <div className="max-w-xl mx-auto py-10">
                    <ConfigForm
                      onConfigSaved={() => {}}
                      onProjectChange={() => {}}
                    />
                  </div>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        ) : (
          <LandingPage onConnect={() => setIsConnected(true)} />
        )}
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
