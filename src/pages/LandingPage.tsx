import React from "react";

interface LandingPageProps {
  onConnect?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onConnect }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="absolute top-6 right-8">
        <button
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-full shadow-lg text-lg"
          onClick={onConnect}
        >
          Connect Wallet
        </button>
      </div>
      <h1 className="text-4xl font-extrabold text-violet-700 mb-4 text-center">Collect digital collectibles in the Chiliz chain</h1>
      <p className="text-lg text-gray-600 text-center max-w-xl">Discover, collect, and manage your digital assets easily and securely on the Chiliz blockchain. Connect your wallet to get started!</p>
    </div>
  );
};

export default LandingPage; 