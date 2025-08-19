import React from 'react';
import { BookOpen, ExternalLink, RefreshCw, Video, FileText, Image, Headphones } from 'lucide-react';

const WLOSidebar = ({ suggestions = [], isLoading = false, onRefresh, className = '' }) => {
  const getResourceIcon = (resourceType) => {
    const type = resourceType?.toLowerCase() || '';
    if (type.includes('video')) return <Video className="w-4 h-4" />;
    if (type.includes('audio')) return <Headphones className="w-4 h-4" />;
    if (type.includes('bild') || type.includes('image')) return <Image className="w-4 h-4" />;
    if (type.includes('arbeitsblatt') || type.includes('worksheet')) return <FileText className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  if (!suggestions.length && !isLoading) {
    return (
      <div className={`wlo-sidebar ${className}`}>
        <div className="wlo-sidebar-empty">
          <BookOpen className="wlo-empty-icon" />
          <p className="wlo-empty-text">
            Stellen Sie eine Lernfrage, um passende WLO-Materialien zu erhalten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`wlo-sidebar ${className}`}>
      <div className="wlo-sidebar-header">
        <div className="wlo-header-content">
          <h2 className="wlo-header-title">
            <BookOpen className="wlo-header-icon" />
            WLO-Empfehlungen
          </h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="wlo-refresh-button"
              title="Empfehlungen aktualisieren"
            >
              <RefreshCw className={`wlo-refresh-icon ${isLoading ? 'wlo-refresh-spinning' : ''}`} />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <p className="wlo-count-text">
            {suggestions.length} Materialien gefunden
          </p>
        )}
      </div>

      <div className="wlo-sidebar-content">
        {isLoading ? (
          <div className="wlo-loading">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="wlo-loading-item">
                <div className="wlo-loading-title"></div>
                <div className="wlo-loading-description"></div>
                <div className="wlo-loading-tags">
                  <div className="wlo-loading-tag"></div>
                  <div className="wlo-loading-tag"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wlo-suggestions-list">
            {suggestions.map((suggestion, index) => {
              const url = suggestion.wwwUrl || 
                          (suggestion.refId ? `https://redaktion.openeduhub.net/edu-sharing/components/render/${suggestion.refId}` : '#');
              
              return (
                <div key={`${suggestion.refId}-${index}`} className="wlo-suggestion-card">
                  <div className="wlo-card-content">
                    <div className="wlo-card-icon">
                      {getResourceIcon(suggestion.resourceType)}
                    </div>
                    <div className="wlo-card-details">
                      <h4 className="wlo-card-title">
                        {url !== '#' ? (
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="wlo-card-link"
                          >
                            {suggestion.title}
                            <ExternalLink className="wlo-external-icon" />
                          </a>
                        ) : (
                          suggestion.title
                        )}
                      </h4>
                      
                      {suggestion.description && (
                        <p className="wlo-card-description">
                          {suggestion.description.length > 120 
                            ? suggestion.description.substring(0, 120) + '...' 
                            : suggestion.description}
                        </p>
                      )}
                      
                      <div className="wlo-card-tags">
                        {suggestion.subject && (
                          <span className="wlo-tag wlo-tag-subject">
                            {suggestion.subject}
                          </span>
                        )}
                        {suggestion.resourceType && (
                          <span className="wlo-tag wlo-tag-type">
                            {suggestion.resourceType}
                          </span>
                        )}
                        {suggestion.educationalContext && suggestion.educationalContext.length > 0 && (
                          <span className="wlo-tag wlo-tag-education">
                            {suggestion.educationalContext[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="wlo-sidebar-footer">
          <a
            href="https://wirlernenonline.de"
            target="_blank"
            rel="noopener noreferrer"
            className="wlo-powered-by"
          >
            Powered by WirLernenOnline.de
            <ExternalLink className="wlo-powered-icon" />
          </a>
        </div>
      )}
    </div>
  );
};

export default WLOSidebar;
