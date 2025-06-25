import React from "react";

const mockDrops = [
  {
    id: 188540,
    title: "asdasd",
    date: "Apr 30, 2025 (UTC+02:00)",
    galleryUrl: "#",
    familyUrl: "#",
    momentsUrl: "#",
    image: "https://assets.poap.xyz/dia-de-entrenamiento-2025-2025-logo-1709832226752.png",
    distribution: null
  },
  {
    id: 188488,
    title: "Socios - Take The Pitch 2025 (TESTING)",
    date: "Apr 9, 2025 - Dec 31, 2025 (UTC+02:00)",
    location: "ATM Training Camp, Spain",
    galleryUrl: "#",
    familyUrl: "#",
    momentsUrl: "#",
    image: "https://assets.poap.xyz/dia-de-entrenamiento-2025-2025-logo-1709832226752.png",
    distribution: { delivery: 2, secret: 10, extra: 2 }
  }
];

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-violet-700 font-semibold">✨ You have <b>2 drops</b></span>
          <div className="flex gap-4">
            <button className="text-violet-700 font-medium hover:underline">Import Drop</button>
            <button className="bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2">
              <span className="text-xl font-bold">+</span> Make a POAP
            </button>
          </div>
        </div>
        <div className="space-y-8">
          {mockDrops.map((drop) => (
            <div key={drop.id} className="bg-white rounded-2xl shadow p-6 flex gap-6 items-center border border-violet-100">
              <img src={drop.image} alt={drop.title} className="w-24 h-24 rounded-full border-4 border-violet-200 object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <span>ID {drop.id}</span>
                  <a href={drop.galleryUrl} className="text-violet-600 font-bold hover:underline">Gallery</a>
                  <a href={drop.familyUrl} className="text-violet-600 font-bold hover:underline">Family</a>
                  <a href={drop.momentsUrl} className="text-violet-600 font-bold hover:underline">Moments</a>
                </div>
                <div className="text-xl font-bold text-gray-800 mb-1">{drop.title}</div>
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <span className="flex items-center gap-1"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="10" width="18" height="11" rx="2" stroke="#7c3aed" strokeWidth="2"/></svg></span>
                  {drop.date}
                </div>
                {drop.location && <div className="flex items-center gap-2 text-gray-500 mb-2"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 21s-6-5.686-6-10A6 6 0 0 1 18 11c0 4.314-6 10-6 10z" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="11" r="2" stroke="#7c3aed" strokeWidth="2"/></svg>{drop.location}</div>}
                {drop.distribution ? (
                  <div className="flex gap-2 mt-2">
                    <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">Delivery <b>{drop.distribution.delivery}</b></span>
                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">Secret <b>{drop.distribution.secret}</b></span>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">+{drop.distribution.extra}</span>
                  </div>
                ) : (
                  <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-semibold inline-block mt-2">No distribution added yet</div>
                )}
              </div>
              <button className="ml-auto text-violet-500 hover:text-violet-700">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
