import React from 'react';
import { Brain, Clock, TrendingUp, User, BookOpen, Target, Trophy, AlertCircle } from 'lucide-react';
import BloomGoalTracker from './BloomGoalTracker';

const LearningAnalyticsSidebar = ({ learningProgress, onTopicSelect, bloomGoalData }) => {
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getCurrentTopicTime = () => {
    const currentTopic = learningProgress.topics.find(t => t.id === learningProgress.currentTopic);
    if (!currentTopic?.startTime) return 0;
    return Math.floor((Date.now() - currentTopic.startTime) / 60000);
  };

  const formatTopicTime = (topic) => {
    const currentTime = topic.id === learningProgress.currentTopic ? getCurrentTopicTime() : topic.timeSpent;
    
    // Check if user has set a target time (this would need to be tracked in learning analytics)
    const targetTime = topic.targetTime; // This field needs to be added to topic structure
    
    if (targetTime) {
      return `${currentTime} Min. / ${targetTime} Min.`;
    } else {
      return `${currentTime} Min.`;
    }
  };

  const ProgressBar = ({ progress, size = 'normal' }) => {
    const barCount = 5;
    const filledBars = Math.max(0, Math.min(barCount, progress));
    
    return (
      <div className={`flex gap-1 ${size === 'small' ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            className={`
              ${size === 'small' ? 'w-2 h-2' : 'w-3 h-3'} 
              rounded-sm transition-colors
              ${i < filledBars 
                ? 'bg-green-500' 
                : 'bg-gray-200'
              }
            `}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ 
      width: '320px', 
      backgroundColor: '#f9fafb', 
      borderRight: '1px solid #e5e7eb', 
      borderRadius: '20px',
      padding: '16px', 
      overflowY: 'auto', 
      height: '100%' 
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} style={{ color: '#2563eb' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Lernfortschritt
          </h2>
        </div>

        {/* Bloom's Taxonomy Goal Tracker */}
        <BloomGoalTracker goalData={bloomGoalData} />

        {/* Lernerprofil */}
        {learningProgress.learnerProfile && (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '12px', 
            border: '1px solid #e5e7eb' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <User size={16} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Lernerprofil
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
              {learningProgress.learnerProfile.educationLevel && (
                <div>Bildungsstufe: {learningProgress.learnerProfile.educationLevel}</div>
              )}
              {learningProgress.learnerProfile.learningStyle && (
                <div>Lernstil: {learningProgress.learnerProfile.learningStyle}</div>
              )}
              {learningProgress.learnerProfile.motivation && (
                <div>Motivation: {learningProgress.learnerProfile.motivation}</div>
              )}
            </div>
          </div>
        )}


        {/* Legacy Lernziele & Fortschritt section removed as BloomGoalTracker covers this */}
        <div style={{ display: 'none' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            Lernziele & Fortschritt
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {learningProgress.topics.map((topic) => (
              <div
                key={topic.id}
                style={{
                  backgroundColor: learningProgress.currentTopic === topic.id 
                    ? '#eff6ff' 
                    : 'white',
                  borderRadius: '8px',
                  padding: '12px',
                  border: learningProgress.currentTopic === topic.id 
                    ? '1px solid #93c5fd' 
                    : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => onTopicSelect?.(topic.id)}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: '8px' 
                }}>
                  <h4 style={{ 
                    fontWeight: '500', 
                    color: '#111827', 
                    fontSize: '14px',
                    margin: 0
                  }}>
                    {topic.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ProgressBar progress={topic.progress} size="small" />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatTopicTime(topic)}
                    </span>
                  </div>
                </div>
                
                {/* Teilthemen */}
                {topic.subtopics && topic.subtopics.length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    paddingLeft: '8px', 
                    borderLeft: '2px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {topic.subtopics.map((subtopic) => (
                      <div key={subtopic.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                      }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {subtopic.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ProgressBar progress={subtopic.progress} size="small" />
                          {subtopic.selfAssessment && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#9ca3af' }}>Self:</span>
                              <ProgressBar progress={subtopic.selfAssessment} size="small" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Erfolge */}
        {learningProgress.successes && learningProgress.successes.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Trophy size={16} style={{ color: '#16a34a' }} />
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                margin: 0
              }}>
                Letzte 5 Erfolge
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {learningProgress.successes.slice(-5).reverse().map((success, index) => (
                <div key={index} style={{ 
                  backgroundColor: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '8px', 
                  padding: '8px' 
                }}>
                  <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
                    {success}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Herausforderungen */}
        {learningProgress.challenges && learningProgress.challenges.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={16} style={{ color: '#ea580c' }} />
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                margin: 0
              }}>
                Herausforderungen
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {learningProgress.challenges.slice(-3).map((challenge, index) => (
                <div key={index} style={{ 
                  backgroundColor: '#fff7ed', 
                  border: '1px solid #fed7aa', 
                  borderRadius: '8px', 
                  padding: '8px' 
                }}>
                  <p style={{ fontSize: '12px', color: '#9a3412', margin: 0 }}>
                    {challenge}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LearningAnalyticsSidebar;
