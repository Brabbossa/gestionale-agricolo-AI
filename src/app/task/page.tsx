"use client";
import { ClipboardList, Check, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = { id: string; description: string; status: string; createdAt: string };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DA_FARE:     { label: "Da Fare",     color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  IN_CORSO:    { label: "In Corso",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  COMPLETATA:  { label: "Completata",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('Task').select('*').order('createdAt', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('Task').update({ status }).eq('id', id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('Task').delete().eq('id', id);
    fetchTasks();
  };

  const pending = tasks.filter(t => t.status !== 'COMPLETATA');
  const done = tasks.filter(t => t.status === 'COMPLETATA');

  return (
    <div className="p-6 md:p-10 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Attività (Task)</h1>
        </div>
        <button onClick={fetchTasks} className="p-2 text-slate-400 hover:text-emerald-400 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <p className="text-slate-400 text-sm -mt-4">
        Dì all'assistente <span className="text-emerald-400 font-medium">"ricordati di [attività]"</span> per aggiungere un task.
      </p>

      {/* Pending Tasks */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
          Da Completare ({pending.length})
        </h2>
        {loading ? (
          <div className="glass-card flex items-center justify-center h-32 text-slate-500">Caricamento...</div>
        ) : pending.length === 0 ? (
          <div className="glass-card flex items-center justify-center h-24 text-emerald-500/70 text-sm gap-2">
            <Check className="w-5 h-5" /> Tutto completato per oggi!
          </div>
        ) : pending.map(task => {
          const s = STATUS_LABEL[task.status] || STATUS_LABEL['DA_FARE'];
          return (
            <div key={task.id} className="glass-card flex items-center gap-4">
              <button
                onClick={() => updateStatus(task.id, 'COMPLETATA')}
                className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/20 flex-shrink-0 transition-all"
              />
              <div className="flex-1">
                <p className="text-slate-100 font-medium">{task.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                  <span className="text-xs text-slate-500">{new Date(task.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {task.status === 'DA_FARE' && (
                  <button onClick={() => updateStatus(task.id, 'IN_CORSO')} className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">Avvia</button>
                )}
                <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Tasks */}
      {done.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Completate ({done.length})
          </h2>
          {done.map(task => (
            <div key={task.id} className="glass-card flex items-center gap-4 opacity-50">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex-shrink-0 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-slate-400 line-through flex-1">{task.description}</p>
              <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
