import React, { useState } from 'react';
import ClientView from './pages/ClientView';
import AdminView from './pages/AdminView';

export default function App() {
  const [mode, setMode] = useState('client'); // 'client' | 'admin'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unapprovedCount, setUnapprovedCount] = useState(0);

  return (
    <div className={'app-shell ' + (mode === 'client' ? 'booking-app' : 'admin-app')}>
      {mode === 'client' ? (
        <ClientView onAdminClick={() => {
          setActiveTab('dashboard');
          setMode('admin');
        }} />
      ) : (
        <AdminView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setUnapprovedCount={setUnapprovedCount}
          onExit={() => setMode('client')}
        />
      )}
    </div>
  );
}
