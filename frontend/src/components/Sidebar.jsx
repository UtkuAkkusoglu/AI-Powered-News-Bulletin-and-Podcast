import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../Utils/api';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Kullanıcı adını çek
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          setUsername(data.full_name || data.username || 'Kullanıcı');
        }
      } catch (_) {}
    };
    fetchUser();
  }, []);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  // Ayarlar menüden çıkarıldı, sadece ana akışlar kaldı
  const menuItems = [
    { name: 'Haber Akışı', path: '/home', icon: '🏠' },
    { name: 'Podcastlerim', path: '/podcasts', icon: '🎙️' }
  ];

  const styles = {
    sidebar: {
      width: '280px', height: '100vh', position: 'fixed', left: 0, top: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRight: '1px solid rgba(255,255,255,0.05)',
      padding: '2rem 1.5rem', backdropFilter: 'blur(20px)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    },
    // EN ÜSTTEKİ MERHABA KUTUSU
    greetingBox: {
      background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px', borderRadius: '16px',
      marginBottom: '2rem', border: '1px solid rgba(255, 255, 255, 0.05)', 
      color: '#cbd5e1', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px'
    },
    logo: {
      fontSize: '1.6rem', fontWeight: '900', color: 'white', textDecoration: 'none',
      marginBottom: '3rem', display: 'block', paddingLeft: '0.5rem'
    },
    navItem: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px',
      borderRadius: '16px', color: isActive ? 'white' : '#94a3b8',
      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
      textDecoration: 'none', fontWeight: '700', marginBottom: '10px',
      transition: 'all 0.3s ease', border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
    }),
    // HESABIM BUTONU VE AÇILIR MENÜSÜ
    accountBtn: {
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)',
      color: 'white', border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer',
      fontWeight: 'bold', transition: 'all 0.3s ease'
    },
    dropdown: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px',
      marginBottom: '10px'
    },
    modalOverlay: {
      position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 9999
    }
  };

  return (
    <aside style={styles.sidebar}>
      {/* 1. EN ÜSTTE MERHABA MESAJI */}
      <div style={styles.greetingBox}>
        <span style={{ fontSize: '1.2rem' }}>👋</span>
        <span>Merhaba, <span style={{ color: '#818cf8', fontWeight: '800' }}>{username}</span></span>
      </div>

      {/* 2. LOGO */}
      <Link to="/home" style={styles.logo}>🌐 NewsFlow</Link>
      
      {/* 3. ANA LİNKLER */}
      <nav style={{ flex: 1 }}>
        {menuItems.map(item => (
          <Link key={item.path} to={item.path} style={styles.navItem(location.pathname === item.path)}>
            <span style={{ fontSize: '1.3rem' }}>{item.icon}</span> {item.name}
          </Link>
        ))}
      </nav>

      {/* 4. EN ALTTA HESABIM MENÜSÜ */}
      <div style={{ position: 'relative' }}>
        {isMenuOpen && (
          <div style={styles.dropdown}>
            <button onClick={() => { navigate('/settings'); setIsMenuOpen(false); }} style={{ background: 'transparent', color: 'white', border: 'none', padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', borderRadius: '10px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
              ⚙️ Ayarlar
            </button>
            <button onClick={() => { setShowLogoutModal(true); setIsMenuOpen(false); }} style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', borderRadius: '10px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
              🚪 Çıkış Yap
            </button>
          </div>
        )}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.accountBtn}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span> Hesabım
          </div>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{isMenuOpen ? '▼' : '▲'}</span>
        </button>
      </div>

      {/* ÇIKIŞ MODALI */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
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
    </aside>
  );
}

export default Sidebar;