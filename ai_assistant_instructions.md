# Modulo: Assistente Vocale da Campo con Integrazione LLM API

**Obiettivo:** Creare un'interfaccia mobile per l'aggiornamento dell'inventario del vivaio elaborando comandi in linguaggio naturale tramite API LLM.

## Specifiche Tecniche per la Generazione del Codice:

1. **Frontend (Cattura Audio):** 
   - Usa la Web Speech API del browser per il riconoscimento vocale e la trasformazione in testo. 
   - Aggiungi un pulsante "Premi e Parla".

2. **Backend (Integrazione API):** 
   - Crea un endpoint sicuro (es. in Node.js o Python) che riceva il testo dal frontend e faccia la chiamata API al modello LLM scelto (Google Gemini, usando Google AI Studio).
   - Le variabili d'ambiente nasconderanno la chiave API (es. `GEMINI_API_KEY` in `.env`).

3. **Prompt di Sistema (System Message):** 
   - Imposta il backend in modo che invii all'LLM questo comando: 
     *"Sei il gestionale logistico di un vivaio. Analizza il messaggio dell'operatore e restituisci ESCLUSIVAMENTE un oggetto JSON con questa struttura: `{ "azione": "scarico" | "spostamento" | "carico", "quantita": numero, "pianta": "nome_pianta", "posizione_origine": "...", "posizione_destinazione": "..." }`."*

4. **Gestione Errori:** 
   - Se l'LLM non riconosce i dati (es. l'operatore ha fatto una battuta o frase incompleta), il frontend deve rispondere: 
     *"Non ho capito il comando, puoi ripetere specificando la pianta e la quantità?"*

5. **Esecuzione:** 
   - Una volta ricevuto il JSON dall'LLM, il backend aggiorna le tabelle dell'inventario del database.

---
*Nota: L'API key di Google AI Studio è stata salvata nel file .env.*
