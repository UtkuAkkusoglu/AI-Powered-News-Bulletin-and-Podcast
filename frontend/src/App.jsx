import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Home from './components/Home';
import Podcast from './components/Podcast'; // YENİ: Podcast sayfasını içeri aldık

function App() {
  return (
    <div style={{ backgroundColor: '#1e1e2f', minHeight: '100vh' }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          {/* YENİ: Haritaya Podcast rotasını ekledik */}
          <Route path="/podcasts" element={<Podcast />} /> 
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;