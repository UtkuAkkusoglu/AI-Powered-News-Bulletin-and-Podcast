import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Podcast from './components/Podcast';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="*" element={
          <div style={{ display: 'flex', backgroundColor: '#020617', minHeight: '100vh', width: '100%' }}>
            {/* SABİT GENİŞLİKLİ SIDEBAR */}
            <Sidebar style={{ width: '260px' }} /> 
            
            {/* KALAN TÜM ALANI KAPLAYAN İÇERİK */}
            <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', width: 'calc(100% - 260px)' }}>
              <Navbar />
              <main style={{ flex: 1, padding: '20px' }}>
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