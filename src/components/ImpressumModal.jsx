import React, { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';

const ImpressumModal = ({ isOpen, onClose }) => {
  const [showContact, setShowContact] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Create mailto link with form data
      const subject = encodeURIComponent(`[QA-Chatbot] ${formData.subject}`);
      const body = encodeURIComponent(
        `Name: ${formData.name}\n` +
        `E-Mail: ${formData.email}\n\n` +
        `Nachricht:\n${formData.message}\n\n` +
        `---\n` +
        `Gesendet über QA-Chatbot Kontaktformular`
      );
      
      const mailtoLink = `mailto:info@schachtschabel.net?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem' }}>
            {showContact ? 'Kontakt' : 'Impressum'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: '#6b7280'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {!showContact ? (
            // Impressum Content
            <div>
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem', fontWeight: '500' }}>
                  🔬 <strong>Forschungsprototyp</strong> - Diese Anwendung dient ausschließlich zu Forschungszwecken und befindet sich in der Entwicklung.
                </p>
              </div>

              <h3 style={{ color: '#1f2937', marginBottom: '16px' }}>Angaben gemäß § 5 TMG</h3>
              
              <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#374151' }}>
                  Verantwortlich für den Inhalt:
                </p>
                <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>Jan Schachtschabel</p>
                <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>Steubenstr. 34</p>
                <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>99423 Weimar</p>
                <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>Deutschland</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#374151' }}>
                  Kontakt:
                </p>
                <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>
                  E-Mail: <a href="mailto:info@schachtschabel.net" style={{ color: '#667eea' }}>info@schachtschabel.net</a>
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#1f2937', marginBottom: '12px' }}>Haftungsausschluss</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '12px' }}>
                  <strong>Haftung für Inhalte:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '12px' }}>
                  <strong>Haftung für Links:</strong> Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#1f2937', marginBottom: '12px' }}>Datenschutz</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Diese Anwendung verarbeitet Ihre Eingaben zur Bereitstellung der Chatbot-Funktionalität. Es werden keine personenbezogenen Daten dauerhaft gespeichert. Die Kommunikation erfolgt über externe API-Dienste (OpenAI, GWDG), deren Datenschutzbestimmungen gelten.
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                marginTop: '24px'
              }}>
                <button
                  onClick={() => setShowContact(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  <Mail size={16} />
                  Kontakt aufnehmen
                </button>
              </div>
            </div>
          ) : (
            // Contact Form
            <div>
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => setShowContact(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    marginBottom: '16px'
                  }}
                >
                  ← Zurück zum Impressum
                </button>
                
                <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Haben Sie Fragen oder Anregungen zu diesem Forschungsprototyp? Kontaktieren Sie uns gerne.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                    Betreff *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                    Nachricht *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {submitStatus === 'success' && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px',
                    color: '#166534',
                    fontSize: '0.9rem'
                  }}>
                    Ihr E-Mail-Programm sollte sich geöffnet haben. Bitte senden Sie die E-Mail ab.
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px',
                    color: '#dc2626',
                    fontSize: '0.9rem'
                  }}>
                    Fehler beim Öffnen des E-Mail-Programms. Bitte senden Sie eine E-Mail direkt an info@schachtschabel.net
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: isSubmitting ? '#9ca3af' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Wird geöffnet...' : 'E-Mail senden'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpressumModal;
