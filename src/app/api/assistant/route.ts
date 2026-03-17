import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});

const SYSTEM_MESSAGE = `Sei il cervello intelligente di un gestionale logistico per un vivaio professionale.
Il tuo compito e' capire l'INTENTO dell'operatore e restituire ESCLUSIVAMENTE un singolo oggetto JSON valido.
Non aggiungere mai spiegazioni, testo, markdown o commenti al di fuori del JSON.

==TIPI DI INTENTO==

1. OPERAZIONI DI MAGAZZINO (merce fisicamente presente in struttura):
   - "azione": "CARICO"       -> Merce fisicamente arrivata (es. "scaricata dal camion", "sono arrivate")
   - "azione": "SCARICO"      -> Vendita o consegna di merce
   - "azione": "SCARTO"       -> Piante danneggiate da buttare
   - "azione": "SPOSTAMENTO"  -> Cambio posizione fisica in magazzino

2. ORDINE DI ACQUISTO (acquisire da fornitore):
   - "azione": "ORDINE" -> Parole chiave: "comprare", "acquistare", "ordinare", "bisogna comprare", "fai un ordine"

3. TASK / ATTIVITA':
   - "azione": "TASK" -> Parole chiave: "ricordati", "aggiungi attivita'", "metti in lista", "non dimenticare"

4. ELIMINAZIONE DI UN SINGOLO RECORD:
   - "azione": "ELIMINA"
   - "target_type": uno tra "TASK", "ORDINE", "PIANTA"
   - "criterio": parola chiave da cercare (nome specifico, non "tutto")
   - Usare quando l'operatore dice: "cancella", "elimina", "rimuovi", "togli", "annulla" + un NOME SPECIFICO
   - Esempio: "cancella il task delle orchidee" -> { "azione": "ELIMINA", "target_type": "TASK", "criterio": "orchidee" }
   - Esempio: "rimuovi l'ordine delle rose" -> { "azione": "ELIMINA", "target_type": "ORDINE", "criterio": "rose" }

5. ELIMINAZIONE MASSIVA (cancellare TUTTI i dati di uno o piu' tipi):
   - "azione": "ELIMINA_TUTTO"
   - "target_types": array con uno o piu' tra "TASK", "ORDINI", "PIANTE"
   - IMPORTANTE: Usare SEMPRE quando compaiono le parole "tutto", "tutti", "tutte", "ogni", "azzerare", "svuotare"
   - Esempio: "elimina tutto" -> { "azione": "ELIMINA_TUTTO", "target_types": ["TASK", "ORDINI", "PIANTE"] }
   - Esempio: "cancella tutti gli ordini e tutte le task" -> { "azione": "ELIMINA_TUTTO", "target_types": ["ORDINI", "TASK"] }
   - Esempio: "azzera le task" -> { "azione": "ELIMINA_TUTTO", "target_types": ["TASK"] }
   - Esempio: "svuota l'inventario" -> { "azione": "ELIMINA_TUTTO", "target_types": ["PIANTE"] }
   - Esempio: "elimina tutti gli ordini e tutto l'inventario" -> { "azione": "ELIMINA_TUTTO", "target_types": ["ORDINI", "PIANTE"] }

==REGOLE CRITICHE==
- COMPRARE / ACQUISTARE / ORDINARE -> SEMPRE "ORDINE", MAI "CARICO".
- "CARICO" solo se la merce e' fisicamente arrivata in struttura.
- TUTTO / TUTTI / TUTTE / OGNI -> SEMPRE "ELIMINA_TUTTO", MAI "ELIMINA".
- "ELIMINA" si usa SOLO per un record specifico identificato da un nome concreto.
- Restituisci SOLO JSON puro, zero testo extra.`;

