import VoiceAssistant from "@/components/ui/VoiceAssistant";
import { Trees } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-full flex flex-col items-center justify-center p-4 relative pt-12 md:pt-4">

      {/* Brand Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 backdrop-blur-md">
          <Trees className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent tracking-tight">
          Nursery AI Logistics
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
        
        {/* Intro Text */}
        <div className="text-center space-y-4 max-w-2xl px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Gestisci il vivaio con la tua <span className="text-emerald-400">voce</span>.
          </h2>
          <p className="text-lg text-slate-400">
            Niente più tastiere o moduli complessi. Parla naturalmente e l'Intelligenza Artificiale si occuperà di aggiornare l'inventario istantaneamente.
          </p>
        </div>

        {/* The Voice Assistant Component */}
        <div className="w-full mt-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative">
             <VoiceAssistant />
          </div>
        </div>

      </div>
      
    </main>
  );
}
