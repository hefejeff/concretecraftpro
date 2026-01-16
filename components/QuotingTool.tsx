
import React, { useState, useMemo } from 'react';
import { Slab } from '../types';

export const QuotingTool: React.FC = () => {
  const [slabs, setSlabs] = useState<Slab[]>([
    { id: '1', name: 'Island Main', length: 96, width: 36, thickness: 1.5, edges: 18, x: 0, y: 0 }
  ]);
  const [rates, setRates] = useState({
    sqft: 85,
    edge: 15,
    finish: 200,
    tax: 8
  });

  const addSlab = () => {
    const newSlab: Slab = {
      id: Math.random().toString(),
      name: `Slab ${slabs.length + 1}`,
      length: 24,
      width: 24,
      thickness: 1.5,
      edges: 4,
      x: 0,
      y: 0
    };
    setSlabs([...slabs, newSlab]);
  };

  const updateSlab = (id: string, updates: Partial<Slab>) => {
    setSlabs(slabs.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSlab = (id: string) => {
    setSlabs(slabs.filter(s => s.id !== id));
  };

  const totals = useMemo(() => {
    const totalSqFt = slabs.reduce((acc, s) => acc + (s.length * s.width) / 144, 0);
    const totalEdgeFt = slabs.reduce((acc, s) => acc + s.edges, 0);
    const subtotal = (totalSqFt * rates.sqft) + (totalEdgeFt * rates.edge) + rates.finish;
    const taxAmount = (subtotal * rates.tax) / 100;
    
    return {
      sqft: totalSqFt.toFixed(2),
      edge: totalEdgeFt.toFixed(2),
      subtotal: subtotal.toFixed(2),
      tax: taxAmount.toFixed(2),
      grandTotal: (subtotal + taxAmount).toFixed(2)
    };
  }, [slabs, rates]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Project Inventory</h3>
              <button 
                onClick={addSlab}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                + Add Custom Piece
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                    <th className="pb-3">Section Name</th>
                    <th className="pb-3 text-center">Size (in)</th>
                    <th className="pb-3 text-center">Edges (ln ft)</th>
                    <th className="pb-3 text-right">Area (sq ft)</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slabs.map((slab) => (
                    <tr key={slab.id} className="group">
                      <td className="py-4">
                        <input 
                          className="font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 w-full"
                          value={slab.name}
                          onChange={(e) => updateSlab(slab.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number" 
                            className="w-16 border rounded p-1 text-center text-sm"
                            value={slab.length}
                            onChange={(e) => updateSlab(slab.id, { length: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="text-slate-300">×</span>
                          <input 
                            type="number" 
                            className="w-16 border rounded p-1 text-center text-sm"
                            value={slab.width}
                            onChange={(e) => updateSlab(slab.id, { width: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <input 
                          type="number" 
                          className="w-16 border rounded p-1 text-center text-sm"
                          value={slab.edges}
                          onChange={(e) => updateSlab(slab.id, { edges: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-4 text-right font-mono text-sm">
                        {((slab.length * slab.width) / 144).toFixed(2)}
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => removeSlab(slab.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quote Assumptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Base rate / sqft</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input 
                    type="number"
                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                    value={rates.sqft}
                    onChange={(e) => setRates({ ...rates, sqft: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Edge profile / ft</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input 
                    type="number"
                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                    value={rates.edge}
                    onChange={(e) => setRates({ ...rates, edge: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Shop Finish Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input 
                    type="number"
                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                    value={rates.finish}
                    onChange={(e) => setRates({ ...rates, finish: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Tax Rate (%)</label>
                <input 
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={rates.tax}
                  onChange={(e) => setRates({ ...rates, tax: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-2xl shadow-xl text-white p-8 sticky top-24">
            <h3 className="text-xl font-bold mb-8">Quote Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Total Surface Area</span>
                <span className="text-white">{totals.sqft} sq ft</span>
              </div>
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Polished Edges</span>
                <span className="text-white">{totals.edge} ln ft</span>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span>${totals.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax ({rates.tax}%)</span>
                <span>${totals.tax}</span>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Total Quote</span>
                <span className="text-4xl font-bold">${totals.grandTotal}</span>
              </div>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
              Generate Client PDF
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-4 italic">
              * Estimate valid for 30 days based on current material costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
