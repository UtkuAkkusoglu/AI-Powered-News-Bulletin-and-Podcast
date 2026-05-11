import { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import { fetchWithAuth } from '../Utils/api';

function Home() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [podcastStatus, setPodcastStatus] = useState('idle');
  const [podcastId, setPodcastId] = useState(null);
  const pollRef = useRef(null);
  const audioRef = useRef(null); 
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [userInterests, setUserInterests] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null); 

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
    if (podcastId && audioRef.current) {
      audioRef.current.load();
    }
  }, [podcastId]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          setUserInterests(data.interests || []);
        }
      } catch (_) {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    fetchNews(searchTerm, page, pageSize, activeCategoryId);
  }, [page, pageSize, activeCategoryId]);

  const fetchNews = async (query = '', p = page, size = pageSize, catId = activeCategoryId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, size });
      if (query) params.set('search', query);
      if (catId === 0) {} else if (catId) { params.set('category_id', catId); } else { params.set('interests_only', 'true'); }
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNewsList(data.items);
        setTotalCount(data.total_count);
      }
    } catch (error) {
      showToast("Haberler çekilirken bir sorun oluştu.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); fetchNews(searchTerm, 1, pageSize, activeCategoryId); };
  const handleCategoryChange = (catId) => { setActiveCategoryId(catId); setPage(1); };
  const handlePageSizeChange = (newSize) => { setPageSize(newSize); setPage(1); };

  // --- 🔥 YENİ: ASENKRON BLOKLAMAYI ÇÖZEN GERÇEK CANLI AKIŞ ---
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true); 
    setPage(1); 
    showToast("Gündem tazeleniyor, canlı akış başladı...", "success");

    // 1. ADIM: AWAIT'E TAKILMADAN POLLING'İ HEMEN BAŞLAT
    const poll = setInterval(async () => {
      try {
        const params = new URLSearchParams({ page: 1, size: pageSize });
        if (searchTerm) params.set('search', searchTerm);
        if (activeCategoryId === 0) {} 
        else if (activeCategoryId) params.set('category_id', activeCategoryId);
        else params.set('interests_only', 'true');
        
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/?${params}`);
        if (res.ok) {
          const data = await res.json();
          // EKRANA CANLI BASIYORUZ
          setNewsList(data.items);
          setTotalCount(data.total_count);
        }
      } catch (_) {}
    }, 4000); // 4 saniyede bir taze veriyi kontrol et

    // 2. ADIM: BACKEND KAZIMA İŞLEMİNİ BAŞLAT VE BİTMESİNİ BEKLE
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/refresh`, { method: 'POST' });
    } catch (error) {
      showToast("Yenileme işlemi sırasında hata oluştu.", "error");
    } finally {
      // 3. ADIM: BACKEND "BİTİRDİM" DEYİNCE HER ŞEYİ TEMİZLE VE KİLİDİ AÇ
      clearInterval(poll);
      setRefreshing(false);
      showToast("Gündem başarıyla güncellendi!", "success");
    }
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (newsId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/by-news/${newsId}`);
        if (res.ok) {
          const data = await res.json();
          setPodcastId(data.id);
          setPodcastStatus('ready');
          stopPolling();
          showToast("Podcast hazır!", "success");
        }
      } catch (_) {}
    }, 3000);
  };

  const handleNewsClick = async (newsId) => {
    setPodcastStatus('idle'); setPodcastId(null); stopPolling();
    try {
      const detailResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/${newsId}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setSelectedNews(detailData);
      }
    } catch (error) {}
    try {
      const podRes = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/by-news/${newsId}`);
      if (podRes.ok) {
        const podData = await podRes.json();
        setPodcastId(podData.id); setPodcastStatus('ready');
      }
    } catch (_) {}
    try {
      const clickResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/${newsId}/click`, { method: 'POST' });
      if (clickResponse.ok) {
        const clickData = await clickResponse.json();
        if (clickData.suggestion) setSuggestion(clickData.suggestion);
      }
    } catch (error) {}
  };

  const handleGeneratePodcast = async () => {
    if (!selectedNews || podcastStatus === 'processing') return;
    setPodcastStatus('processing');
    showToast("Podcast üretimi başladı...", "success");
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/generate/${selectedNews.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'exists') { setPodcastId(data.podcast_id); setPodcastStatus('ready'); } 
        else { startPolling(selectedNews.id); }
      } else { setPodcastStatus('idle'); }
    } catch (error) { setPodcastStatus('idle'); }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestion) return;
    try {
      const meResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/me`);
      if (meResponse.ok) {
        const userData = await meResponse.json();
        const currentInterestIds = userData.interests.map(item => item.id);
        if (!currentInterestIds.includes(suggestion.id)) {
          const updatedInterestIds = [...currentInterestIds, suggestion.id];
          const updateResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/interests`, {
            method: 'POST',
            body: JSON.stringify({ category_ids: updatedInterestIds })
          });
          if (updateResponse.ok) { showToast(`${suggestion.category_name} eklendi!`, "success"); }
        }
      }
    } catch (error) {} finally { setSuggestion(null); }
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
    bentoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px', padding: '0 3rem 4rem' },
    newsCard: {
      background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '28px',
      padding: '1.8rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', position: 'relative'
    },
    pageNum: (isActive) => ({
      padding: '8px 16px', borderRadius: '12px', border: 'none',
      backgroundColor: isActive ? '#6366f1' : 'rgba(30, 41, 59, 0.5)', color: 'white', cursor: 'pointer', fontWeight: isActive ? '700' : '400'
    })
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <div style={styles.toast}>
        <span style={{marginRight: '8px'}}>{toast.type === 'success' ? '✨' : '⚠️'}</span> {toast.message}
      </div>

      <div style={{ padding: '4rem 3rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', maxWidth: '1400px', margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: 0, letterSpacing: '-1px', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.1' }}>Günün Özeti</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '10px' }}>Pürüzsüz ve sana özel bir haber akışı.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text" placeholder="Gündemi tara..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ padding: '14px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.4)', color: 'white', outline: 'none', width: '320px', fontSize: '1rem', backdropFilter: 'blur(10px)' }}
          />
          <button 
            onClick={handleRefresh} 
            disabled={refreshing} 
            style={{ 
              padding: '14px 28px', borderRadius: '16px', border: 'none', 
              background: refreshing ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', 
              color: 'white', fontWeight: 'bold', 
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {refreshing ? '⏳ Gündem Tazeleniyor...' : '🔄 Yenile'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '0 3rem', marginBottom: '3rem' }}>
          {[{ id: null, name: '🎯 İlgi Alanlarım' }, { id: 0, name: '🌐 Tümü' }, ...userInterests].map(cat => (
            <button key={cat.id ?? 'interests'} onClick={() => handleCategoryChange(cat.id)} style={{ padding: '10px 22px', borderRadius: '25px', border: '1px solid', borderColor: activeCategoryId === cat.id ? '#818cf8' : 'rgba(255,255,255,0.1)', backgroundColor: activeCategoryId === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: activeCategoryId === cat.id ? '#fff' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s' }}>{cat.name}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '5rem', fontSize: '1.2rem' }}>Haberler derleniyor...</p>
        ) : (
          <>
            <div style={styles.bentoGrid}>
              {newsList.map((news, index) => (
                <div key={news.id} onClick={() => handleNewsClick(news.id)} style={{ ...styles.newsCard, gridColumn: index === 0 ? 'span 2' : 'span 1' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-12px)'; e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.4)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Manşet</span>
                  <h3 style={{ margin: '15px 0', fontSize: index === 0 ? '2rem' : '1.4rem', lineHeight: '1.3', fontWeight: '700' }}>{news.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6' }}>{news.summary || "Detaylar yolda..."}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3rem 3rem 10rem', borderTop: '1px solid rgba(255,255,255,0.05)', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ color: '#64748b' }}>{totalCount} haber — Sayfa {page}/{totalPages}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem', marginRight: '10px' }}>Sayfa Başı:</span>
                {[10, 25, 50].map(size => ( <button key={size} onClick={() => handlePageSizeChange(size)} style={styles.pageNum(pageSize === size)}>{size}</button> ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...styles.pageNum(false), opacity: page === 1 ? 0.3 : 1 }}>←</button>
                {(() => {
                  const pages = []; const delta = 2; const left = Math.max(2, page - delta); const right = Math.min(totalPages - 1, page + delta);
                  pages.push(<button key={1} onClick={() => setPage(1)} style={styles.pageNum(page === 1)}>1</button>);
                  if (left > 2) pages.push(<span key="l" style={{color: '#444'}}>...</span>);
                  for (let i = left; i <= right; i++) pages.push(<button key={i} onClick={() => setPage(i)} style={styles.pageNum(page === i)}>{i}</button>);
                  if (right < totalPages - 1) pages.push(<span key="r" style={{color: '#444'}}>...</span>);
                  if (totalPages > 1) pages.push(<button key={totalPages} onClick={() => setPage(totalPages)} style={styles.pageNum(page === totalPages)}>{totalPages}</button>);
                  return pages;
                })()}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...styles.pageNum(false), opacity: page === totalPages ? 0.3 : 1 }}>→</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedNews && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.1)', padding: '4rem', borderRadius: '40px', maxWidth: '900px', width: '90%', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: '0 60px 120px -20px rgba(0,0,0,0.5)' }}>
            <button onClick={() => { setSelectedNews(null); setPodcastId(null); stopPolling(); }} style={{ position: 'absolute', top: '35px', right: '35px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '2.2rem', cursor: 'pointer' }}>✖</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <span style={{ backgroundColor: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', padding: '6px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' }}>Haber Detayı</span>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{new Date(selectedNews.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <h2 style={{ fontSize: '2.6rem', fontWeight: '900', color: 'white', marginBottom: '30px', letterSpacing: '-1.5px', lineHeight: '1.2' }}>{selectedNews.title}</h2>
            <div style={{ lineHeight: '1.9', color: '#cbd5e1', fontSize: '1.25rem', whiteSpace: 'pre-wrap', fontWeight: '400' }}>{selectedNews.content}</div>

            <div style={{ marginTop: '4rem', background: 'rgba(30, 41, 59, 0.5)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {podcastStatus === 'idle' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Haberin Sesli Özeti</h4>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Yapay zeka ile bu haberi dinle.</p>
                  </div>
                  <button onClick={handleGeneratePodcast} style={{ padding: '16px 36px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>🎙 Podcast Oluştur</button>
                </div>
              )}
              {podcastStatus === 'processing' && <p style={{ color: '#818cf8', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>🎧 Haber seslendiriliyor...</p>}
              
              {podcastStatus === 'ready' && podcastId && (
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#10b981' }}>✅ Sesli Özet Hazır</h4>
                  <audio 
                    ref={audioRef}
                    key={podcastId} 
                    controls 
                    preload="auto"
                    src={`${import.meta.env.VITE_API_URL}/podcast/${podcastId}/audio?t=${Date.now()}`}
                    style={{ width: '100%', borderRadius: '16px', filter: 'invert(10%) hue-rotate(180deg)' }}
                  >
                    Tarayıcınız ses çalmayı desteklemiyor.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {suggestion && (
        <div style={{ position: 'fixed', bottom: '40px', right: '40px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid #10b981', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', maxWidth: '380px', zIndex: 1001 }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '1.2rem', fontWeight: '700' }}>İlgi Alanı Önerisi 🎯</h4>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '20px' }}>{suggestion.message}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAcceptSuggestion} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Ekle</button>
            <button onClick={() => setSuggestion(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #10b981', background: 'transparent', color: '#10b981', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;