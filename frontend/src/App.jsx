import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useWindowSize } from './Utils/useWindowSize';
import Home from './components/Home';
import Podcast from './components/Podcast';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Bookmarks from './components/Bookmarks';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isMobile } = useWindowSize();
  const sidebarWidth = isSidebarCollapsed ? '72px' : '280px';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="*" element={
          <div style={{ 
            backgroundColor: '#020617', minHeight: '100vh', width: '100%', 
            position: 'relative', top: 0, left: 0, margin: 0, padding: 0, 
            display: 'flex', overflowX: 'hidden'
          }}>
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(p => !p)} />
            
            <div style={{ 
              marginLeft: isMobile ? 0 : sidebarWidth,
              transition: 'margin-left 0.3s ease',
              flex: 1,
              display: 'flex', flexDirection: 'column', minHeight: '100vh' ,
              minWidth: 0 // Flexbox taşmalarını engellemek için kritik
            }}>
              {/* NAVBAR BURADAN TAMAMEN SİLİNDİ */}
              <main style={{ flex: 1 }}>
                <Routes>
                  <Route path="/home" element={<Home />} />
                  <Route path="/podcasts" element={<Podcast />} />
                  <Route path="/bookmarks" element={<Bookmarks />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Navigate to="/home" />} />
                </Routes>
              </main>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;