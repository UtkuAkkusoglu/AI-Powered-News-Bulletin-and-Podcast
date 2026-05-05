import { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import { fetchWithAuth } from '../Utils/api';

function Home() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [podcastStatus, setPodcastStatus] = useState('idle'); // 'idle' | 'processing' | 'ready'
  const [podcastId, setPodcastId] = useState(null);
  const pollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (query = '') => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/news/`;
      if (query) url += `?search=${query}`; 

      // Token eklemeye gerek yok, api.js hallediyor!
      const response = await fetchWithAuth(url);
      if (response.ok) {
        const data = await response.json();
        setNewsList(data.items);
      }
    } catch (error) {
      console.error("Haberler çekilirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const prevCount = newsList.length;
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/refresh`, { method: 'POST' });
      // Haber sayısı artana kadar her 4 saniyede bir kontrol et (max 2 dk)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/`);
          if (res.ok) {
            const data = await res.json();
            if (data.total_count > prevCount || attempts >= 30) {
              clearInterval(poll);
              setNewsList(data.items);
              setRefreshing(false);
            }
          }
        } catch (_) {}
      }, 4000);
    } catch (error) {
      console.error("Yenileme hatası:", error);
      setRefreshing(false);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
        }
      } catch (_) {}
    }, 3000);
  };

  const handleNewsClick = async (newsId) => {
    setPodcastStatus('idle');
    setPodcastId(null);
    stopPolling();

    try {
      const detailResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/${newsId}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setSelectedNews(detailData);
      }
    } catch (error) {
      console.error("Detay çekilemedi:", error);
    }

    // Daha önce podcast oluşturulmuş mu?
    try {
      const podRes = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/by-news/${newsId}`);
      if (podRes.ok) {
        const podData = await podRes.json();
        setPodcastId(podData.id);
        setPodcastStatus('ready');
      }
    } catch (_) {}

    try {
      const clickResponse = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/news/${newsId}/click`, {
        method: 'POST'
      });
      
      if (clickResponse.ok) {
        const clickData = await clickResponse.json();
        if (clickData.suggestion) {
          setSuggestion(clickData.suggestion);
        }
      }
    } catch (error) {
      console.error("Tıklama takip hatası:", error);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!selectedNews || podcastStatus === 'processing') return;
    setPodcastStatus('processing');
    try {
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_URL}/podcast/generate/${selectedNews.id}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'exists') {
          setPodcastId(data.podcast_id);
          setPodcastStatus('ready');
        } else {
          startPolling(selectedNews.id);
        }
      } else {
        setPodcastStatus('idle');
      }
    } catch (error) {
      console.error("Podcast oluşturma hatası:", error);
      setPodcastStatus('idle');
    }
  };

  const handleCloseModal = () => {
    setSelectedNews(null);
    setPodcastStatus('idle');
    setPodcastId(null);
    stopPolling();
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

          if (updateResponse.ok) {
            alert(`Harika! ${suggestion.category_name} artık ilgi alanlarında. 🎉`);
          } else {
            console.error("İlgi alanı güncellenirken backend hata döndü.");
          }
        }
      }
    } catch (error) {
      console.error("Öneri kaydedilirken hata oluştu:", error);
    } finally {
      setSuggestion(null); 
    }
  };

  return (
    <div style={{ backgroundColor: '#1e1e2f', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #444', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Ana Haber Akışı</h2>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              type="text"
              placeholder="Haberlerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNews(searchTerm)}
              style={{ padding: '8px 12px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: 'white', outline: 'none' }}
            />
            <button
              onClick={() => fetchNews(searchTerm)}
              style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', backgroundColor: '#646cff', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Ara
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', backgroundColor: refreshing ? '#555' : '#2a9d8f', color: 'white', cursor: refreshing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {refreshing ? '⏳ Yükleniyor...' : '🔄 Yenile'}
            </button>
          </div>
        </div>

        {loading ? (
          <p>Haberler yükleniyor...</p>
        ) : newsList.length === 0 ? (
          <p style={{ color: '#aaa', padding: '1rem 0', fontSize: '1.1rem' }}>
            Aramana uygun haber bulunamadı veya henüz sisteme haber girilmemiş.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {newsList.map((news) => (
              <div 
                key={news.id} 
                onClick={() => handleNewsClick(news.id)}
                style={{ backgroundColor: '#2a2a40', padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#646cff' }}>{news.title}</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {news.summary ? news.summary : "Bu haberin özeti bulunmuyor."}
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedNews && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#2a2a40', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
              <button
                onClick={handleCloseModal}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ff5252', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✖
              </button>
              <h2 style={{ color: '#646cff', marginTop: 0 }}>{selectedNews.title}</h2>
              <p style={{ color: '#ccc', fontSize: '0.8rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                Tarih: {new Date(selectedNews.created_at).toLocaleString('tr-TR')}
              </p>
              <div style={{ lineHeight: '1.8', color: '#eee', whiteSpace: 'pre-wrap' }}>
                {selectedNews.content}
              </div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
                {podcastStatus === 'idle' && (
                  <button
                    onClick={handleGeneratePodcast}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#646cff', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
                  >
                    🎙 Podcast Oluştur
                  </button>
                )}
                {podcastStatus === 'processing' && (
                  <p style={{ color: '#aaa', fontStyle: 'italic' }}>⏳ Podcast oluşturuluyor, lütfen bekle...</p>
                )}
                {podcastStatus === 'ready' && podcastId && (
                  <div>
                    <p style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '8px' }}>🎧 Podcast hazır!</p>
                    <audio controls style={{ width: '100%' }}>
                      <source src={`${import.meta.env.VITE_API_URL}/podcast/${podcastId}/audio`} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {suggestion && (
          <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#4caf50', color: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', maxWidth: '300px', animation: 'slideIn 0.5s ease-out', zIndex: 1001 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Yeni İlgi Alanı Tespit Edildi! 🎯</h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>{suggestion.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleAcceptSuggestion} 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', backgroundColor: 'white', color: '#4caf50', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Evet, Ekle
              </button>
              <button 
                onClick={() => setSuggestion(null)} 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', backgroundColor: 'transparent', color: 'white', border: '1px solid white', cursor: 'pointer' }}
              >
                Hayır
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;