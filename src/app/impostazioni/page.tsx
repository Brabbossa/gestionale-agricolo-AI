"use client";
import { Settings, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

export default function ImpostazioniPage() {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const startImport = () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    setProgress(10);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        if (data.length === 0) {
          setResult({ type: 'error', message: "Il file CSV sembra essere vuoto o non formattato correttamente (usa la prima riga come intestazione)." });
          setImporting(false);
          return;
        }

        setProgress(40);
        // Map the CSV columns. Expecting something like "Nome Pianta", "Giacenza", "Posizione"
        const plantsToInsert = data.map(row => ({
          name: row['Nome Pianta'] || row['Nome'] || row['nome'] || 'Nome Sconosciuto',
          quantity: parseInt(row['Giacenza'] || row['Quantita'] || row['quantita'] || '0', 10),
          location: row['Posizione'] || row['Settore'] || row['location'] || 'Da definire'
        }));

        setProgress(70);
        const { error } = await supabase.from('Plant').insert(plantsToInsert);
        
        if (error) {
          console.error("Errore importazione Supabase:", error);
          setResult({ type: 'error', message: `Errore database: ${error.message}` });
        } else {
          setResult({ type: 'success', message: `Fantastico! ${plantsToInsert.length} varietà sono state importate con successo nell'inventario.` });
          setFile(null); // reset
        }
        
        setProgress(100);
        setImporting(false);
      },
      error: (err) => {
        setResult({ type: 'error', message: `Errore di lettura CSV: ${err.message}` });
        setImporting(false);
      }
    });
  };

  return (
    <div className="p-6 md:p-10 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <Settings className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100">Impostazioni ERP</h1>
      </div>

      <div className="glass-card space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Migrazione Dati ("Tabula Rasa")</h2>
          <p className="text-slate-400 text-sm mt-1">
            Importa il tuo inventario dal vecchio gestionale. Carica un file <strong>.csv</strong> con le colonne: <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400 text-xs">Nome Pianta</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400 text-xs">Giacenza</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400 text-xs">Posizione</code>.
          </p>
        </div>

        <div 
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200
            ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 bg-slate-900/50 hover:bg-slate-800/50'}
            ${file ? 'border-emerald-500/50 bg-slate-800' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-medium">{file.name}</p>
                <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setFile(null)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition">Annulla</button>
                <button onClick={startImport} disabled={importing} className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-medium transition disabled:opacity-50 flex items-center gap-2">
                   {importing ? `Importazione... ${progress}%` : 'Carica Dati'}
                </button>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center gap-4 text-slate-400">
               <UploadCloud className="w-12 h-12 text-slate-500" />
               <p className="text-center">
                 Trascina qui il tuo file CSV<br />o <button onClick={() => fileInputRef.current?.click()} className="text-emerald-400 hover:underline">sfoglia dal computer</button>
               </p>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".csv" 
                 onChange={(e) => {
                   if (e.target.files && e.target.files.length > 0) {
                     setFile(e.target.files[0]);
                   }
                 }} 
               />
             </div>
          )}
        </div>

        {importing && (
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
             <div className="bg-emerald-500 h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-xl flex items-start gap-3 mt-4 border ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {result.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm font-medium">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