// Log every command to the Chat_History table
async function logToHistory(user_message: string, ai_response: string, azione: string, success: boolean) {
  await supabase.from('Chat_History').insert({ user_message, ai_response, azione, success });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: 'Messaggio richiesto' }, { status: 400 });
  }

  let cmd: Record<string, any> = {};

  try {
    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_MESSAGE,
        responseMimeType: 'application/json',
      },
    });

    const textResponse = aiRes.text;
    if (!textResponse) throw new Error('Nessuna risposta dal modello IA');

    try {
      cmd = JSON.parse(textResponse);
    } catch {
      await logToHistory(message, 'Parsing JSON error', 'UNKNOWN', false);
      return NextResponse.json({ error: 'Non ho capito il comando, puoi ripeterlo?' }, { status: 422 });
    }

    let { azione } = cmd;
    if (!azione) {
      await logToHistory(message, 'No azione found', 'UNKNOWN', false);
      return NextResponse.json({ error: "Impossibile determinare l'azione dal comando." }, { status: 422 });
    }

    // ── Smart upgrade: ELIMINA with bulk criterio -> ELIMINA_TUTTO ────────────
    if (azione === 'ELIMINA' && cmd.criterio) {
      const bulkWords = ['tutto', 'tutti', 'tutte', 'all', 'ogni', 'qualsiasi', 'intera', 'intero'];
      if (bulkWords.some(w => cmd.criterio.toLowerCase().includes(w))) {
        // Upgrade to bulk delete
        const typeMap: Record<string, string> = { TASK: 'TASK', ORDINE: 'ORDINI', PIANTA: 'PIANTE' };
        cmd.azione = 'ELIMINA_TUTTO';
        cmd.target_types = cmd.target_type ? [typeMap[cmd.target_type] || 'TASK'] : ['TASK', 'ORDINI', 'PIANTE'];
        azione = 'ELIMINA_TUTTO';
      }
    }

    // ── Also smart upgrade: if message text contains bulk words, force ELIMINA_TUTTO ─
    if (azione === 'ELIMINA') {
      const msgLower = message.toLowerCase();
      const hasBulk = ['elimina tutto', 'cancella tutto', 'svuota tutto', 'elimina tutti', 'cancella tutti', 'rimuovi tutto'].some(p => msgLower.includes(p));
      if (hasBulk) {
        cmd.azione = 'ELIMINA_TUTTO';
        cmd.target_types = ['TASK', 'ORDINI', 'PIANTE'];
        azione = 'ELIMINA_TUTTO';
      }
    }

    // ── TASK ──────────────────────────────────────────────────────────────────
    if (azione === 'TASK') {
      const { descrizione } = cmd;
      if (!descrizione) return NextResponse.json({ error: 'Non ho capito il task.' }, { status: 422 });
      const { data: newTask, error } = await supabase.from('Task').insert({ description: descrizione, status: 'DA_FARE' }).select().single();
      if (error) throw error;
      const msg = `📋 Task aggiunto: "${descrizione}"`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newTask, message: msg });
    }

    // ── ORDINE ────────────────────────────────────────────────────────────────
    if (azione === 'ORDINE') {
      const { quantita, pianta } = cmd;
      if (!quantita || !pianta) return NextResponse.json({ error: "Mancano dati per l'ordine." }, { status: 422 });
      const { data: newOrder, error } = await supabase.from('Order').insert({ plantName: pianta, quantity: quantita, status: 'DA_ORDINARE' }).select().single();
      if (error) throw error;
      const msg = `🛒 Ordine creato: ${quantita} x "${pianta}"`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, record: newOrder, message: msg });
    }

    // ── ELIMINA_TUTTO (bulk delete) ───────────────────────────────────────────
    if (azione === 'ELIMINA_TUTTO') {
      const { target_types } = cmd;

      // If no target_types found, delete everything
      const targets: string[] = (Array.isArray(target_types) && target_types.length > 0)
        ? target_types
        : ['TASK', 'ORDINI', 'PIANTE'];

      const results: string[] = [];

      if (targets.includes('TASK')) {
        const { data: allTasks } = await supabase.from('Task').select('id');
        if (allTasks && allTasks.length > 0) {
          const ids = allTasks.map(t => t.id);
          await supabase.from('Task').delete().in('id', ids);
          results.push(`📋 ${allTasks.length} Task eliminati`);
        } else {
          results.push('📋 Nessun Task da eliminare');
        }
      }

      if (targets.includes('ORDINI')) {
        const { data: allOrders } = await supabase.from('Order').select('id');
        if (allOrders && allOrders.length > 0) {
          const ids = allOrders.map(o => o.id);
          await supabase.from('Order').delete().in('id', ids);
          results.push(`🛒 ${allOrders.length} Ordini eliminati`);
        } else {
          results.push('🛒 Nessun Ordine da eliminare');
        }
      }

      if (targets.includes('PIANTE')) {
        const { data: allPlants } = await supabase.from('Plant').select('id');
        if (allPlants && allPlants.length > 0) {
          const ids = allPlants.map(p => p.id);
          await supabase.from('Plant').delete().in('id', ids);
          results.push(`🌱 ${allPlants.length} Piante eliminate`);
        } else {
          results.push('🌱 Nessuna Pianta da eliminare');
        }
      }

      const msg = `🗑️ Eliminazione completata: ${results.join(' | ')}`;
      await logToHistory(message, msg, azione, true);
      return NextResponse.json({ result: cmd, message: msg });
    }

    // ── ELIMINA (single record) ───────────────────────────────────────────────
    if (azione === 'ELIMINA') {
      const { target_type, criterio } = cmd;
      if (!target_type || !criterio) return NextResponse.json({ error: 'Specifica cosa eliminare.' }, { status: 422 });

      let deletedMsg = '';
      let found = false;

      if (target_type === 'TASK') {
        const { data: tasks } = await supabase.from('Task').select('id, description').ilike('description', `%${criterio}%`);
        if (tasks && tasks.length > 0) {
          await supabase.from('Task').delete().eq('id', tasks[0].id);
          deletedMsg = `🗑️ Task eliminato: "${tasks[0].description}"`;
          found = true;
        }
      } else if (target_type === 'ORDINE') {
        const { data: orders } = await supabase.from('Order').select('id, plantName, quantity').ilike('plantName', `%${criterio}%`);
        if (orders && orders.length > 0) {
          await supabase.from('Order').delete().eq('id', orders[0].id);
          deletedMsg = `🗑️ Ordine eliminato: ${orders[0].quantity} x "${orders[0].plantName}"`;
          found = true;
        }
      } else if (target_type === 'PIANTA') {
        const { data: plants } = await supabase.from('Plant').select('id, name, quantity').ilike('name', `%${criterio}%`);
        if (plants && plants.length > 0) {
          await supabase.from('Plant').delete().eq('id', plants[0].id);
          deletedMsg = `🗑️ Pianta eliminata: "${plants[0].name}"`;
          found = true;
        }
      }

      if (!found) {
        const msg = `⚠️ Nessun record trovato con: "${criterio}"`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ message: msg }, { status: 404 });
      }

      await logToHistory(message, deletedMsg, azione, true);
      return NextResponse.json({ result: cmd, message: deletedMsg });
    }

    // ── WAREHOUSE OPERATIONS ──────────────────────────────────────────────────
    const { quantita, pianta, motivo, posizione_origine, posizione_destinazione } = cmd;
    if (!quantita || !pianta) {
      return NextResponse.json({ error: 'Mancano quantita o pianta. Ripeti perfavore.' }, { status: 422 });
    }

    const { data: plants, error: searchError } = await supabase.from('Plant').select('*').ilike('name', `%${pianta}%`);
    if (searchError) throw searchError;

    let targetPlant = plants && plants.length > 0 ? plants[0] : null;

    if (!targetPlant) {
      if (azione === 'CARICO') {
        const { data: newPlant, error: createError } = await supabase
          .from('Plant')
          .insert({ name: pianta, quantity: quantita, location: posizione_destinazione || 'Da definire' })
          .select().single();
        if (createError) throw createError;
        targetPlant = newPlant;
      } else {
        const msg = `⚠️ Non ho trovato "${pianta}" in inventario.`;
        await logToHistory(message, msg, azione, false);
        return NextResponse.json({ error: msg }, { status: 404 });
      }
    } else {
      let newQuantity = targetPlant.quantity;
      let newLocation = targetPlant.location;

      if (azione === 'CARICO') newQuantity += quantita;
      if (azione === 'SCARICO' || azione === 'SCARTO') newQuantity = Math.max(0, newQuantity - quantita);
      if (azione === 'SPOSTAMENTO' && posizione_destinazione) newLocation = posizione_destinazione;

      const { data: updatedPlant, error: updateError } = await supabase
        .from('Plant')
        .update({ quantity: newQuantity, location: newLocation, updatedAt: new Date().toISOString() })
        .eq('id', targetPlant.id)
        .select().single();
      if (updateError) throw updateError;
      targetPlant = updatedPlant;
    }

    const { error: movementError } = await supabase.from('Movement').insert({
      plantId: targetPlant.id,
      type: azione,
      quantity: quantita,
      reason: motivo || null,
      fromLocation: posizione_origine || null,
      toLocation: posizione_destinazione || null,
    });
    if (movementError) throw movementError;

    const emoji: Record<string, string> = { CARICO: '📦', SCARICO: '🏷️', SCARTO: '🗑️', SPOSTAMENTO: '🚛' };
    const msg = `${emoji[azione] || '✅'} ${azione}: ${quantita} "${targetPlant.name}" — Giacenza: ${targetPlant.quantity} pz.`;
    await logToHistory(message, msg, azione, true);
    return NextResponse.json({ result: cmd, plant: targetPlant, message: msg });

  } catch (error) {
    console.error('Error in AI Assistant API:', error);
    await logToHistory(message, 'Internal server error', cmd?.azione || 'UNKNOWN', false);
    return NextResponse.json({ error: "Si e' verificato un errore durante il salvataggio." }, { status: 500 });
  }
}
