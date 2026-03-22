"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Leaf, Package, Trash2, Zap, ClipboardList } from 'lucide-react';

const AZIONE_ICONS: Record<string, React.ReactNode> = {
  CARICO: <Package className="w-5 h-5" />,
  SCARICO: <Package className="w-5 h-5" />,
  SCARTO: <Trash2 className="w-5 h-5" />,
  SPOSTAMENTO: <Zap className="w-5 h-5" />,
  TASK: <ClipboardList className="w-5 h-5" />,
  ORDINE: <Package className="w-5 h-5" />,
  ELIMINA: <Trash2 className="w-5 h-5" />,
  ANNULLATO: <AlertCircle className="w-5 h-5" />,
  CREA_ZONA: <CheckCircle2 className="w-5 h-5" />,
  TRATTAMENTO: <Leaf className="w-5 h-5" />,
  STATO_SALUTE: <Leaf className="w-5 h-5" />,
  UNKNOWN: <AlertCircle className="w-5 h-5" />,
};

const AZIONE_COLORS: Record<string, string> = {
  CARICO: 'bg-emerald-500 text-white',
  SCARICO: 'bg-orange-500 text-white',
  SCARTO: 'bg-red-500 text-white',
  SPOSTAMENTO: 'bg-blue-500 text-white',
  TASK: 'bg-purple-500 text-white',
  ORDINE: 'bg-yellow-500 text-slate-900',
  ELIMINA: 'bg-red-600 text-white',
  ANNULLATO: 'bg-slate-600 text-white',
  CREA_ZONA: 'bg-emerald-500 text-white',
  TRATTAMENTO: 'bg-teal-500 text-white',
  STATO_SALUTE: 'bg-cyan-500 text-white',
  UNKNOWN: 'bg-slate-700 text-white',
};

export default function GlobalVoiceFAB() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState<{ action: string; message: string; show: boolean } | null>(null);
  const [pendingCmd, setPendingCmd] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  // Timer per nascondere il toast
  useEffect(() => {
    if (toast?.show) {
      const t = setTimeout(() => {
        setToast(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [toast?.show]);

  // Init Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'it-IT';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setTranscript("");
        };

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setToast({ action: 'UNKNOWN', message: 'Errore microfono. Riprova.', show: true });
        };

        recognitionRef.current.onend = async () => {
          setIsListening(false);
          const finalTranscript = recognitionRef.current?.lastTranscript;
          if (finalTranscript?.length > 2) {
            await processVoiceCommand(finalTranscript);
          }
        };
      }
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lastTranscript = transcript;
    }
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!pendingCmd) setToast(null);
      try { recognitionRef.current?.start(); } catch (e) { console.error(e); }
    }
  };

  const processVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setTranscript("");

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, pendingCmd }),
      });

      const data = await response.json();

      if (!response.ok && !data.needs_confirmation) {
        throw new Error(data.error || 'Errore di processamento');
      }

      if (data.needs_confirmation) {
        setPendingCmd(data.pendingCmd);
        setToast({ action: 'ELIMINA', message: data.message, show: true });
        setIsProcessing(false);
        setTimeout(() => {
          if (recognitionRef.current && !isListening) {
            try { recognitionRef.current.start(); } catch (e) { console.error(e); }
          }
        }, 1200);
        return;
      }

      setPendingCmd(null);

      setToast({ 
        action: data.result?.azione || 'UNKNOWN', 
        message: data.message || 'Operazione completata', 
        show: true 
      });

    } catch (error: any) {
      setPendingCmd(null);
      setToast({ action: 'UNKNOWN', message: error.message || 'Errore non specificato.', show: true });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[100] flex flex-col items-end gap-3">
      
      {/* Toast di Feedback Dinamico */}
      <div className={`transition-all duration-500 transform ${
        toast?.show 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}>
        {toast && (
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md max-w-xs ${AZIONE_COLORS[toast.action] || AZIONE_COLORS.UNKNOWN}`}>
            {AZIONE_ICONS[toast.action] || AZIONE_ICONS.UNKNOWN}
            <span className="font-semibold text-sm leading-snug">{toast.message}</span>
          </div>
        )}
      </div>

      {/* Trascrizione (mostrata mentre si parla o processa) */}
      {(isListening || isProcessing) && !toast?.show && (
        <div className="bg-slate-900/90 border border-slate-700/50 px-5 py-2.5 rounded-2xl max-w-xs text-right shadow-xl">
          <p className="text-emerald-400 font-medium italic text-sm">
            {isProcessing ? "Elaborazione..." : (transcript || "In ascolto...")}
          </p>
        </div>
      )}

      {/* Pulsante Microfono FAB */}
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`flex items-center justify-center w-16 h-16 md:w-18 md:h-18 rounded-full 
          transition-all duration-300 ease-out shadow-[0_0_30px_rgba(0,0,0,0.4)]
          ${isProcessing ? 'bg-slate-700 cursor-not-allowed opacity-50' :
            isListening
              ? (pendingCmd ? 'bg-red-500 hover:bg-red-400 recording-pulse scale-110' : 'bg-emerald-500 hover:bg-emerald-400 recording-pulse scale-110')
              : (pendingCmd ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500')
          }`}
        aria-label={isListening ? "Ferma registrazione" : "Inizia registrazione"}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-slate-300 animate-spin" />
        ) : isListening ? (
          <Square className="w-7 h-7 text-emerald-950 fill-current" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </button>
    </div>
  );
}
