import { getCurrentProvider } from '../services/openaiService.js';

// Learning Analytics Engine
export class LearningAnalytics {
  constructor() {
    this.learningProgress = {
      currentTopic: null,
      topics: [],
      successes: [],
      challenges: [],
      sessionStartTime: Date.now(),
      learnerProfile: {
        educationLevel: null,
        learningStyle: null,
        motivation: null,
        preferredPace: null
      }
    };
  }

  // Liefert den aktuellen IST-Stand für Prompts
  getCurrentState() {
    try {
      return {
        currentTopic: this.learningProgress.currentTopic,
        topics: (this.learningProgress.topics || []).map(t => ({
          id: t.id,
          name: t.name,
          progress: t.progress,
          timeSpent: t.timeSpent,
          targetTime: t.targetTime || null,
          subtopics: (t.subtopics || []).map(st => ({ id: st.id, name: st.name, progress: st.progress }))
        })),
        successes: [...(this.learningProgress.successes || [])],
        challenges: [...(this.learningProgress.challenges || [])]
      };
    } catch (_) {
      return { currentTopic: null, topics: [], successes: [], challenges: [] };
    }
  }

  // Vereinfacht Teilzielnamen: 1 Wort, GROSSBUCHSTABEN; ggf. um 2 Zeichen kürzen, Hauptlernziel nicht wiederholen
  sanitizeSubgoalName(mainTopic, name) {
    if (!name) return '';
    const MAX_LEN = 14;
    let cleaned = name.trim();
    if (mainTopic) {
      const re = new RegExp(mainTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      cleaned = cleaned.replace(re, '');
    }
    // Entferne führende Artikel/Stopwörter und führende Zeichen
    cleaned = cleaned
      .replace(/^\s*(die|der|das|den|dem|des|ein|eine|einer|einem|eines|the|a|an)\s+/i, '')
      .replace(/^[\-:\u2013\u2014\s]+/, '')
      .trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    let one = words[0] || cleaned || name.trim();
    one = one.toUpperCase();
    if (one.length > MAX_LEN) {
      one = one.slice(0, MAX_LEN); // auf 14 Zeichen kürzen
    }
    return one;
  }

  // Intelligente LLM-basierte Lerninhalt-Analyse (basierend auf Lernbegleiter)
  async analyzeConversation(messages, userMessage, assistantResponse) {
    console.log('🔍 Starte intelligente LLM-Analyse...');
    console.log('User:', userMessage);
    console.log('Bot:', assistantResponse.substring(0, 100) + '...');
    
    try {
      // Aktueller Ist-Stand für Kontext
      const currentState = {
        currentTopic: this.learningProgress.currentTopic,
        topics: this.learningProgress.topics.map(t => ({ 
          id: t.id, 
          name: t.name, 
          progress: t.progress,
          subtopics: t.subtopics.map(st => ({ id: st.id, name: st.name, progress: st.progress }))
        })),
        successes: this.learningProgress.successes,
        challenges: this.learningProgress.challenges
      };

      console.log('📊 Aktueller Ist-Stand:', currentState);

      // LLM-Analyse-Prompt mit Ist-Stand
      const analysisPrompt = `Du bist ein intelligenter Lernfortschritt-Analyzer. Analysiere die folgende Unterhaltung und aktualisiere den Lernstand.

AKTUELLER IST-STAND:
${JSON.stringify(currentState, null, 2)}

NEUE UNTERHALTUNG:
LERNENDER: "${userMessage}"
TUTOR: "${assistantResponse}"

Analysiere und antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "topicChange": {
    "newMainTopic": "Name des Hauptthemas oder null",
    "isMainTopicChange": true/false,
    "subtopics": [{"id": "id", "name": "Name", "progress": 1-5}]
  },
  "progressUpdate": {
    "currentTopicProgress": 1-5,
    "newSuccesses": ["Erfolg 1", "Erfolg 2"],
    "newChallenges": ["Herausforderung 1"]
  },
  "subtopicProgressUpdates": [
    {"id": "subtopic_id_oder_null", "name": "optional falls id unbekannt", "progress": 1-5}
  ],
  "interactionType": "remember|understand|apply|analyze|evaluate|create",
  "learnerProfile": {
    "educationLevel": "Grundschule/Sekundarstufe I/Sekundarstufe II/Hochschule oder null",
    "learningStyle": "visuell/auditiv/kinästhetisch/lese-schreibend oder null",
    "motivation": "niedrig/mittel/hoch oder null"
  },
  "timeTracking": {
    "targetTime": null oder Zahl in Minuten,
    "extractedFromMessage": "Zitat aus der Nachricht falls Zeitangabe gefunden"
  }
}

WICHTIGE REGELN:
1. Bei Hauptthemenwechsel: isMainTopicChange = true
2. Nur wirklich wichtige Themenänderungen als Hauptthemenwechsel
3. Erfolge: Übungsabschlüsse, Verständnisfortschritte, korrekte Antworten
4. Herausforderungen: Schwierigkeiten, Verständnisprobleme
5. Fortschritt (1-5) konservativ anheben: maximal +1 Stufe pro Turn gegenüber IST-Stand.
6. Wenn interactionType="remember" (bloßes Faktenlernen/Erinnern), max currentTopicProgress = 2 (Grundlagen). Bei "understand" max 3. Höhere Stufen nur bei expliziter Anwendung/Analyse/Bewertung/Kreation mit Belegen.
7. subtopicProgressUpdates bei relevanten Teilzielen mitliefern (id bevorzugt, sonst name).
8. Lernerprofil nur aktualisieren wenn eindeutige Hinweise vorhanden
9. ZEITERFASSUNG: Extrahiere Zeitangaben wie "10 Minuten", "eine halbe Stunde", "2 Stunden" aus Lernender-Nachrichten`;

      const result = await this.callLLM(analysisPrompt);
      if (result) {
        this.processLernbegleiterAnalysis(result);
      }

      return this.learningProgress;
    } catch (error) {
      console.error('❌ Fehler bei der intelligenten LLM-Analyse:', error);
      return this.learningProgress;
    }
  }

  async analyzeLearningGoals(messages, userMessage, assistantResponse) {
    const provider = getCurrentProvider();
    if (!provider) return null;

    const currentState = this.getCurrentState();

    const prompt = `Analysiere diese Lernunterhaltung und identifiziere die Lernziele:

AKTUELLER IST-STAND (nutze dies, um Doppelungen zu vermeiden und anzuknüpfen):
${JSON.stringify(currentState, null, 2)}

Benutzer-Frage: "${userMessage}"
Tutor-Antwort: "${assistantResponse}"

Extrahiere:
1. Hauptthema/Lernziel
2. Spezifische Teilziele
3. Lernzielniveau nach Bloom's Taxonomie (1-6: Erinnern, Verstehen, Anwenden, Analysieren, Bewerten, Erschaffen)

REGELN FÜR TEILZIELE:
- Verwende NUR 1 WORT in GROSSBUCHSTABEN (z. B. GRUNDLAGEN, URSACHEN)
- Wiederhole NICHT das Hauptlernziel im Teilziel
- MAXIMAL 14 ZEICHEN; wenn länger, auf 14 Zeichen am Ende abschneiden
- Liefere nur neue/ergänzende Teilziele gegenüber dem IST-Stand

JSON Format:
{
  "mainTopic": "Hauptthema",
  "subtopics": ["Teilziel1", "Teilziel2"],
  "bloomLevel": 2,
  "topicChanged": true/false
}`;

    return await this.callLLM(prompt, provider);
  }

  async analyzeProgress(messages, userMessage, assistantResponse) {
    const provider = getCurrentProvider();
    if (!provider) return null;

    const currentState = this.getCurrentState();

    const prompt = `Bewerte den Lernfortschritt basierend auf dieser Unterhaltung:

AKTUELLER IST-STAND (vermeide Dopplungen bei Erfolgen/Herausforderungen, liefere nur Neues):
${JSON.stringify(currentState, null, 2)}

Benutzer-Frage: "${userMessage}"
Tutor-Antwort: "${assistantResponse}"

Bewerte (1-5 Skala):
1. Verständnisgrad der Antwort
2. Qualität der gestellten Frage
3. Fortschritt im aktuellen Thema
4. Neue Erfolge oder Meilensteine (nur wenn nicht bereits im IST-Stand enthalten)
5. Identifizierte Herausforderungen (nur wenn nicht bereits im IST-Stand enthalten)

JSON Format:
{
  "understanding": 3,
  "questionQuality": 4,
  "topicProgress": 2,
  "successes": ["Erfolg 1"],
  "challenges": ["Herausforderung 1"]
}`;

    return await this.callLLM(prompt, provider);
  }

  async analyzeLearnerProfile(messages, userMessage, assistantResponse) {
    const provider = getCurrentProvider();
    if (!provider) return null;

    const currentState = this.getCurrentState();

    const prompt = `Analysiere das Lernerprofil basierend auf der Unterhaltung:

AKTUELLER IST-STAND (nur aktualisieren/ergänzen, keine widersprüchlichen Doppelungen):
${JSON.stringify(currentState, null, 2)}

Benutzer-Frage: "${userMessage}"
Tutor-Antwort: "${assistantResponse}"

Schätze ein:
1. Bildungsniveau (Grundschule, Sekundarstufe I, Sekundarstufe II, Hochschule)
2. Lernstil (visuell, auditiv, kinästhetisch, lese-schreibend)
3. Motivation (niedrig, mittel, hoch)
4. Bevorzugtes Lerntempo (langsam, normal, schnell)

JSON Format:
{
  "educationLevel": "Sekundarstufe I",
  "learningStyle": "visuell",
  "motivation": "hoch",
  "preferredPace": "normal"
}`;

    return await this.callLLM(prompt, provider);
  }

  async analyzeTopicStructure(messages, userMessage, assistantResponse) {
    const provider = getCurrentProvider();
    if (!provider) return null;

    const currentState = this.getCurrentState();

    const prompt = `Analysiere die Themenstruktur und zeitliche Entwicklung:

AKTUELLER IST-STAND (ergänze, vermeide Duplikate):
${JSON.stringify(currentState, null, 2)}

Benutzer-Frage: "${userMessage}"
Tutor-Antwort: "${assistantResponse}"

Identifiziere:
1. Hauptthemen und deren Hierarchie
2. Zeitaufwand pro Thema (geschätzt in Minuten)
3. Verbindungen zwischen Themen

REGELN FÜR TEILTHEMEN: genau 1 Wort in GROSSBUCHSTABEN; maximal 14 Zeichen; bei Überlänge auf 14 Zeichen kürzen; Hauptthema nicht wiederholen

JSON Format:
{
  "topics": [
    {
      "name": "Thema 1",
      "subtopics": ["Unterthema 1", "Unterthema 2"],
      "estimatedTime": 15,
      "connections": ["Thema 2"]
    }
  ]
}`;

    return await this.callLLM(prompt, provider);
  }

  async callLLM(prompt) {
    try {
      const provider = getCurrentProvider();
      if (!provider) {
        throw new Error('No LLM provider available');
      }

      const apiKey = import.meta.env[provider.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`API key not found for ${provider.name}`);
      }

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Experte für Lernanalyse. Antworte immer im angegebenen JSON-Format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      console.log('🤖 LLM Response:', content);
      
      if (content) {
        // Try to parse JSON, handle potential formatting issues
        try {
          return JSON.parse(content);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Raw content:', content);
          return null;
        }
      }
    } catch (error) {
      console.error('❌ LLM call failed:', error);
      return null;
    }
  }

