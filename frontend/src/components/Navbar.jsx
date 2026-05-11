import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../Utils/api';

function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          setUsername(data.full_name || data.username || 'Kullanıcı');
        }
      } catch (_) {}
    };
    fetchUserData();
  }, []);

  const confirmLogout = async () => {
    setIsProcessing(true);
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const navStyles = {
    nav: {
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      padding: '1rem 3rem', backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky', top: 0, zIndex: 900
    },
    userBadge: { display: 'flex', alignItems: 'center', gap: '15px' },
    nameText: {
      color: '#cbd5e1', fontSize: '0.9rem', fontWeight: '500', 
      background: 'rgba(255, 255, 255, 0.03)', padding: '6px 14px', 
      borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    accountBtn: {
      background: 'rgba(99, 102, 241, 0.1)', color: 'white',
      border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 24px',
      borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold'
    },
    dropdown: {
      position: 'absolute', top: '120%', right: '0',
      backgroundColor: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
      minWidth: '200px', padding: '10px', zIndex: 1001, display: 'flex', flexDirection: 'column'
    },
    modalOverlay: {
      position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 9999
    }
  };

  return (
    <>
      <nav style={navStyles.nav}>
        <div style={navStyles.userBadge}>
          {username && (
            <span style={navStyles.nameText}>
              👋 Merhaba, <span style={{ color: '#818cf8', fontWeight: '700' }}>{username}</span>
            </span>
          )}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={navStyles.accountBtn}>
              👤 Hesabım
            </button>

            {isMenuOpen && (
              <div style={navStyles.dropdown}>
                <button onClick={() => { navigate('/settings'); setIsMenuOpen(false); }} style={{ background: 'transparent', color: 'white', border: 'none', padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600' }}>⚙️ Ayarlar</button>
                <button onClick={() => { setShowLogoutModal(true); setIsMenuOpen(false); }} style={{ background: 'transparent', color: '#fbbf24', border: 'none', padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600' }}>🚪 Çıkış Yap</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showLogoutModal && (
        <div style={navStyles.modalOverlay}>
          <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '3rem', borderRadius: '32px', textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>👋</div>
            <h2 style={{ color: 'white', marginBottom: '10px' }}>Oturumu Kapat?</h2>
            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Vazgeç</button>
              <button onClick={confirmLogout} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Çıkış Yap</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;