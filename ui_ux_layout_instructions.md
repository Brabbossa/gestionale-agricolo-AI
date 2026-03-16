# Modulo: Struttura di Navigazione e Layout Base (UI/UX)

**Obiettivo:** Creare lo scheletro dell'interfaccia utente (Shell) con un design responsivo che si adatti a smartphone e desktop, separando le funzioni operative da quelle gestionali.

## Specifiche Tecniche per la Generazione:

1. **Layout Mobile (Schermi piccoli):**
   Implementa una "Bottom Navigation Bar" (barra in basso) con 3 icone fisse:
   - 🎤 **Assistente** (La home con il microfono già sviluppato)
   - 📋 **Task** (Lista attività)
   - 📷 **Scanner**

2. **Layout Desktop (Schermi grandi):**
   Nascondi la barra inferiore e trasforma la navigazione in una "Sidebar" (barra laterale a sinistra). Aggiungi queste voci esclusive per il desktop:
   - 📊 **Dashboard**
   - 🌱 **Inventario Vivo**
   - 📦 **Ordini**
   - ⚙️ **Impostazioni IA**

3. **Librerie e Stile:**
   Usa componenti UI puliti, minimalisti e ad alto contrasto (pensati per la leggibilità all'aperto). Struttura l'app in modo che il componente del microfono (già creato) venga integrato perfettamente nella vista 🎤 Assistente.