  // Verarbeitung der Lernbegleiter-Analyse (basierend auf der Original-Implementierung)
  processLernbegleiterAnalysis(analysisResult) {
    console.log('📈 LLM-Analyse-Ergebnis:', analysisResult);

    // Themenwechsel verarbeiten
    if (analysisResult.topicChange?.newMainTopic) {
      const topicId = analysisResult.topicChange.newMainTopic.toLowerCase().replace(/\s+/g, '-');
      let existingTopic = this.learningProgress.topics.find(t => t.id === topicId);
      
      if (!existingTopic) {
        existingTopic = {
          id: topicId,
          name: analysisResult.topicChange.newMainTopic,
          progress: 1,
          timeSpent: 0,
          startTime: Date.now(),
          targetTime: null,
          subtopics: []
        };
        // initiale Subthemen übernehmen (bereinigt/zusammenführen)
        if (Array.isArray(analysisResult.topicChange.subtopics)) {
          analysisResult.topicChange.subtopics.forEach(st => {
            // Unterstütze sowohl String- als auch Objektformat
            let rawName = null;
            let progressVal = 1;
            let idVal = null;
            if (typeof st === 'string') {
              rawName = st;
            } else if (st && typeof st.name === 'string') {
              rawName = st.name;
              if (typeof st.progress === 'number') progressVal = Math.max(1, Math.min(5, st.progress));
              if (st.id) idVal = st.id;
            }

            const name = rawName ? this.sanitizeSubgoalName(analysisResult.topicChange.newMainTopic, rawName) : null;
            if (!name) { console.debug('⏭️ Überspringe ungültiges Teilziel (kein Name):', st); return; }
            if (!existingTopic.subtopics.find(s => s.name.toLowerCase() === name.toLowerCase())) {
              existingTopic.subtopics.push({
                id: idVal || `subtopic_${Date.now()}_${Math.random()}`,
                name,
                progress: progressVal
              });
            }
          });
        }
        this.learningProgress.topics.push(existingTopic);
        console.log('➕ Neues Hauptthema:', analysisResult.topicChange.newMainTopic);
      }
      
      // Bei Hauptthemenwechsel: aktuelles Thema aktualisieren
      if (analysisResult.topicChange.isMainTopicChange && this.learningProgress.currentTopic !== topicId) {
        console.log('🔄 Hauptthemenwechsel erkannt');
      }
      
      this.learningProgress.currentTopic = topicId;
      existingTopic.startTime = Date.now();

      // Subthemen ggf. auch bei bestehendem Thema zusammenführen
      if (Array.isArray(analysisResult.topicChange.subtopics) && analysisResult.topicChange.subtopics.length > 0) {
        analysisResult.topicChange.subtopics.forEach(st => {
          // Unterstütze sowohl String- als auch Objektformat
          let rawName = null;
          let idVal = null;
          let progressVal = null;
          if (typeof st === 'string') {
            rawName = st;
          } else if (st && typeof st.name === 'string') {
            rawName = st.name;
            idVal = st.id || null;
            if (typeof st.progress === 'number') progressVal = Math.max(1, Math.min(5, st.progress));
          }

          const name = rawName ? this.sanitizeSubgoalName(existingTopic.name, rawName) : null;
          if (!name) { console.debug('⏭️ Überspringe ungültiges Teilziel (kein Name):', st); return; }

          let sub = null;
          if (idVal) {
            sub = existingTopic.subtopics.find(s => s.id === idVal);
          }
          if (!sub) {
            sub = existingTopic.subtopics.find(s => s.name.toLowerCase() === name.toLowerCase());
          }

          if (!sub) {
            existingTopic.subtopics.push({
              id: idVal || `subtopic_${Date.now()}_${Math.random()}`,
              name,
              progress: progressVal ?? 1
            });
          } else if (typeof progressVal === 'number') {
            // konservatives Update: max +1
            const prev = Math.max(1, Math.min(5, sub.progress || 1));
            const proposed = Math.max(1, Math.min(5, progressVal));
            sub.progress = Math.min(prev + 1, proposed);
          }
        });
      }
    }

    // Fortschritt aktualisieren
    if (analysisResult.progressUpdate) {
      const currentTopic = this.learningProgress.topics.find(t => t.id === this.learningProgress.currentTopic);
      if (currentTopic && analysisResult.progressUpdate.currentTopicProgress) {
        const prev = Math.max(1, Math.min(5, currentTopic.progress || 1));
        let proposed = Math.max(1, Math.min(5, analysisResult.progressUpdate.currentTopicProgress));
        // Interaktions-Typ beachten (kappende Logik)
        const t = ((analysisResult.interactionType || 'remember')).toLowerCase();
        if (t === 'remember') proposed = Math.min(proposed, 2);
        if (t === 'understand') proposed = Math.min(proposed, 3);
        // Maximal +1 pro Turn
        currentTopic.progress = Math.min(prev + 1, proposed);
        console.log('📈 Fortschritt aktualisiert (konservativ):', { prev, proposed, final: currentTopic.progress, interactionType: t });
      }

      // Neue Erfolge hinzufügen
      if (analysisResult.progressUpdate.newSuccesses) {
        analysisResult.progressUpdate.newSuccesses.forEach((success) => {
          if (!this.learningProgress.successes.includes(success)) {
            this.learningProgress.successes.push(success);
            console.log('🏆 Neuer Erfolg:', success);
          }
        });
      }

      // Neue Herausforderungen hinzufügen
      if (analysisResult.progressUpdate.newChallenges) {
        analysisResult.progressUpdate.newChallenges.forEach((challenge) => {
          if (!this.learningProgress.challenges.includes(challenge)) {
            this.learningProgress.challenges.push(challenge);
            console.log('⚠️ Neue Herausforderung:', challenge);
          }
        });
      }

      // Teilziel-Fortschritt aktualisieren (falls vorhanden)
      if (currentTopic && Array.isArray(analysisResult.subtopicProgressUpdates)) {
        analysisResult.subtopicProgressUpdates.forEach(upd => {
          if (!upd) return;
          let sub = null;
          if (upd.id) {
            sub = currentTopic.subtopics.find(s => s.id === upd.id);
          }
          if (!sub && typeof upd.name === 'string') {
            const name = this.sanitizeSubgoalName(currentTopic.name, upd.name);
            sub = currentTopic.subtopics.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (!sub) {
              // Neues Teilziel anlegen, wenn nicht vorhanden
              sub = { id: `subtopic_${Date.now()}_${Math.random()}`, name, progress: 1 };
              currentTopic.subtopics.push(sub);
            }
          }
          if (sub && typeof upd.progress === 'number') {
            const prev = Math.max(1, Math.min(5, sub.progress || 1));
            let proposed = Math.max(1, Math.min(5, upd.progress));
            const t = ((analysisResult.interactionType || 'remember')).toLowerCase();
            if (t === 'remember') proposed = Math.min(proposed, 2);
            if (t === 'understand') proposed = Math.min(proposed, 3);
            sub.progress = Math.min(prev + 1, proposed);
          }
        });
      }
    }

    // Lernerprofil aktualisieren
    if (analysisResult.learnerProfile) {
      Object.keys(analysisResult.learnerProfile).forEach(key => {
        if (analysisResult.learnerProfile[key] !== null) {
          this.learningProgress.learnerProfile[key] = analysisResult.learnerProfile[key];
        }
      });
    }

    // Zeiterfassung aktualisieren
    if (analysisResult.timeTracking?.targetTime) {
      const currentTopic = this.learningProgress.topics.find(t => t.id === this.learningProgress.currentTopic);
      if (currentTopic) {
        currentTopic.targetTime = analysisResult.timeTracking.targetTime;
        console.log('⏱️ Zielzeit gesetzt:', analysisResult.timeTracking.targetTime, 'Min.', 
                   analysisResult.timeTracking.extractedFromMessage ? `(${analysisResult.timeTracking.extractedFromMessage})` : '');
      }
    }

    console.log('✅ Intelligente Analyse abgeschlossen:', {
      topics: this.learningProgress.topics.length,
      successes: this.learningProgress.successes.length,
      challenges: this.learningProgress.challenges.length,
      currentTopic: this.learningProgress.currentTopic
    });
  }

