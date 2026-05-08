import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchWithAuth } from '../Utils/api';

function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState(''); // Kullanıcı ismini tutmak için
  
  // --- MODAL STATE'LERİ ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- KULLANICI BİLGİSİNİ ÇEKME ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          // Eğer tam ad varsa onu, yoksa kullanıcı adını alıyoruz
          setUsername(data.full_name || data.username || 'Kullanıcı');
        }
      } catch (_) {}
    };
    fetchUserData();
  }, []);

  // --- HESAP SİLME MANTIĞI ---
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setIsMenuOpen(false);
  };

  const confirmDeleteAccount = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem('token');
      navigate('/auth');
    } catch (_) {
      setIsProcessing(false);
      setShowDeleteModal(false);
    }
  };

  // --- ÇIKIŞ YAPMA MANTIĞI ---
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setIsMenuOpen(false);
  };

  const confirmLogout = async () => {
    setIsProcessing(true);
    try { 
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, { method: 'POST' }); 
    } catch (_) {}
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const navStyles = {
    nav: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.2rem 3rem', backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky', top: 0, zIndex: 1000
    },
    link: {
      color: '#94a3b8', textDecoration: 'none', marginRight: '25px',
      fontSize: '1rem', fontWeight: '600', transition: 'all 0.3s'
    },
    userBadge: {
      display: 'flex', alignItems: 'center', gap: '15px'
    },
    nameText: {
      color: '#cbd5e1', fontSize: '0.9rem', fontWeight: '500', 
      background: 'rgba(255, 255, 255, 0.03)', padding: '6px 14px', 
      borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    accountBtn: {
      background: 'rgba(99, 102, 241, 0.1)', color: 'white',
      border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 24px',
      borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold',
      display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s', fontSize: '0.95rem'
    },
    dropdown: {
      position: 'absolute', top: '120%', right: '0',
      backgroundColor: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)', minWidth: '220px',
      overflow: 'hidden', zIndex: 1001, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px'
    },
    dropItem: (color) => ({
      background: 'transparent', color: color || '#f1f5f9',
      border: 'none', padding: '12px 16px', textAlign: 'left',
      cursor: 'pointer', borderRadius: '10px', transition: 'background 0.2s',
      fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px'
    }),
    modalOverlay: {
      position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 9999
    },
    modalBox: (borderColor) => ({
      background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${borderColor}`,
      padding: '3rem', borderRadius: '32px', maxWidth: '440px', textAlign: 'center',
      boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5)', position: 'relative'
    })
  };

  return (
    <>
      <nav style={navStyles.nav}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/home" style={{ ...navStyles.link, color: 'white', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>🌐 NewsFlow</Link>
          <Link to="/home" style={navStyles.link} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>Haber Akışı</Link>
          <Link to="/podcasts" style={navStyles.link} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>Podcastlerim</Link>
        </div>

        <div style={navStyles.userBadge}>
          {/* YENİ: KULLANICI İSMİ */}
          {username && (
            <span style={navStyles.nameText}>
              👋 Merhaba, <span style={{ color: '#818cf8', fontWeight: '700' }}>{username}</span>
            </span>
          )}

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={navStyles.accountBtn}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.borderColor = '#818cf8'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
            >
              <span style={{ fontSize: '1.2rem' }}>👤</span> Hesabım
            </button>

            {isMenuOpen && (
              <div style={navStyles.dropdown}>
                <button style={navStyles.dropItem()} onMouseOver={e => e.target.style.background='#334155'} onMouseOut={e => e.target.style.background='transparent'}>
                  ⚙️ Ayarlar
                </button>
                <button onClick={handleDeleteClick} style={navStyles.dropItem('#ef4444')} onMouseOver={e => e.target.style.background='rgba(239, 68, 68, 0.1)'} onMouseOut={e => e.target.style.background='transparent'}>
                  🗑️ Hesabı Sil
                </button>
                <button onClick={handleLogoutClick} style={navStyles.dropItem('#fbbf24')} onMouseOver={e => e.target.style.background='rgba(251, 191, 36, 0.1)'} onMouseOut={e => e.target.style.background='transparent'}>
                  🚪 Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- MODAL 1: HESAP SİLME --- */}
      {showDeleteModal && (
        <div style={navStyles.modalOverlay}>
          <div style={navStyles.modalBox('rgba(239, 68, 68, 0.3)')}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '800' }}>Veda Mı Ediyoruz?</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Hesabını sildiğinde tüm verilerin <strong>kalıcı olarak</strong> silinecek. Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={isProcessing} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Vazgeç</button>
              <button onClick={confirmDeleteAccount} disabled={isProcessing} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                {isProcessing ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ÇIKIŞ YAP --- */}
      {showLogoutModal && (
        <div style={navStyles.modalOverlay}>
          <div style={navStyles.modalBox('rgba(99, 102, 241, 0.3)')}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👋</div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '800' }}>Oturumu Kapat?</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Haber akışına kısa bir ara mı veriyorsun? En güncel gelişmelerle seni tekrar bekliyor olacağız.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowLogoutModal(false)} disabled={isProcessing} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>Vazgeç</button>
              <button onClick={confirmLogout} disabled={isProcessing} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                {isProcessing ? 'Kapatılıyor...' : 'Çıkış Yap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;