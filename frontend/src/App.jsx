import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';

// Geçici Ana Sayfa Bileşeni
function Home() {
  return <div style={{ color: 'white', padding: '2rem' }}>Ana Haber Akışı (Burayı sonra yapacağız)</div>;
}

// Geçici Kategori Seçim Bileşeni
function Onboarding() {
  return <div style={{ color: 'white', padding: '2rem' }}>Lütfen İlgi Alanlarınızı Seçin (En az 2 tane)</div>;
}

function App() {
  return (
    <div style={{ backgroundColor: '#1e1e2f', minHeight: '100vh' }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;