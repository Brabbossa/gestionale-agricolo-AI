"use client";
import { ScanLine, Flashlight, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Plant = { id: string; name: string; quantity: number; location: string };

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Plant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);

    const { data } = await supabase
      .from('Plant')
      .select('*')
      .ilike('name', `%${query.trim()}%`)
      .limit(1);

    if (data && data.length > 0) {
      setResult(data[0]);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 md:p-10 w-full max-w-xl mx-auto space-y-8 flex flex-col items-center">
      <div className="flex items-center gap-3 self-start">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <ScanLine className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100">Scanner</h1>
      </div>

      {/* Scanner Viewfinder (visual mockup) */}
      <div
        className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer flex items-center justify-center
          ${scanning ? 'border-emerald-500 bg-black' : 'border-slate-700 bg-slate-900'}`}
        onClick={() => setScanning(s => !s)}
      >
        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>

        {/* Scan Line Animation */}
        {scanning && (
          <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_4px_rgba(52,211,153,0.6)] animate-scan" />
        )}

        <div className={`flex flex-col items-center gap-2 transition-opacity ${scanning ? 'opacity-30' : 'opacity-100'}`}>
          <ScanLine className="w-16 h-16 text-slate-600" />
          <p className="text-slate-500 text-sm">{scanning ? '' : 'Tocca per attivare la camera'}</p>
        </div>

        {scanning && (
          <p className="absolute bottom-4 text-emerald-400 text-sm animate-pulse">🔍 Scansione in corso...</p>
        )}
      </div>

      <p className="text-slate-500 text-sm text-center">
        La webcam integration è disponibile su HTTPS/produzione. In sviluppo, usa la ricerca manuale qui sotto.
      </p>

      {/* Manual Search */}
      <form onSubmit={handleSearch} className="w-full space-y-3">
        <label className="text-sm font-medium text-slate-400">Ricerca Manuale per Nome/Varietà</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            type="text"
            placeholder="es. Rosa Rossa, Ortensia..."
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Cerca'}
          </button>
        </div>
      </form>

      {/* Search Result */}
      {result && (
        <div className="w-full glass-card border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Trovato in magazzino</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-slate-500 text-xs mb-1">Varietà</p>
              <p className="font-semibold text-slate-100">{result.name}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-slate-500 text-xs mb-1">Giacenza</p>
              <p className={`text-2xl font-bold ${result.quantity < 10 ? 'text-red-400' : 'text-emerald-400'}`}>{result.quantity} pz</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 col-span-2">
              <p className="text-slate-500 text-xs mb-1">Posizione</p>
              <p className="font-medium text-slate-200">{result.location}</p>
            </div>
          </div>
        </div>
      )}

      {notFound && (
        <div className="w-full glass-card border-red-500/20 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>Nessuna pianta trovata con questo nome. Prova un termine diverso.</p>
        </div>
      )}
    </div>
  );
}
