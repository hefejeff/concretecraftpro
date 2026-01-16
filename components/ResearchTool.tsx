
import React, { useState, useEffect } from 'react';
import { researchLocalMaterials } from '../services/geminiService';

export const ResearchTool: React.FC = () => {
  const [query, setQuery] = useState('GFRC mix supplies and concrete countertop sealers');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string, sources: any[] } | null>(null);
  // Default to San José, Costa Rica coordinates
  const [location, setLocation] = useState<{ lat: number, lng: number }>({ lat: 9.9281, lng: -84.0907 });
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocError(null);
        },
        (err) => {
          console.warn("Location access denied or timed out. Using default coordinates (San José, Costa Rica).");
          setLocError("Location access unavailable. Showing results for San José region.");
        },
        { timeout: 10000 }
      );
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await researchLocalMaterials(location, query);
      setResults(res);
    } catch (e) {
      console.error(e);
      alert("Search failed. Please ensure your API key is valid and the model is accessible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Artisan Resource Finder</h2>
        <p className="text-slate-500 mb-6">Locate specialized concrete suppliers, pigment shops, and fabrication tools near you.</p>
        
        {locError && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100">
            ⚠️ {locError}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text"
            className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all"
            placeholder="e.g. Buddy Rhodes distributor, countertop sealers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            disabled={loading}
            onClick={handleSearch}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </>
            ) : 'Locate Materials'}
          </button>
        </div>
      </div>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border prose prose-slate max-w-none">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Local Research Report</h3>
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
              {results.text}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                📍 Verified Locations & Links
              </h4>
              <div className="space-y-3">
                {results.sources.length > 0 ? results.sources.map((chunk: any, i: number) => {
                  const item = chunk.maps || chunk.web;
                  if (!item) return null;
                  return (
                    <a 
                      key={i}
                      href={item.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-white rounded-lg border border-blue-100 hover:shadow-md transition-all group"
                    >
                      <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 truncate">{item.title || "External Source"}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{item.uri}</div>
                    </a>
                  );
                }) : (
                  <p className="text-xs text-slate-500 italic">No direct maps/web links returned in metadata.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
