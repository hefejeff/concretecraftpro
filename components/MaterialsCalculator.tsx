import React, { useState, useMemo, useEffect } from 'react';
import { Slab, UnitSystem } from '../types';

interface MaterialsCalculatorProps {
  slabs: Slab[];
  unit: UnitSystem;
}

type MixType = 'traditional' | 'gfrc';
type BaseMaterial = 'cement' | 'microcement' | 'repremax';

export const MaterialsCalculator: React.FC<MaterialsCalculatorProps> = ({ slabs, unit }) => {
  const [mixType, setMixType] = useState<MixType>('gfrc');
  const [wasteFactor, setWasteFactor] = useState(10); 
  const [useFiberMesh, setUseFiberMesh] = useState(true);
  const [baseMaterial, setBaseMaterial] = useState<BaseMaterial>('cement');
  
  const [faceMaxicril, setFaceMaxicril] = useState(false);
  const [faceMaxiflo, setFaceMaxiflo] = useState(false);
  const [backerMaxicril, setBackerMaxicril] = useState(false);
  const [backerMaxiflo, setBackerMaxiflo] = useState(false);
  
  const [ratios, setRatios] = useState({
    faceSandRatio: 1.0, 
    waterCement: 0.32,
    polymer: 0.1,
    fiber: 0.03
  });

  useEffect(() => {
    if (baseMaterial === 'repremax') {
      setRatios(prev => ({ ...prev, faceSandRatio: 0.0, waterCement: 0.28 }));
    } else if (baseMaterial === 'microcement') {
      setRatios(prev => ({ ...prev, faceSandRatio: 0.3, waterCement: 0.35 }));
    } else {
      setRatios(prev => ({ ...prev, faceSandRatio: 1.0, waterCement: 0.32 }));
    }
  }, [baseMaterial]);

  const totalVolumeInches = useMemo(() => {
    return slabs.reduce((acc, s) => {
      const slabVol = s.length * s.width * s.thickness;
      const cutoutVol = (s.cutouts || []).reduce((cAcc, c) => cAcc + (c.length * c.width * s.thickness), 0);
      return acc + (slabVol - cutoutVol);
    }, 0);
  }, [slabs]);

  const totalAreaSqFt = useMemo(() => {
    return slabs.reduce((acc, s) => {
      const slabArea = (s.length * s.width) / 144;
      const cutoutArea = (s.cutouts || []).reduce((cAcc, c) => cAcc + (c.length * c.width) / 144, 0);
      return acc + (slabArea - cutoutArea);
    }, 0);
  }, [slabs]);

  const calculations = useMemo(() => {
    const volWithWaste = totalVolumeInches * (1 + wasteFactor / 100);
    const weightPerCubicInch = 0.081; 
    const totalWeightLb = volWithWaste * weightPerCubicInch;

    if (mixType === 'traditional') {
      const cementWeight = totalWeightLb * 0.45;
      const sandWeight = totalWeightLb * 0.45;
      const waterWeight = cementWeight * ratios.waterCement;
      const polymerWeight = totalWeightLb * ratios.polymer;
      
      return { 
        totalWeightLb, 
        traditional: {
          cement: cementWeight,
          sand: sandWeight,
          water: waterWeight,
          polymer: polymerWeight,
          meshSqFt: useFiberMesh ? totalAreaSqFt * 1.1 : 0
        }
      };
    } else {
      const faceThickness = 0.1875;
      const faceVol = totalAreaSqFt * 144 * faceThickness * (1 + wasteFactor/100);
      const faceWeight = faceVol * weightPerCubicInch;
      const backerWeight = Math.max(0, totalWeightLb - faceWeight);
      
      const faceTotalParts = 1 + ratios.faceSandRatio;
      const faceCement = (faceWeight / faceTotalParts);
      const faceSand = faceCement * ratios.faceSandRatio;
      
      const faceWater = faceCement * (faceMaxiflo ? ratios.waterCement * 0.85 : ratios.waterCement);
      const facePolymer = faceMaxicril ? faceWeight * 0.12 : faceWeight * ratios.polymer;
      const faceMaxifloWeight = faceMaxiflo ? faceCement * 0.008 : 0;

      const backerCement = backerWeight * 0.47;
      const backerSand = backerWeight * 0.47;
      const backerWater = backerCement * (backerMaxiflo ? ratios.waterCement * 0.9 : ratios.waterCement);
      const backerPolymer = backerMaxicril ? backerWeight * 0.12 : backerWeight * ratios.polymer;
      const backerMaxifloWeight = backerMaxiflo ? backerCement * 0.008 : 0;
      const fiberWeight = backerWeight * ratios.fiber;

      return { 
        totalWeightLb, 
        face: {
          cement: faceCement,
          sand: faceSand,
          water: faceWater,
          polymer: facePolymer,
          maxiflo: faceMaxifloWeight,
          total: faceWeight
        },
        backer: {
          cement: backerCement,
          sand: backerSand,
          water: backerWater,
          polymer: backerPolymer,
          maxiflo: backerMaxifloWeight,
          fiber: fiberWeight,
          total: backerWeight,
          meshSqFt: useFiberMesh ? totalAreaSqFt * 1.1 : 0 
        }
      };
    }
  }, [totalVolumeInches, totalAreaSqFt, mixType, wasteFactor, ratios, useFiberMesh, baseMaterial, faceMaxicril, faceMaxiflo, backerMaxicril, backerMaxiflo]);

  const displaySolid = (lbs: number) => {
    const val = unit === 'imperial' ? lbs : lbs * 0.453592;
    const label = unit === 'imperial' ? 'lbs' : 'kg';
    if (unit === 'imperial' && val < 0.1 && val > 0) return `${(val * 16).toFixed(1)} oz`;
    return `${val.toFixed(2)} ${label}`;
  };

  const displayLiquid = (lbs: number) => {
    if (unit === 'imperial') {
      if (lbs < 0.2) return `${(lbs * 16).toFixed(1)} oz`;
      return `${lbs.toFixed(2)} lbs`;
    }
    // Metric: Convert kg to liters (Approx 1kg = 1L for shop mixing)
    const kg = lbs * 0.453592;
    if (kg < 1) {
      return `${(kg * 1000).toFixed(0)} mL`;
    }
    return `${kg.toFixed(2)} L`;
  };

  const getBaseLabel = () => {
    if (baseMaterial === 'repremax') return 'Repremax Capafina 90';
    if (baseMaterial === 'microcement') return 'Microcement Binder';
    return 'Portland Cement';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
      <div className="bg-slate-50 p-6 border-b border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Advanced Mix Design</h3>
            <p className="text-sm text-slate-500">Pro Grade • {displaySolid(calculations.totalWeightLb)} total batch weight (Net of Cutouts)</p>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
            {['traditional', 'gfrc'].map(type => (
              <button key={type} onClick={() => setMixType(type as MixType)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mixType === type ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {mixType === 'gfrc' ? (
            <div className="space-y-8">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">1</div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Face Coat: {getBaseLabel()}</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <RecipeCard label="Base Binder" value={displaySolid(calculations.face?.cement || 0)} bg="bg-blue-50/30" />
                  <RecipeCard label="Fine Sand" value={displaySolid(calculations.face?.sand || 0)} />
                  <RecipeCard label="Water" value={displayLiquid(calculations.face?.water || 0)} color="text-blue-500" />
                  <RecipeCard label={faceMaxicril ? "Maxicril" : "Polymer"} value={displayLiquid(calculations.face?.polymer || 0)} color="text-indigo-600" />
                  {faceMaxiflo && <RecipeCard label="Maxiflo (Face)" value={displayLiquid(calculations.face?.maxiflo || 0)} color="text-pink-600" bg="bg-pink-50/50" />}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-lg">2</div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Backer Coat: Structural Layer</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <RecipeCard label="Portland Cement" value={displaySolid(calculations.backer?.cement || 0)} />
                  <RecipeCard label="Backer Sand" value={displaySolid(calculations.backer?.sand || 0)} />
                  <RecipeCard label="Water" value={displayLiquid(calculations.backer?.water || 0)} color="text-blue-500" />
                  <RecipeCard label={backerMaxicril ? "Maxicril" : "Polymer"} value={displayLiquid(calculations.backer?.polymer || 0)} color="text-indigo-600" />
                  <RecipeCard label="AR Glass Fiber" value={displaySolid(calculations.backer?.fiber || 0)} color="text-orange-500" bg="bg-orange-50" />
                  {backerMaxiflo && <RecipeCard label="Maxiflo (Backer)" value={displayLiquid(calculations.backer?.maxiflo || 0)} color="text-pink-600" bg="bg-pink-50/50" />}
                  {useFiberMesh && <RecipeCard label="Fiberglass Mesh" value={`${calculations.backer?.meshSqFt.toFixed(1)} sq ft`} color="text-emerald-600" bg="bg-emerald-50" />}
                </div>
              </section>
            </div>
          ) : (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">A</div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Wet-Cast Batch</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <RecipeCard label="Cement" value={displaySolid(calculations.traditional?.cement || 0)} />
                <RecipeCard label="Aggregates" value={displaySolid(calculations.traditional?.sand || 0)} />
                <RecipeCard label="Liquid" value={displayLiquid(calculations.traditional?.water || 0)} color="text-blue-500" />
                <RecipeCard label="Polymer" value={displayLiquid(calculations.traditional?.polymer || 0)} color="text-indigo-600" />
                {useFiberMesh && <RecipeCard label="Fiberglass Mesh" value={`${calculations.traditional?.meshSqFt.toFixed(1)} sq ft`} color="text-emerald-600" bg="bg-emerald-50" />}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h4 className="text-sm font-bold mb-4 text-blue-400 uppercase tracking-tighter border-b border-slate-800 pb-2">Batch Parameters</h4>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Primary Binder</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                  value={baseMaterial}
                  onChange={(e) => setBaseMaterial(e.target.value as BaseMaterial)}
                >
                  <option value="cement">Portland Cement (Standard)</option>
                  <option value="microcement">Microcement System</option>
                  <option value="repremax">Repremax Capafina 90</option>
                </select>
              </div>

              <div className="space-y-4">
                {mixType === 'gfrc' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Face Sand Ratio</span>
                      <span className="text-xs font-mono text-cyan-400">{ratios.faceSandRatio.toFixed(1)} : 1</span>
                    </div>
                    <input 
                      type="range" min="0.0" max="2.0" step="0.1" 
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      value={ratios.faceSandRatio} 
                      onChange={e => setRatios({...ratios, faceSandRatio: parseFloat(e.target.value)})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">W/C Ratio</span>
                    <span className="text-xs font-mono text-blue-400">{ratios.waterCement.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.25" max="0.45" step="0.01" 
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    value={ratios.waterCement} 
                    onChange={e => setRatios({...ratios, waterCement: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Polymer Load</span>
                    <span className="text-xs font-mono text-indigo-400">{(ratios.polymer * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0.03" max="0.15" step="0.01" 
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    value={ratios.polymer} 
                    onChange={e => setRatios({...ratios, polymer: parseFloat(e.target.value)})}
                  />
                </div>

                {mixType === 'gfrc' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fiber Load (GFRC)</span>
                      <span className="text-xs font-mono text-orange-400">{(ratios.fiber * 100).toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" min="0.01" max="0.06" step="0.005" 
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      value={ratios.fiber} 
                      onChange={e => setRatios({...ratios, fiber: parseFloat(e.target.value)})}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-5">
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Admixture Stack</span>
                  
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Face Coat</span>
                    <div className="flex gap-2">
                      <MiniToggle label="Maxicril" active={faceMaxicril} onClick={() => setFaceMaxicril(!faceMaxicril)} color="bg-indigo-600" />
                      <MiniToggle label="Maxiflo" active={faceMaxiflo} onClick={() => setFaceMaxiflo(!faceMaxiflo)} color="bg-pink-600" />
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Backer Coat</span>
                    <div className="flex gap-2">
                      <MiniToggle label="Maxicril" active={backerMaxicril} onClick={() => setBackerMaxicril(!backerMaxicril)} color="bg-indigo-600" />
                      <MiniToggle label="Maxiflo" active={backerMaxiflo} onClick={() => setBackerMaxiflo(!backerMaxiflo)} color="bg-pink-600" />
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Reinforcement</span>
                    <MiniToggle label="Fiberglass Mesh" active={useFiberMesh} onClick={() => setUseFiberMesh(!useFiberMesh)} color="bg-emerald-600" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-slate-800/30 p-2 rounded-lg">
                  <span className="text-xs text-slate-400 font-bold">Waste Factor</span>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-10 bg-slate-800 border border-slate-700 rounded text-center text-xs p-1" value={wasteFactor} onChange={e => setWasteFactor(Number(e.target.value))} />
                    <span className="text-[10px] text-slate-500 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniToggle = ({ label, active, onClick, color }: { label: string, active: boolean, onClick: () => void, color: string }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-2 rounded-lg border transition-all text-[10px] font-bold uppercase ${active ? `${color} border-transparent text-white shadow-lg` : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
  >
    {label}
  </button>
);

const RecipeCard: React.FC<{ label: string; value: string; color?: string; bg?: string; }> = ({ label, value, color = "text-slate-900", bg = "bg-white" }) => (
  <div className={`${bg} border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-center min-h-[60px]`}>
    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1 truncate tracking-tighter">{label}</div>
    <div className={`text-sm font-bold ${color} truncate`}>{value}</div>
  </div>
);