  updateLearningGoals(result) {
    if (result.mainTopic) {
      // Finde oder erstelle Hauptthema
      let topic = this.learningProgress.topics.find(t => t.name === result.mainTopic);
      if (!topic) {
        topic = {
          id: `topic_${Date.now()}`,
          name: result.mainTopic,
          progress: 1,
          timeSpent: 0,
          subtopics: [],
          startTime: Date.now()
        };
        this.learningProgress.topics.push(topic);
      }

      // Aktualisiere aktuelles Thema
      if (result.topicChanged) {
        this.learningProgress.currentTopic = topic.id;
        topic.startTime = Date.now();
      }

      // Füge Unterthemen hinzu (bereinigt: 1–2 Wörter, kein Hauptlernziel)
      if (result.subtopics) {
        result.subtopics.forEach(rawName => {
          const cleanName = this.sanitizeSubgoalName(result.mainTopic, rawName);
          if (!cleanName) return;
          if (!topic.subtopics.find(st => st.name.toLowerCase() === cleanName.toLowerCase())) {
            topic.subtopics.push({
              id: `subtopic_${Date.now()}_${Math.random()}`,
              name: cleanName,
              progress: 1
            });
          }
        });
      }
    }
  }

  updateProgress(result) {
    if (result.successes) {
      result.successes.forEach(s => {
        if (!this.learningProgress.successes.includes(s)) {
          this.learningProgress.successes.push(s);
        }
      });
    }
    if (result.challenges) {
      result.challenges.forEach(c => {
        if (!this.learningProgress.challenges.includes(c)) {
          this.learningProgress.challenges.push(c);
        }
      });
    }

    // Aktualisiere Fortschritt des aktuellen Themas
    if (this.learningProgress.currentTopic && result.topicProgress) {
      const topic = this.learningProgress.topics.find(t => t.id === this.learningProgress.currentTopic);
      if (topic) {
        topic.progress = Math.min(5, Math.max(1, result.topicProgress));
      }
    }
  }

