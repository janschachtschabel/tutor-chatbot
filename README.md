# 🎓 QA Tutor Chatbot

Ein intelligenter Lernbegleiter-Chatbot mit integriertem Faktenwissen, WirLernenOnline.de-Integration und Learning Analytics.

## ✨ Features

### 🧠 Hybrides Antwortsystem
- **QA-Dataset**: Vordefinierte Frage-Antwort-Paare mit semantischer Suche
- **KI-Integration**: OpenAI GPT-4o-mini und GWDG LLM Support
- **Intelligente Priorisierung**: QA-Paare haben Vorrang vor KI-generierten Antworten

### 📚 WirLernenOnline.de Integration
- Automatische Extraktion von Lernmetadaten aus Nutzerfragen
- Suche nach passenden Lernmaterialien über WLO API
- Integration der Materialien in KI-Antworten mit direkten Links
- Filterung nach Fächern, Inhaltstypen und Quellen

### 📊 Learning Analytics
- Asynchrone Lernziel-Analyse basierend auf Bloom'scher Taxonomie
- Echtzeit-Fortschritts-Tracking pro Thema
- Lernerprofil-Erfassung (Bildungsstufe, Präferenzen, Motivation)
- Zeiterfassung pro Lernsession
- Visualisierung in der linken Seitenleiste

### ⚙️ Konfigurierbare Einstellungen
- **LLM Provider**: OpenAI oder GWDG
- **QA-Dataset**: Ein-/Ausschaltbar mit konfigurierbarer Ähnlichkeitsschwelle
- **WLO Integration**: Optional mit Debug-Modus und Quellenfilter
- **Learning Analytics**: Automatische Analyse nach jeder Antwort

## 🚀 Installation

### Voraussetzungen
- Node.js (Version 18+)
- npm oder yarn

### Setup

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd QA-Chatbot
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**
   
   Erstelle eine `.env` Datei im Hauptverzeichnis:
   ```env
   # OpenAI Configuration
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # GWDG Configuration (optional)
   VITE_GWDG_API_KEY=your_gwdg_api_key_here
   ```

4. **Development Server starten**
   ```bash
   npm run dev
   ```

   Die Anwendung ist dann unter `http://localhost:5173` verfügbar.

## 🏗️ Projektstruktur

```
QA-Chatbot/
├── public/
│   └── quant/                      # Kompakte Embedding-Assets (+ items.json)
├── scripts/
│   └── precompute_openai_embeddings.py  # Python: Embeddings + PCA/Int8 export
├── src/
│   ├── components/
│   │   ├── WLOSidebar.jsx
│   │   └── LearningAnalyticsSidebar.jsx
│   ├── lib/
│   │   ├── chatUtils.js
│   │   ├── systemPrompt.js         # Zentraler System-Prompt
│   │   ├── datasetLoader.js        # Lädt nur /quant/*.items.json und *.meta.json
│   │   ├── learningAnalytics.js
│   │   ├── mappings.js
│   │   └── types.js
│   ├── services/
│   │   ├── openaiService.js        # LLM-Calls, QA-Matching (nur Embeddings)
│   │   └── embeddingService.js     # PCA/Int8 Projektion & Suche
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js                  # Vite Konfiguration mit Proxies
└── .env                           # Umgebungsvariablen
```

## 🔧 Konfiguration

### LLM Provider

**OpenAI (Standard)**
- Modell: gpt-4o-mini
- Benötigt: `VITE_OPENAI_API_KEY`

**GWDG**
- Modell (Default): gpt-oss-120b (konfigurierbar via `VITE_GWDG_API_MODEL`)
- Benötigt: `VITE_GWDG_API_KEY`
- Endpoint: wird über Vite-Proxy `/api/gwdg/v1` konfiguriert (siehe `vite.config.js`)

### QA-Dataset

