import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import IndividualSidebar from '../components/layout/IndividualSidebar';
import IndividualHeader from '../components/layout/IndividualHeader';

export default function IndividualLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#e8edf5' }}>
      <IndividualSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <IndividualHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
