import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // YENİ: Açılır menünün açık/kapalı durumu

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout isteği başarısız oldu:", error);
    }
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm("Emin misin? Tüm verilerin (ilgi alanların, podcastlerin) silinecek ve bu işlem geri alınamaz!");
    
    if (isConfirmed) {
      const token = localStorage.getItem('token');
      try {
        await fetch('http://localhost:8080/users/me', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        localStorage.removeItem('token');
        navigate('/auth');
      } catch (error) {
        console.error("Hesap silinirken hata:", error);
      }
    }
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#2a2a40', borderBottom: '1px solid #444' }}>
      <div>
        <Link to="/home" style={{ color: 'white', textDecoration: 'none', marginRight: '20px', fontSize: '1.1rem', fontWeight: 'bold' }}>📰 Haber Akışı</Link>
        <Link to="/podcasts" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}>🎧 Podcastlerim</Link>
      </div>

      {/* Sağ Kısım - Açılır Menü (Dropdown) Kutusu */}
      <div style={{ position: 'relative' }}>
        
        {/* Ana Menü Butonu */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ 
            background: isMenuOpen ? '#333' : 'transparent', 
            color: 'white', 
            border: '1px solid #555', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#333'}
          onMouseOut={(e) => e.currentTarget.style.background = isMenuOpen ? '#333' : 'transparent'}
        >
          <span>👤</span> Hesabım
        </button>

        {/* Dropdown İçeriği (Sadece isMenuOpen true ise görünür) */}
        {isMenuOpen && (
          <div style={{ 
            position: 'absolute', 
            top: '120%', 
            right: '0', 
            backgroundColor: '#2a2a40', 
            border: '1px solid #555', 
            borderRadius: '8px', 
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)', 
            display: 'flex', 
            flexDirection: 'column', 
            minWidth: '200px',
            overflow: 'hidden',
            zIndex: 1000 // Menünün diğer elemanların üstünde kalmasını sağlar
          }}>
            
            <button 
              onClick={() => {
                alert("İleride buraya ayarlar, şifre değiştirme veya profil düzenleme sayfası eklenebilir.");
                setIsMenuOpen(false); // Tıkladıktan sonra menüyü kapat
              }}
              style={{ background: 'transparent', color: 'white', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #444', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#3a3a5a'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ⚙️ Ayarlar
            </button>
            
            <button 
              onClick={handleDeleteAccount} 
              style={{ background: 'transparent', color: '#ff5252', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', borderBottom: '1px solid #444', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#3a3a5a'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              🗑️ Hesabımı Sil
            </button>

            <button 
              onClick={handleLogout} 
              style={{ background: 'transparent', color: '#ffb74d', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#3a3a5a'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              🚪 Çıkış Yap
            </button>

          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;