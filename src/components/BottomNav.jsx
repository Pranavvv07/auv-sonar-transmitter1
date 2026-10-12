import React from 'react';
import { Sliders, Activity, BatteryCharging, LayoutDashboard, User } from 'lucide-react';

export default function BottomNav({ activePage, onSelectPage }) {
  const navTabs = [
    { id: 'SonarInputConfig', label: 'Page 1: Inputs', icon: Sliders },
    { id: 'AdaptiveSonar', label: 'Page 2: Adaptive Analysis', icon: Activity },
    { id: 'PowerAnalysis', label: 'Page 3: Power & Battery', icon: BatteryCharging },
    { id: 'Dashboard', label: 'Page 4: Dashboard', icon: LayoutDashboard },
    { id: 'Profile', label: 'AUV Mission', icon: User },
  ];

  return (
    <div className="aquasense-dock-container">
      <div className="auv-status-ticker">
        <span>● AUV SDR PAYLOAD: REAL-TIME ADAPTIVE (100–500 kHz)</span>
        <span>CLASS D &gt;82% | 48V 10Ah</span>
      </div>

      <nav className="dock-tabs-grid" aria-label="Main Dock Navigation" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id;
          return (
            <button
              key={tab.id}
              className={`dock-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPage(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
              <span className="dock-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
