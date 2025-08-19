import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const BloomGoalTracker = ({ goalData }) => {
  // Helper: convert minutes to "xh ymin" string
  const formatTime = (minutes) => {
    if (!minutes || minutes <= 0) return '0min';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Mapping Bloom levels to German labels
  const BLOOM_DE = {
    Remember: 'Erinnern',
    Understand: 'Verstehen',
    Apply: 'Anwenden',
    Analyze: 'Analysieren',
    Evaluate: 'Evaluieren',
    Create: 'Kreieren'
  };

  // Always render the container to prevent UI crashes
  const containerStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #e5e7eb'
  };

  const headerStyle = {
    
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  };

  if (!goalData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <Target size={16} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Lernziele
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          Starten Sie eine Lernunterhaltung, um Ziele zu tracken.
        </p>
      </div>
    );
  }

  // Add error boundary for data validation
  try {
    if (!goalData.title || !goalData.levels || !Array.isArray(goalData.levels)) {
      return (
        <div style={containerStyle}>
          <div style={headerStyle}>
            <Target size={16} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Lernziele
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Daten werden aktualisiert...
          </p>
        </div>
      );
    }
  } catch (error) {
    console.error('BloomGoalTracker data validation error:', error);
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <Target size={16} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Lernziele
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          Tracker wird geladen...
        </p>
      </div>
    );
  }

  const formatMasterySegments = (levels) => {
    if (!levels || !Array.isArray(levels)) {
      return <span style={{ fontSize: '12px', color: '#6b7280' }}>Keine Daten</span>;
    }
    
    return levels.map((level, index) => {
      // Safe access to level properties
      const mastery = typeof level.mastery === 'number' ? level.mastery : 0;
      const stable = Boolean(level.stable);
      const label = level.label || `Level ${index + 1}`;
      
      let segment = '□';
      if (mastery >= 0.66) segment = '▮';
      else if (mastery >= 0.33) segment = '◐';
      
      return (
        <span 
          key={index}
          style={{ 
            fontFamily: 'monospace',
            fontSize: '14px',
            color: stable ? '#10b981' : '#6b7280',
            marginRight: '2px'
          }}
          title={`${label}: ${Math.round(mastery * 100)}%${stable ? ' ✓' : ''}`}
        >
          {segment}
        </span>
      );
    });
  };

  const getTrendIcon = (trend) => {
    if (trend >= 0.03) return <TrendingUp size={12} style={{ color: '#10b981' }} />;
    if (trend <= -0.03) return <TrendingDown size={12} style={{ color: '#ef4444' }} />;
    return <Minus size={12} style={{ color: '#6b7280' }} />;
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Target size={16} style={{ color: '#3b82f6' }} />
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
          Lernziele
        </span>
      </div>

      {/* Main Goal */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', textTransform: 'uppercase' }}>
            {goalData.title}
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            Ziel: {BLOOM_DE[goalData.target_level] || goalData.target_level}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {formatMasterySegments(goalData.levels)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getTrendIcon(goalData.trend_week)}
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              {goalData.trend_week >= 0 ? '+' : ''}{Math.round(goalData.trend_week * 100)}%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            ({formatPercentage(goalData.mastery_overall)})
          </span>
          {goalData.timeSpent !== undefined && (
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              • {formatTime(goalData.timeSpent)}
            </span>
          )}
        </div>
      </div>

      {/* Subgoals */}
      {goalData.subgoals && goalData.subgoals.length > 0 && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
          {goalData.subgoals.map((subgoal, index) => (
            <div key={subgoal.subgoal_id} style={{ 
              marginBottom: index < goalData.subgoals.length - 1 ? '8px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#374151',
                  flex: '0 0 120px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontWeight: '500',
                  textTransform: 'uppercase'
                }}>
                  {subgoal.title}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {formatMasterySegments(subgoal.levels)}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getTrendIcon(subgoal.trend_week)}
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>
                    {subgoal.trend_week >= 0 ? '+' : ''}{Math.round(subgoal.trend_week * 100)}%
                  </span>
                </div>
                
                <span style={{ fontSize: '10px', color: '#6b7280' }}>
                  ({formatPercentage(subgoal.mastery_overall || 0)})
                </span>
                
                              </div>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
};

export default BloomGoalTracker;
