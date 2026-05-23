import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../Utils/api';
import { useWindowSize } from '../Utils/useWindowSize';

function Podcast() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  // --- MODERN BİLDİRİM SİSTEMİ (TOAST) ---
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

  // --- YENİ: MODERN SİLME ONAY MODALI STATE'LERİ ---
  const [podcastToDelete, setPodcastToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    fetchPodcasts();
  }, [page, pageSize]);

  const fetchPodcasts = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/?page=${page}&size=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setPodcasts(data.items || []);
        setTotalCount(data.total_count || 0);
      }
    } catch (error) {
      showToast("Kütüphane yüklenirken hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setPodcastToDelete(id);
  };

  const confirmDeletePodcast = async () => {
    if (!podcastToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/${podcastToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPodcasts(prev => prev.filter(p => p.id !== podcastToDelete));
        setTotalCount(prev => prev - 1);
        showToast("Podcast kütüphaneden başarıyla kaldırıldı.", "success");
      } else {
        showToast("Silme işlemi başarısız oldu.", "error");
      }
    } catch (error) {
      showToast("Bağlantı hatası yaşandı.", "error");
    } finally {
      setIsDeleting(false);
      setPodcastToDelete(null); 
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const styles = {
    container: { backgroundColor: '#020617', color: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' },
    toast: {
      position: 'fixed', top: toast.show ? '30px' : '-100px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      color: toast.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
      backdropFilter: 'blur(12px)', padding: '12px 24px', borderRadius: '16px', fontWeight: '600',
      transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: toast.show ? 1 : 0, zIndex: 9999,
    },
    headerWrapper: { padding: isMobile ? '5rem 1rem 1.5rem' : '4rem 3rem 3rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' },
    card: {
      background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px',
      padding: '2rem', position: 'relative', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      display: 'flex', flexDirection: 'column', gap: '20px'
    },
    pageNum: (isActive) => ({
      padding: '8px 16px', borderRadius: '12px', border: 'none',
      backgroundColor: isActive ? '#6366f1' : 'rgba(30, 41, 59, 0.5)', color: 'white', cursor: 'pointer', fontWeight: isActive ? '700' : '400', transition: 'all 0.3s'
    }),
    modalOverlay: {
      position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 9999
    },
    modalBox: {
      background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(239, 68, 68, 0.3)',
      padding: '3rem', borderRadius: '32px', maxWidth: '440px', textAlign: 'center',
      boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5)', position: 'relative'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toast}>
        <span style={{marginRight: '8px'}}>{toast.type === 'success' ? '✨' : '⚠️'}</span> {toast.message}
      </div>

      <div style={styles.headerWrapper}>
        <button 
          onClick={() => navigate('/home')} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '25px', padding: '8px 16px', borderRadius: '12px', fontWeight: '600', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
        >
          ← Akışa Dön
        </button>

        <h1 style={{ 
          fontSize: '3rem', fontWeight: '800', margin: 0, letterSpacing: '-1px', 
          background: 'linear-gradient(to right, #ffffff, #cbd5e1)', 
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.2'
        }}>
          Podcast Kütüphanem
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '10px' }}>Yapay zeka ile üretilen kişisel ses dosyaların.</p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 1rem' : '0 3rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem', fontSize: '1.2rem' }}>Kasetler sarılıyor...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {podcasts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '1.2rem' }}>Henüz bir podcast üretilmemiş.</p>
              </div>
            ) : (
              podcasts.map((pod) => (
                <div 
                  key={pod.id} 
                  style={styles.card}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                >
                  {/* Silme Butonu */}
                  <button
                    onClick={() => handleDeleteClick(pod.id)}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px', zIndex: 10 }}
                  >
                    🗑️
                  </button>

                  {/* 🔥 ÜST KISIM: İkon ve Metinler (Yan Yana) */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                    <div style={{ 
                      width: '50px', height: '50px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', 
                      borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                    }}>
                      🎙️
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingRight: '40px' }}> {/* Çöp kutusu ile çakışmamak için padding eklendi */}
                      <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Kayıt Arşivi</span>
                      {/* 🔥 whiteSpace: nowrap kaldırıldı, başlık artık tam okunabiliyor */}
                      <h3 style={{ margin: '8px 0', fontSize: '1.4rem', color: 'white', lineHeight: '1.4' }}>{pod.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{new Date(pod.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  {/* 🔥 ALT KISIM: Yayılan Modern Audio Player */}
                  <div style={{ width: '100%', marginTop: '5px' }}>
                    <audio 
                      controls 
                      src={pod.audio_url} 
                      style={{ 
                        height: '40px', 
                        width: '100%', // Tüm genişliği kaplaması için %100 yapıldı
                        filter: 'invert(100%) brightness(1.5)',
                        borderRadius: '12px'
                      }} 
                    />
                  </div>

                </div>
              ))
            )}

            {/* --- SAYFALAMA ALANI --- */}
            {podcasts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'space-between', alignItems: 'center', gap: '1rem', padding: '3rem 0 10rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '2rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Toplam {totalCount} podcast — Sayfa {page}/{totalPages}</div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.9rem', marginRight: '10px' }}>Sayfa Başı:</span>
                  {[10, 25, 50].map(size => (
                    <button key={size} onClick={() => handlePageSizeChange(size)} style={styles.pageNum(pageSize === size)}>{size}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...styles.pageNum(false), opacity: page === 1 ? 0.3 : 1 }}>←</button>
                  {(() => {
                    const btns = []; const delta = 2; const left = Math.max(2, page - delta); const right = Math.min(totalPages - 1, page + delta);
                    btns.push(<button key={1} onClick={() => setPage(1)} style={styles.pageNum(page === 1)}>1</button>);
                    if (left > 2) btns.push(<span key="l" style={{color: '#444'}}>...</span>);
                    for (let i = left; i <= right; i++) btns.push(<button key={i} onClick={() => setPage(i)} style={styles.pageNum(page === i)}>{i}</button>);
                    if (right < totalPages - 1) btns.push(<span key="r" style={{color: '#444'}}>...</span>);
                    if (totalPages > 1) btns.push(<button key={totalPages} onClick={() => setPage(totalPages)} style={styles.pageNum(page === totalPages)}>{totalPages}</button>);
                    return btns;
                  })()}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...styles.pageNum(false), opacity: page === totalPages ? 0.3 : 1 }}>→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {podcastToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px', fontWeight: '800' }}>Kaseti Çöpe At?</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Bu kaydı kütüphaneden <strong>kalıcı olarak</strong> silmek üzeresin. Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setPodcastToDelete(null)} 
                disabled={isDeleting} 
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                Vazgeç
              </button>
              <button 
                onClick={confirmDeletePodcast} 
                disabled={isDeleting} 
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: isDeleting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}
                onMouseOver={e => { if(!isDeleting) e.currentTarget.style.background = '#dc2626' }}
                onMouseOut={e => { if(!isDeleting) e.currentTarget.style.background = '#ef4444' }}
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Çöpe At'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Podcast;