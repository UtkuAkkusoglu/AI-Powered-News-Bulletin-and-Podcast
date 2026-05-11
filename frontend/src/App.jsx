import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Home from './components/Home';
import Podcast from './components/Podcast';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Giriş ve Onboarding sayfalarında Sidebar/Navbar gösterilmez */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Diğer tüm sayfalar için Dashboard Düzeni */}
        <Route path="*" element={
          <div style={{ display: 'flex', backgroundColor: '#020617', minHeight: '100vh' }}>
            {/* SOL TARAF: SABİT SİDEBAR */}
            <Sidebar />
            
            {/* SAĞ TARAF: ESNEK İÇERİK ALANI */}
            <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              <main style={{ padding: '20px', flex: 1 }}>
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