  updateLearnerProfile(result) {
    Object.assign(this.learningProgress.learnerProfile, result);
  }

  updateTopicStructure(result) {
    if (result.topics) {
      result.topics.forEach(topicData => {
        let topic = this.learningProgress.topics.find(t => t.name === topicData.name);
        if (!topic) {
          topic = {
            id: `topic_${Date.now()}_${Math.random()}`,
            name: topicData.name,
            progress: 1,
            timeSpent: 0,
            subtopics: []
          };
          this.learningProgress.topics.push(topic);
        }

        // Aktualisiere geschätzte Zeit
        if (topicData.estimatedTime) {
          topic.estimatedTime = topicData.estimatedTime;
        }
      });
    }
  }

  // Aktualisiere Zeittracking
  updateTimeTracking() {
    if (this.learningProgress.currentTopic) {
      const topic = this.learningProgress.topics.find(t => t.id === this.learningProgress.currentTopic);
      if (topic && topic.startTime) {
        const additionalTime = Math.floor((Date.now() - topic.startTime) / 60000);
        topic.timeSpent += additionalTime;
        topic.startTime = Date.now(); // Reset für nächste Messung
      }
    }
  }

  getLearningProgress() {
    this.updateTimeTracking();
    return { ...this.learningProgress };
  }
}

// Singleton Instance
export const learningAnalytics = new LearningAnalytics();
