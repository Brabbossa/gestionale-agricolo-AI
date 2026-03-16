import { LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch real data from Supabase
  const { data: plants } = await supabase.from('Plant').select('*');
  const { data: movements } = await supabase
    .from('Movement')
    .select('*')
    .gte('createdAt', new Date(new Date().setHours(0,0,0,0)).toISOString());

  const totalePiante = plants?.reduce((acc, p) => acc + p.quantity, 0) || 0;
  const movimentiOggi = movements?.length || 0;
  
  // Fetch pending counts
  const { data: orders } = await supabase.from('Order').select('id').neq('status', 'RICEVUTO');
  const { data: tasks } = await supabase.from('Task').select('id').neq('status', 'COMPLETATA');
  
  const ordiniPendenti = orders?.length || 0;
  const taskAperti = tasks?.length || 0;

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <LayoutDashboard className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100">Dashboard Direzionale</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card flex flex-col gap-2 p-5">
          <h3 className="text-slate-400 font-medium text-sm">Totale Inventario</h3>
          <p className="text-3xl font-bold text-slate-100">{totalePiante} <span className="text-sm font-normal text-slate-500">pz</span></p>
        </div>
        <div className="glass-card flex flex-col gap-2 p-5">
          <h3 className="text-slate-400 font-medium text-sm">Movimenti Oggi</h3>
          <p className="text-3xl font-bold text-emerald-400">{movimentiOggi}</p>
        </div>
        <div className="glass-card flex flex-col gap-2 p-5 border-orange-500/20">
          <h3 className="text-slate-400 font-medium text-sm">Ordini Pendenti</h3>
          <p className="text-3xl font-bold text-orange-400">{ordiniPendenti}</p>
        </div>
        <div className="glass-card flex flex-col gap-2 p-5 border-blue-500/20">
          <h3 className="text-slate-400 font-medium text-sm">Task da Svolgere</h3>
          <p className="text-3xl font-bold text-blue-400">{taskAperti}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="glass-card w-full h-[400px] flex flex-col overflow-hidden">
          <h3 className="text-xl font-bold text-slate-200 mb-4 px-2">Ultimi Movimenti</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {movements && movements.length > 0 ? (
              movements.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(mov => {
                const isCarico = mov.type === 'CARICO';
                return (
                  <div key={mov.id} className="p-3 bg-slate-800/40 rounded-lg flex items-center justify-between border border-slate-700/50">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block ${isCarico ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {mov.type}
                      </span>
                      <p className="text-sm text-slate-300">Qtà: <strong className="text-white">{mov.quantity}</strong></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{new Date(mov.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      {mov.reason && <p className="text-xs text-slate-400 italic mt-1">{mov.reason}</p>}
                    </div>
                  </div>
                )
              })
            ) : (
               <div className="h-full flex items-center justify-center">
                 <p className="text-slate-500 text-sm">Nessun movimento registrato oggi.</p>
               </div>
            )}
          </div>
        </div>

        <div className="glass-card w-full h-[400px] flex flex-col overflow-hidden">
          <h3 className="text-xl font-bold text-slate-200 mb-4 px-2">Giaccenze in esaurimento</h3>
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {plants && plants.filter(p => p.quantity < 20).length > 0 ? (
               plants.filter(p => p.quantity < 20).sort((a,b) => a.quantity - b.quantity).map(plant => (
                  <div key={plant.id} className="p-3 bg-slate-800/40 rounded-lg flex items-center justify-between border border-slate-700/50">
                    <div>
                      <p className="font-medium text-slate-200">{plant.name}</p>
                      <p className="text-xs text-slate-400">{plant.location}</p>
                    </div>
                    <p className={`text-lg font-bold ${plant.quantity < 10 ? 'text-red-400' : 'text-orange-400'}`}>
                      {plant.quantity} pz
                    </p>
                  </div>
               ))
            ) : (
                <div className="h-full flex items-center justify-center">
                 <p className="text-emerald-500/70 text-sm">Nessun allarme scorte. Tutto in regola!</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