- Standardmäßig lädt die App kompakte Datensätze aus `public/quant/<datasetId>.items.json` und `public/quant/<datasetId>.meta.json`.
- Es gibt keinen Fallback auf `src/data/`; nur Quant-Assets werden unterstützt.
- Standard-Dataset: `qa_Klexikon-Prod-180825` (konfigurierbar im Interface).
- Auswahl des Datensatzes erfolgt im Interface (Einstellungen → Dataset-Auswahl).

**Ausgangsdaten (Quelle) – JSON Schema:**

```json
[
  {
    "question": "Was ist HTML?",
    "answer": "HTML steht für HyperText Markup Language...",
    "url": "https://example.com/primer",
    "category": "Web Development",
    "type": "definition",
    "difficulty": "beginner",
    "node_id": 12345,
    "level": "Sek I"
  }
]
```

Hinweise:
- Pflichtfelder: `question`, `answer`
- Optionale Felder: `url` (alias `wwwurl`), `category` (alias `subject`), `type`, `difficulty`, `node_id` (alias `id`), `level`

### WLO Integration

Die WLO-Integration nutzt die edu-sharing API von WirLernenOnline.de:
- Automatische Metadaten-Extraktion aus Nutzerfragen
- Mapping von Themen zu WLO-Fächern und Inhaltstypen
- Integration der gefundenen Materialien in KI-Antworten

## 🎯 Verwendung

### Chat-Interface
1. Stelle eine Frage im Chat-Eingabefeld
2. Der Bot prüft zuerst das QA-Dataset auf passende Antworten
3. Falls keine QA-Antwort gefunden wird, wird die WLO-Integration aktiviert
4. Passende Lernmaterialien werden in der rechten Seitenleiste angezeigt
5. Learning Analytics werden automatisch in der linken Seitenleiste aktualisiert

### Einstellungen
Klicke auf das Zahnrad in der Statusleiste, um:
- LLM Provider zu wechseln (OpenAI/GWDG)
- QA-Paare zu aktivieren/deaktivieren
- Dataset auszuwählen (wenn mehrere vorhanden sind)
- Ähnlichkeitsschwelle (Cosine-Score) festzulegen
- WLO-Integration zu konfigurieren (Debug/Quellenfilter)

Antwort-Labels im Chat:
- **[GEPRÜFTE ANTWORT AUF QA-BASIS]** bei QA-Treffern (mit Quelle/Link)
- **[UNSICHERE ANTWORT AUF KI-BASIS]** wenn kein QA-Treffer; ggf. ergänzende Erklärung nach QA-Teil

### Learning Analytics
Die linke Seitenleiste zeigt:
- Aktuelle Lernziele basierend auf Bloom'scher Taxonomie
- Fortschritt pro Themenbereich
- Zeiterfassung der aktuellen Session
- Lernerprofil-Informationen

## 🛠️ Development

### Build für Produktion
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Preview der Production Build
```bash
npm run preview
```

## 🔌 API Integrationen

### OpenAI API
- Endpoint: https://api.openai.com/v1
- Modell: gpt-4.1-mini
- Verwendung: Hauptsächliche KI-Antworten und Learning Analytics

### GWDG API
- Endpoint: https://chat-ai.academiccloud.de/v1
- Modell: gpt-oss-120b
- Verwendung: Alternative zu OpenAI API

### WirLernenOnline.de API
- Endpoint: https://www.wirlernenonline.de/api/v1
- Verwendung: Suche nach Lernmaterialien
- Proxy konfiguriert in `vite.config.js`

## 📝 Anpassungen

### Neue QA-Paare hinzufügen
So bringst du neue/aktualisierte QA-Daten in die App:

- Quelle: Bearbeite eine JSON-Datei mit QA-Paaren (z. B. `scripts/qa_*.json`).
- Preprocessing: Erzeuge kompakte Assets mit dem Python-Skript (siehe unten) und Ausgabe nach `public/quant/`.
- Ergebnis: Mindestens `<datasetId>.items.json` und `<datasetId>.meta.json` (plus Embedding-Binärdateien, falls konfiguriert).
- Nutzung: App neu laden; Dataset im Interface auswählen.

