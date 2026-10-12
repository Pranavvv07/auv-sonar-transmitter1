import React from 'react';
import { User, Cpu } from 'lucide-react';

export default function Navbar({ activePage, onOpenProfile }) {
  const getSubsystemTitle = () => {
    switch (activePage) {
      case 'SonarInputConfig':
        return 'Page 1 // Input & Configuration';
      case 'AdaptiveSonar':
        return 'Page 2 // Adaptive Sonar Analysis';
      case 'PowerAnalysis':
        return 'Page 3 // Power & Battery Optimization';
      case 'Dashboard':
        return 'Page 4 // Performance Dashboard';
      case 'Profile':
        return 'AUV Mission Station & Fuel Gauge';
      default:
        return 'Low-Power Adaptive SDR Sonar';
    }
  };

  return (
    <header className="aquasense-navbar">
      <div className="nav-left">
        <div className="nav-brand-group">
          <div className="sonar-logo-icon" aria-hidden="true"></div>
          <div className="brand-text-col">
            <span className="brand-title">Adaptive SDR Sonar</span>
            <span className="brand-subtext">{getSubsystemTitle()}</span>
          </div>
        </div>
      </div>

      <div className="nav-right">
        <div className="status-pill-blue" title="Real-time Adaptive Feedback Active">
          <div className="status-pill-blue-dot"></div>
        </div>

        <span className="badge-tag-blue" style={{ fontSize: 9.5, padding: '3px 8px' }}>
          <Cpu size={12} style={{ marginRight: 4 }} />
          STM32H7 + Artix-7
        </span>

        <button 
          className={`nav-avatar-btn ${activePage === 'Profile' ? 'active-profile' : ''}`} 
          aria-label="User Profile"
          onClick={onOpenProfile}
          title="Operator Station & Battery Status"
          style={{ cursor: 'pointer' }}
        >
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
