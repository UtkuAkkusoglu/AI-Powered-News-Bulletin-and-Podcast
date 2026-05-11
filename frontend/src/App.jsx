import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Podcast from './components/Podcast';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';

function App() {
  const sidebarWidth = '280px'; 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="*" element={
          <div style={{ 
            backgroundColor: '#020617', minHeight: '100vh', width: '100vw', 
            position: 'absolute', top: 0, left: 0, margin: 0, padding: 0, 
            display: 'flex', overflowX: 'hidden' 
          }}>
            <Sidebar /> 
            
            <div style={{ 
              marginLeft: sidebarWidth, 
              width: `calc(100vw - ${sidebarWidth})`, 
              display: 'flex', flexDirection: 'column', minHeight: '100vh' 
            }}>
              {/* NAVBAR BURADAN TAMAMEN SİLİNDİ */}
              <main style={{ flex: 1 }}>
                <Routes>
                  <Route path="/home" element={<Home />} />
                  <Route path="/podcasts" element={<Podcast />} />
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