### WLO-Mappings erweitern
Bearbeite `src/lib/mappings.js` um neue Fächer oder Inhaltstypen hinzuzufügen.

### Learning Analytics anpassen
Modifiziere `src/lib/learningAnalytics.js` für neue Analyse-Kriterien.

## ⚡ Kompakte Embeddings (PCA + Int8)

Zur effizienten Auslieferung großer QA-Datensätze unterstützt die App kompakte Embeddings mit PCA-Reduktion und Int8-Quantisierung. Diese werden offline per Python-Skript erzeugt und zur Laufzeit automatisch genutzt.

### Datenablage
- **Eingabe (Q/A-Inhalte):** JSON-Datei mit QA-Paaren an einem beliebigen Ort (z. B. unter `scripts/`).
- **Ausgabe (kompakte Embeddings + Items):** Dateien unter `public/quant/`, Laufzeitpfad `/quant/*`.
- `datasetId` = Dateiname ohne `.json` und Präfix für alle Ausgabedateien.

### Vorbereitung per Python (empfohlen)
Voraussetzungen: `pip install --upgrade openai numpy`

PowerShell (Windows):
```powershell
$env:OPENAI_API_KEY = "<dein-openai-key>"
python scripts/precompute_openai_embeddings.py -i scripts/qa_Klexikon-Prod-180825.json --out-dir public/quant --pca-dim 256 --quantize -c 20
```

Hinweise:
- Der Befehl erzeugt folgende Dateien in `public/quant/`:
  - `qa_Klexikon-Prod-180825.embeddings.bin`
  - `qa_Klexikon-Prod-180825.pca_components.bin`
  - `qa_Klexikon-Prod-180825.pca_mean.bin`
  - `qa_Klexikon-Prod-180825.meta.json`
  - `qa_Klexikon-Prod-180825.items.json`
- Die App nutzt ausschließlich diese kompakten Assets zur Laufzeit.
- Die JSON mit QA-Paaren dient nur als Quelle für die Vorverarbeitung; sie wird nicht mehr direkt geladen.

Optional statt Kopie neben das Skript: Du kannst bei `-i` auch einen relativen Pfad zur JSON-Datei angeben (z. B. `scripts/…`), wenn du das bevorzugst.

### Laufzeitverhalten
- Die App lädt automatisch `/quant/<datasetId>.items.json` und `/quant/<datasetId>.meta.json` und sucht nur per Embeddings.
- Es gibt keinen Fallback auf JSON-Dateien im Quellcode.
- Empfohlene Einstellungen: PCA-Dimension `256`, Quantisierung `Int8`.

### Troubleshooting
- Nach dem Kopieren/Erzeugen der Binärdateien einmal hart neu laden (Browser-Cache), da Assets mit `cache: 'force-cache'` geladen werden.
- Achte auf identische `datasetId` zwischen deiner Quelle und den Dateien in `public/quant/<id>.*`.
- Bei Änderungen an Reihenfolge/Anzahl der Q/A-Items in der JSON die kompakten Assets neu erzeugen, damit das Index-Mapping korrekt bleibt.

## 🧩 Hinweise zur UI (aktuelle Wahlmöglichkeiten)

- Es gibt keine Auswahl mehr zwischen „String-Ähnlichkeit“ und „Embeddings“. Die App nutzt ausschließlich Embeddings.
- Der Button „Embeddings vorrechnen“ wurde entfernt; die App erwartet vorgefertigte Assets unter `public/quant/`.

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der Apache 2.0 Lizenz - siehe die [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- [WirLernenOnline.de](https://wirlernenonline.de) für die Lernmaterialien-API
- [OpenAI](https://openai.com) für die LLM-API
- [GWDG](https://gwdg.de) für die alternative LLM-API
- React, Vite und alle verwendeten Open Source Libraries
