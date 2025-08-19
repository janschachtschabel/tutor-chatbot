// QA Dataset embedded in client
export const qaDataset = [
  {
    question: "Was ist JavaScript?",
    answer: "JavaScript ist eine hochentwickelte, interpretierte Programmiersprache, die hauptsächlich für die Webentwicklung verwendet wird. Sie ermöglicht interaktive Webseiten und wird sowohl im Frontend als auch im Backend eingesetzt. JavaScript unterstützt ereignisgesteuerte, funktionale und objektorientierte Programmierparadigmen.",
    url: "https://developer.mozilla.org/de/docs/Web/JavaScript",
    category: "Programmierung"
  },
  {
    question: "Wie funktioniert React?",
    answer: "React ist eine JavaScript-Bibliothek für den Aufbau von Benutzeroberflächen. Es verwendet ein komponentenbasiertes Architekturmodell und ein virtuelles DOM für effiziente Updates. React ermöglicht die Erstellung wiederverwendbarer UI-Komponenten und verwaltet den Zustand der Anwendung durch Props und State.",
    url: "https://react.dev/learn",
    category: "Frontend"
  },
  {
    question: "Was ist Node.js?",
    answer: "Node.js ist eine JavaScript-Laufzeitumgebung, die auf der V8-Engine von Chrome basiert. Sie ermöglicht es, JavaScript auf dem Server zu verwenden und skalierbare Netzwerkanwendungen zu erstellen. Node.js ist ereignisgesteuert und nicht-blockierend, was es ideal für I/O-intensive Anwendungen macht.",
    url: "https://nodejs.org/de/docs/",
    category: "Backend"
  },
  {
    question: "Was sind APIs?",
    answer: "APIs (Application Programming Interfaces) sind Schnittstellen, die es verschiedenen Softwareanwendungen ermöglichen, miteinander zu kommunizieren. Sie definieren, wie Anfragen gestellt, welche Datenformate verwendet und welche Antworten erwartet werden können. APIs sind essentiell für die moderne Softwareentwicklung.",
    url: "https://developer.mozilla.org/de/docs/Web/API",
    category: "Programmierung"
  },
  {
    question: "Was ist HTML?",
    answer: "HTML (HyperText Markup Language) ist die Standard-Auszeichnungssprache für die Erstellung von Webseiten. HTML beschreibt die Struktur einer Webseite semantisch und besteht aus einer Reihe von Elementen, die den Browser anweisen, wie der Inhalt angezeigt werden soll.",
    url: "https://developer.mozilla.org/de/docs/Web/HTML",
    category: "Frontend"
  },
  {
    question: "Was ist CSS?",
    answer: "CSS (Cascading Style Sheets) ist eine Stylesheet-Sprache, die verwendet wird, um das Aussehen und die Formatierung von HTML-Dokumenten zu beschreiben. CSS ermöglicht die Trennung von Inhalt und Präsentation und bietet umfangreiche Möglichkeiten für Layout, Farben, Schriftarten und Animationen.",
    url: "https://developer.mozilla.org/de/docs/Web/CSS",
    category: "Frontend"
  },
  {
    question: "Was ist eine Datenbank?",
    answer: "Eine Datenbank ist ein organisiertes System zur Speicherung, Verwaltung und Abfrage von Daten. Datenbanken können relational (SQL) oder nicht-relational (NoSQL) sein und bieten Mechanismen für Datenkonsistenz, Sicherheit und gleichzeitigen Zugriff durch mehrere Benutzer.",
    url: "https://de.wikipedia.org/wiki/Datenbank",
    category: "Backend"
  },
  {
    question: "Was ist Git?",
    answer: "Git ist ein verteiltes Versionskontrollsystem, das zur Verfolgung von Änderungen in Dateien verwendet wird. Es ermöglicht Entwicklern, an Projekten zu kollaborieren, verschiedene Versionen zu verwalten und Änderungen nachzuvollziehen. Git ist essentiell für die moderne Softwareentwicklung.",
    url: "https://git-scm.com/doc",
    category: "Entwicklungstools"
  },
  {
    question: "Was ist responsive Design?",
    answer: "Responsive Design ist ein Ansatz zur Webentwicklung, bei dem Webseiten so gestaltet werden, dass sie auf verschiedenen Geräten und Bildschirmgrößen optimal dargestellt werden. Dies wird durch flexible Layouts, Bilder und CSS-Media-Queries erreicht.",
    url: "https://developer.mozilla.org/de/docs/Learn/CSS/CSS_layout/Responsive_Design",
    category: "Frontend"
  },
  {
    question: "Was ist ein Framework?",
    answer: "Ein Framework ist eine Sammlung von vorgefertigten Code-Bibliotheken, Tools und Konventionen, die Entwicklern dabei helfen, Anwendungen effizienter zu erstellen. Frameworks bieten eine strukturierte Grundlage und bewährte Praktiken für die Softwareentwicklung.",
    url: "https://de.wikipedia.org/wiki/Framework",
    category: "Programmierung"
  }
];

// System prompt for the tutor
export const SYSTEM_PROMPT = `Du bist ein hilfsreicher KI-Tutor, der Lernenden beim Verstehen verschiedener Themen hilft. Antworte in Markdown.

WICHTIGE REGELN:
1. Wenn du auf Basis der QA-Datenbank antwortest, beginne die Antwort mit **[GEPRÜFTE ANTWORT AUF QA-BASIS]**.
2. Wenn du auf Basis deines KI-Wissens antwortest, beginne die Antwort mit **[UNSICHERE ANTWORT AUF KI-BASIS]**.
3. Wenn die QA-Information die Nutzerfrage nicht vollständig beantwortet, füge nach einem Absatz eine zweite Ergänzung hinzu, die mit **[UNSICHERE ANTWORT AUF KI-BASIS]** beginnt und vorsichtiges, kenntlich gemachtes Weltwissen enthält.
4. Sei präzise, sachlich und pädagogisch wertvoll.
5. Erkläre komplexe Konzepte in verständlicher Sprache.
6. Ermutige zum weiteren Lernen.
7. Verweise, wenn verfügbar, auf relevante Lernressourcen und binde Links natürlich ein.

Dein Ziel ist es, Lernenden zu helfen, Wissen zu verstehen und zu vertiefen.`;
