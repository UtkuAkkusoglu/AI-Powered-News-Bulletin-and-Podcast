import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { fetchWithAuth } from '../Utils/api';

function Settings() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Şifre State'leri
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Kullanıcı bilgilerini ve mevcut ilgi alanlarını çek
      const userRes = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsername(userData.username);
        setEmail(userData.email);
        setSelectedInterests(userData.interests.map(i => i.id));
      }

      // 2. Tüm kategorileri çek
      const catRes = await fetch(`${import.meta.env.VITE_API_URL}/categories/`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setAllCategories(catData);
      }
    } catch (_) {
      showToast("Veriler yüklenirken bir sorun oluştu.", "error");
    }
  };

  // Şifre Güncelleme
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast("Yeni şifreler eşleşmiyor!", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/change-password`, {
        method: 'PUT',
        body: JSON.stringify({
          old_password: passwordData.old_password,
          new_password: passwordData.new_password,
          new_password_confirm: passwordData.confirm_password
        })
      });
      if (res.ok) {
        showToast("Şifreniz güncellendi.", "success");
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        const err = await res.json();
        showToast(err.detail || "Hata oluştu.", "error");
      }
    } catch (_) { showToast("Bağlantı hatası.", "error"); }
    finally { setIsProcessing(false); }
  };

  // İlgi Alanlarını Güncelleme
  const handleUpdateInterests = async () => {
    if (selectedInterests.length < 2) {
      showToast("En az 2 kategori seçmelisin!", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/interests`, {
        method: 'POST',
        body: JSON.stringify({ category_ids: selectedInterests })
      });
      if (res.ok) showToast("İlgi alanların güncellendi!", "success");
      else showToast("Güncellenemedi.", "error");
    } catch (_) { showToast("Bağlantı hatası.", "error"); }
    finally { setIsProcessing(false); }
  };

  const toggleCategory = (id) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const styles = {
    container: { backgroundColor: '#020617', color: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
    section: { background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2.5rem', backdropFilter: 'blur(10px)' },
    input: { width: '100%', padding: '12px 16px', borderRadius: '12px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(2, 6, 23, 0.5)', color: 'white', outline: 'none' },
    chip: (isSelected) => ({ padding: '8px 16px', margin: '4px', borderRadius: '12px', cursor: 'pointer', border: '1px solid', borderColor: isSelected ? '#818cf8' : 'rgba(255,255,255,0.1)', backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: isSelected ? '#fff' : '#94a3b8', fontSize: '0.85rem', transition: 'all 0.2s' }),
    toast: { position: 'fixed', top: toast.show ? '30px' : '-100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: toast.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`, backdropFilter: 'blur(12px)', padding: '12px 24px', borderRadius: '16px', zIndex: 10000, transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: toast.show ? 1 : 0 }
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <div style={styles.toast}><span>{toast.type === 'success' ? '✨' : '⚠️'}</span> {toast.message}</div>
      
      <div style={styles.main}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', letterSpacing: '-1px' }}>Hesap Ayarları</h1>
        
        <div style={styles.grid}>
          {/* PROFİL BİLGİSİ */}
          <div style={{ ...styles.section, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>👤 Profil Bilgileri</h3>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Kullanıcı Adı</label><p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: '600' }}>{username}</p></div>
              <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>E-posta</label><p style={{ margin: '5px 0', fontSize: '1.1rem', fontWeight: '600' }}>{email}</p></div>
            </div>
          </div>

          {/* ŞİFRE DEĞİŞTİRME */}
          <div style={styles.section}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>🔐 Güvenlik</h3>
            <form onSubmit={handlePasswordChange}>
              <input type="password" placeholder="Mevcut Şifre" required style={styles.input} value={passwordData.old_password} onChange={e => setPasswordData({...passwordData, old_password: e.target.value})} />
              <input type="password" placeholder="Yeni Şifre" required style={styles.input} value={passwordData.new_password} onChange={e => setPasswordData({...passwordData, new_password: e.target.value})} />
              <input type="password" placeholder="Yeni Şifre (Tekrar)" required style={styles.input} value={passwordData.confirm_password} onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})} />
              <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Güncelle</button>
            </form>
          </div>

          {/* İLGİ ALANLARI */}
          <div style={styles.section}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>🎯 Haber Tercihleri</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {allCategories.map(cat => (
                <div key={cat.id} onClick={() => toggleCategory(cat.id)} style={styles.chip(selectedInterests.includes(cat.id))}>{cat.name}</div>
              ))}
            </div>
            <button onClick={handleUpdateInterests} disabled={isProcessing || selectedInterests.length < 2} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #818cf8', background: 'transparent', color: '#818cf8', fontWeight: 'bold', cursor: 'pointer' }}>Tercihleri Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;