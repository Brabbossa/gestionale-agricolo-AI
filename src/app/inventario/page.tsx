import { Sprout, Search, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default async function InventarioPage() {
  // Fetch real data from Supabase
  const { data: plants } = await supabase
    .from('Plant')
    .select('*')
    .order('updatedAt', { ascending: false });

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Sprout className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Inventario Vivo</h1>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
              type="text" 
              placeholder="Cerca varietà..." 
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded-xl hover:bg-slate-700 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="glass-card w-full overflow-hidden p-0 border-t border-b border-l-0 border-r-0 md:border-2 md:rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50">
                <th className="p-4 font-medium text-slate-400 text-sm">Varietà / Specie</th>
                <th className="p-4 font-medium text-slate-400 text-sm">Giacenza Totale</th>
                <th className="p-4 font-medium text-slate-400 text-sm">Posizione</th>
                <th className="p-4 font-medium text-slate-400 text-sm hidden sm:table-cell">Ultimo Aggiornamento</th>
                <th className="p-4 font-medium text-right text-slate-400 text-sm">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {plants && plants.length > 0 ? plants.map(plant => (
                <tr key={plant.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-slate-100 font-medium cursor-pointer">
                    {plant.name}
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${plant.quantity < 10 ? 'text-red-400' : plant.quantity < 20 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {plant.quantity}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">
                    <span className="bg-slate-800 px-2 py-1 rounded text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block">
                      {plant.location || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm hidden sm:table-cell">
                    {new Date(plant.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors">Dettagli</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nessuna pianta in inventario. Usa l'assistente vocale per aggiungere giacenze.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/50 border-t border-slate-800/50">
          Risultati dal Database Supabase Live (Revalidation Dinamica)
        </div>
      </div>
    </div>
  );
}
