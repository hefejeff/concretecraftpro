import React, { useState, useRef, useEffect } from 'react';
import { getDesignAdvice } from '../services/geminiService';
import { Slab, UnitSystem, Cutout } from '../types';
import { MaterialsCalculator } from './MaterialsCalculator';

const FINISHES = [
  { name: 'Artisan Charcoal', hex: '#1e293b', description: 'Deep, rich gray with subtle trowel marks.' },
  { name: 'Industrial Pewter', hex: '#475569', description: 'Medium gray with a smooth, matte finish.' },
  { name: 'Natural Bone', hex: '#f1f5f9', description: 'Warm off-white with a minimalist aesthetic.' },
  { name: 'Desert Sand', hex: '#e2e8f0', description: 'Light beige with visible sand aggregate.' },
];

const DimensionInput: React.FC<{ label: string, value: number, onChange: (val: number) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</label>
    <input 
      type="number" 
      step="0.1"
      className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  </div>
);

export const DesignVisualizer: React.FC = () => {
  const [unit, setUnit] = useState<UnitSystem>('imperial');
  const [selectedFinish, setSelectedFinish] = useState(FINISHES[0]);
  const [slabs, setSlabs] = useState<Slab[]>([
    { id: '1', name: 'Main Island', length: 72, width: 36, thickness: 1.5, edges: 18, x: 50, y: 50, cutouts: [] }
  ]);
  const [selectedSlabId, setSelectedSlabId] = useState<string | null>('1');
  const [selectedCutoutId, setSelectedCutoutId] = useState<string | null>(null);
  const [consultQuery, setConsultQuery] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resizingSlab, setResizingSlab] = useState<{ id: string, startX: number, startY: number, startW: number, startH: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const SCALE = 2; 
  const SNAP_THRESHOLD = 12;

  const toDisplay = (val: number) => unit === 'imperial' ? val : parseFloat((val * 2.54).toFixed(1));
  const fromDisplay = (val: number) => unit === 'imperial' ? val : parseFloat((val / 2.54).toFixed(2));
  const unitLabel = unit === 'imperial' ? 'in' : 'cm';

  const selectedSlab = slabs.find(s => s.id === selectedSlabId);
  const selectedCutout = selectedSlab?.cutouts?.find(c => c.id === selectedCutoutId);

  const updateSlab = (id: string, updates: Partial<Slab>) => {
    setSlabs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateCutout = (slabId: string, cutoutId: string, updates: Partial<Cutout>) => {
    setSlabs(prev => prev.map(s => {
      if (s.id !== slabId) return s;
      return {
        ...s,
        cutouts: s.cutouts?.map(c => c.id === cutoutId ? { ...c, ...updates } : c)
      };
    }));
  };

  const addSlab = () => {
    const newId = Math.random().toString();
    const newSlab: Slab = {
      id: newId,
      name: `Slab ${slabs.length + 1}`,
      length: 24,
      width: 24,
      thickness: slabs[0]?.thickness || 1.5,
      edges: 4,
      x: 10,
      y: 10,
      cutouts: []
    };
    setSlabs([...slabs, newSlab]);
    setSelectedSlabId(newId);
    setSelectedCutoutId(null);
  };

  const addCutout = () => {
    if (!selectedSlabId || !selectedSlab) return;
    const newCutout: Cutout = {
      id: Math.random().toString(),
      name: 'Sink Cutout',
      length: 18,
      width: 12,
      x: 5,
      y: 5
    };
    updateSlab(selectedSlabId, { 
      cutouts: [...(selectedSlab.cutouts || []), newCutout] 
    });
    setSelectedCutoutId(newCutout.id);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (resizingSlab) { e.preventDefault(); return; }
    setSelectedSlabId(id);
    setSelectedCutoutId(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('type', 'slab');
    e.dataTransfer.setData('slabId', id);
    e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
    e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
  };

  const handleCutoutDragStart = (e: React.DragEvent, slabId: string, cutoutId: string) => {
    e.stopPropagation();
    setSelectedSlabId(slabId);
    setSelectedCutoutId(cutoutId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('type', 'cutout');
    e.dataTransfer.setData('slabId', slabId);
    e.dataTransfer.setData('cutoutId', cutoutId);
    e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
    e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const type = e.dataTransfer.getData('type');
    const slabId = e.dataTransfer.getData('slabId');
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
    const canvasRect = canvasRef.current.getBoundingClientRect();

    if (type === 'slab') {
      let targetX = e.clientX - canvasRect.left - offsetX;
      let targetY = e.clientY - canvasRect.top - offsetY;
      updateSlab(slabId, { x: targetX, y: targetY });
    } else if (type === 'cutout') {
      const cutoutId = e.dataTransfer.getData('cutoutId');
      const slab = slabs.find(s => s.id === slabId);
      if (!slab) return;
      const slabElement = document.getElementById(`slab-${slabId}`);
      if (!slabElement) return;
      const slabRect = slabElement.getBoundingClientRect();
      let relX = (e.clientX - slabRect.left - offsetX) / SCALE;
      let relY = (e.clientY - slabRect.top - offsetY) / SCALE;
      updateCutout(slabId, cutoutId, { x: relX, y: relY });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, slab: Slab) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSlabId(slab.id);
    setSelectedCutoutId(null);
    setResizingSlab({ id: slab.id, startX: e.clientX, startY: e.clientY, startW: slab.length, startH: slab.width });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSlab) return;
      const deltaX = (e.clientX - resizingSlab.startX) / SCALE;
      const deltaY = (e.clientY - resizingSlab.startY) / SCALE;
      updateSlab(resizingSlab.id, { 
        length: Math.max(4, resizingSlab.startW + deltaX), 
        width: Math.max(4, resizingSlab.startH + deltaY) 
      });
    };
    const handleMouseUp = () => setResizingSlab(null);
    if (resizingSlab) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingSlab]);

  const handleConsult = async () => {
    if (!consultQuery) return;
    setLoading(true);
    try {
      const details = `Layout: ${slabs.map(s => `${s.name} (${s.length}x${s.width}in with ${s.cutouts?.length || 0} cutouts)`).join(', ')}. Query: ${consultQuery}`;
      const result = await getDesignAdvice(details);
      setAdvice(result);
    } catch (error) { setAdvice("Error retrieving advice."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-700">Units:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {['imperial', 'metric'].map((u) => (
              <button 
                key={u}
                onClick={() => setUnit(u as UnitSystem)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${unit === u ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addSlab} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg">
            + Add Slab
          </button>
          {selectedSlabId && (
            <button onClick={addCutout} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg">
              + Add Sink Cutout
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div 
            ref={canvasRef} 
            onDragOver={(e) => e.preventDefault()} 
            onDrop={handleDrop} 
            onClick={() => { setSelectedSlabId(null); setSelectedCutoutId(null); }}
            className="bg-slate-100 rounded-3xl border-2 border-slate-200 p-8 min-h-[600px] relative overflow-hidden shadow-inner cursor-default"
          >
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            {slabs.map((slab) => (
              <div 
                key={slab.id}
                id={`slab-${slab.id}`}
                draggable={!resizingSlab}
                onDragStart={(e) => handleDragStart(e, slab.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedSlabId(slab.id); setSelectedCutoutId(null); }}
                className={`absolute group border-2 shadow-xl transition-all duration-200 ${selectedSlabId === slab.id && !selectedCutoutId ? 'border-blue-500 ring-4 ring-blue-500/20 z-20' : 'border-slate-500 z-10'}`}
                style={{ left: `${slab.x}px`, top: `${slab.y}px`, width: `${slab.length * SCALE}px`, height: `${slab.width * SCALE}px`, backgroundColor: selectedFinish.hex, cursor: 'grab' }}
              >
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/concrete-wall.png")' }}></div>
                
                <div className="absolute top-2 left-2 text-[10px] font-bold text-white/50 pointer-events-none select-none uppercase tracking-tighter">
                  {slab.name}
                </div>

                {slab.cutouts?.map(cutout => (
                  <div 
                    key={cutout.id}
                    draggable
                    onDragStart={(e) => handleCutoutDragStart(e, slab.id, cutout.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedSlabId(slab.id); setSelectedCutoutId(cutout.id); }}
                    className={`absolute bg-white border-2 border-dashed border-slate-300 flex items-center justify-center transition-all ${selectedCutoutId === cutout.id ? 'border-blue-400 ring-2 ring-blue-400/50 scale-[1.02] z-30 shadow-md' : 'hover:border-slate-400 z-25'}`}
                    style={{ left: `${cutout.x * SCALE}px`, top: `${cutout.y * SCALE}px`, width: `${cutout.length * SCALE}px`, height: `${cutout.width * SCALE}px`, cursor: 'move' }}
                  >
                    <span className="text-[8px] text-slate-400 font-bold uppercase select-none tracking-widest">SINK AREA</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateSlab(slab.id, { cutouts: slab.cutouts?.filter(c => c.id !== cutout.id) }); if(selectedCutoutId === cutout.id) setSelectedCutoutId(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div onMouseDown={(e) => handleResizeStart(e, slab)} className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-0.5 z-40">
                  <div className="w-3 h-3 border-r-2 border-b-2 border-white/60"></div>
                </div>
              </div>
            ))}
          </div>
          <MaterialsCalculator slabs={slabs} unit={unit} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest border-b pb-2">
              {selectedCutoutId ? `Sink: ${selectedCutout?.name}` : selectedSlabId ? `Slab: ${selectedSlab?.name}` : 'Properties'}
            </h3>
            
            {selectedCutout && selectedSlab ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <DimensionInput label={`Length (${unitLabel})`} value={toDisplay(selectedCutout.length)} onChange={(v) => updateCutout(selectedSlab.id, selectedCutout.id, { length: fromDisplay(v) })} />
                  <DimensionInput label={`Width (${unitLabel})`} value={toDisplay(selectedCutout.width)} onChange={(v) => updateCutout(selectedSlab.id, selectedCutout.id, { width: fromDisplay(v) })} />
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-[10px] text-blue-700 font-medium leading-relaxed">
                  Sink cutouts reduce material requirements. Volume is subtracted from total batch calculation.
                </div>
              </div>
            ) : selectedSlab ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <DimensionInput label={`Length (${unitLabel})`} value={toDisplay(selectedSlab.length)} onChange={(v) => updateSlab(selectedSlab.id, { length: fromDisplay(v) })} />
                  <DimensionInput label={`Width (${unitLabel})`} value={toDisplay(selectedSlab.width)} onChange={(v) => updateSlab(selectedSlab.id, { width: fromDisplay(v) })} />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <DimensionInput label={`Thickness (${unitLabel})`} value={toDisplay(selectedSlab.thickness)} onChange={(v) => updateSlab(selectedSlab.id, { thickness: fromDisplay(v) })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Section Name</label>
                  <input type="text" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" value={selectedSlab.name} onChange={(e) => updateSlab(selectedSlab.id, { name: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm italic">Select an object to edit dimensions.</div>
            )}
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-bold mb-4 text-blue-400 uppercase tracking-widest">Expert Consultant</h3>
            <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm outline-none focus:border-blue-500 transition-all mb-4 h-24" placeholder="Ask about reinforcement or mix ratios..." value={consultQuery} onChange={(e) => setConsultQuery(e.target.value)} />
            <button onClick={handleConsult} disabled={loading} className="w-full bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50">{loading ? 'Analyzing Project...' : 'Get Advice'}</button>
            {advice && <div className="mt-6 p-4 bg-slate-800/50 rounded-xl text-xs text-slate-300 leading-relaxed border border-slate-700 max-h-48 overflow-y-auto">{advice}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};