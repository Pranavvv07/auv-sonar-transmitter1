import React, { useState } from 'react';
import { SonarProvider } from './SonarContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

import SonarInputConfig from './pages/SonarInputConfig';
import AdaptiveSonar from './pages/AdaptiveSonar';
import PowerAnalysis from './pages/PowerAnalysis';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';

import './App.css';

export default function App() {
 const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('SonarInputConfig');

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={() => {
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'SonarInputConfig':
        return (
          <SonarInputConfig 
            onNavigateToAnalysis={() => setActivePage('AdaptiveSonar')} 
          />
        );
      case 'AdaptiveSonar':
        return (
          <AdaptiveSonar 
            onNavigateToInputs={() => setActivePage('SonarInputConfig')}
            onNavigateToPower={() => setActivePage('PowerAnalysis')}
          />
        );
      case 'PowerAnalysis':
        return (
          <PowerAnalysis 
            onNavigateToAnalysis={() => setActivePage('AdaptiveSonar')}
            onNavigateToDashboard={() => setActivePage('Dashboard')}
          />
        );
      case 'Dashboard':
        return (
          <Dashboard 
            onNavigateToInputs={() => setActivePage('SonarInputConfig')}
            onNavigateToAnalysis={() => setActivePage('AdaptiveSonar')}
            onNavigateToPower={() => setActivePage('PowerAnalysis')}
          />
        );
      case 'Profile':
        return <Profile onLogout={() => setIsAuthenticated(false)} />;
      default:
        return (
          <SonarInputConfig 
            onNavigateToAnalysis={() => setActivePage('AdaptiveSonar')} 
          />
        );
    }
  };

  return (
    <SonarProvider>
      <div className="aquasense-app">
        <Navbar
          activePage={activePage}
          onOpenProfile={() => setActivePage('Profile')}
        />

        {renderCurrentPage()}

        <BottomNav
          activePage={activePage}
          onSelectPage={setActivePage}
        />
      </div>
    </SonarProvider>
  );
}
