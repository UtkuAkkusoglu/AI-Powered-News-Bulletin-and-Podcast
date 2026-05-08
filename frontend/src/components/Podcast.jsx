import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { fetchWithAuth } from '../Utils/api';

function Podcast() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

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
      console.error("Podcastler çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- YENİ: SİLME FONKSİYONU ---
  const handleDeletePodcast = async (id) => {
    if (!window.confirm("Bu podcast'i kalıcı olarak silmek istediğine emin misin?")) return;

    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Silme başarılıysa listeyi yerel olarak güncelle (Tekrar API'ye gitmeden)
        setPodcasts(prev => prev.filter(p => p.id !== id));
        setTotalCount(prev => prev - 1);
        alert("Podcast başarıyla silindi.");
      } else {
        alert("Silme işlemi sırasında bir hata oluştu.");
      }
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div style={{ backgroundColor: '#1e1e2f', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Navbar /> 
      
      <div style={{ padding: '2rem' }}>
        <button 
          onClick={() => navigate('/home')} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '1rem', marginBottom: '15px', padding: '0' }}
        >
          <span style={{ fontSize: '1.2rem' }}>⬅</span> Ana Sayfaya Dön
        </button>

        <h2 style={{ borderBottom: '2px solid #444', paddingBottom: '10px', textAlign: 'center' }}>
          Kişisel Podcast Kütüphanem
        </h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '2rem' }}>Kasetler sarılıyor...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', marginTop: '20px', margin: '0 auto' }}>
            
            {podcasts.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', marginTop: '4rem' }}>Henüz podcast bulunmuyor.</p>
            ) : (
              podcasts.map((pod) => (
                <div key={pod.id} style={{ 
                  backgroundColor: '#2a2a40', 
                  padding: '1.5rem', 
                  borderRadius: '10px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  position: 'relative' // Butonu konumlandırmak için
                }}>
                  {/* SİLME BUTONU */}
                  <button
                    onClick={() => handleDeletePodcast(pod.id)}
                    title="Podcast'i Sil"
                    style={{
                      position: 'absolute',
                      top: '15px',
                      right: '15px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ff5252',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '5px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    🗑️
                  </button>

                  <h3 style={{ margin: '0 30px 15px 0', color: '#646cff' }}>{pod.title}</h3>
                  <audio controls style={{ width: '100%', marginBottom: '10px' }}>
                    <source src={pod.audio_url} type="audio/mpeg" />
                  </audio>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>
                    Üretim Tarihi: {new Date(pod.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              ))
            )}

            {/* --- SAYFALAMA ALANI --- */}
            {podcasts.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', flexWrap: 'wrap', gap: '15px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                  Toplam {totalCount} podcast — Sayfa {page} / {totalPages}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Sayfa başı:</span>
                  {[10, 25, 50].map(size => (
                    <button
                      key={size}
                      onClick={() => handlePageSizeChange(size)}
                      style={{ 
                        padding: '5px 12px', borderRadius: '5px', border: 'none', 
                        backgroundColor: pageSize === size ? '#646cff' : '#333', 
                        color: 'white', cursor: 'pointer', fontWeight: pageSize === size ? 'bold' : 'normal' 
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: page === 1 ? '#222' : '#444', color: page === 1 ? '#666' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                  > ← </button>

                  {(() => {
                    const buttons = [];
                    const delta = 2;
                    const left = Math.max(2, page - delta);
                    const right = Math.min(totalPages - 1, page + delta);

                    buttons.push(
                      <button key={1} onClick={() => setPage(1)}
                        style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: page === 1 ? '#646cff' : '#333', color: 'white', cursor: 'pointer' }}>
                        1
                      </button>
                    );

                    if (left > 2) buttons.push(<span key="l-dots" style={{ color: '#aaa', padding: '0 4px' }}>...</span>);

                    for (let i = left; i <= right; i++) {
                      buttons.push(
                        <button key={i} onClick={() => setPage(i)}
                          style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: page === i ? '#646cff' : '#333', color: 'white', cursor: 'pointer', fontWeight: page === i ? 'bold' : 'normal' }}>
                          {i}
                        </button>
                      );
                    }

                    if (right < totalPages - 1) buttons.push(<span key="r-dots" style={{ color: '#aaa', padding: '0 4px' }}>...</span>);

                    if (totalPages > 1) {
                      buttons.push(
                        <button key={totalPages} onClick={() => setPage(totalPages)}
                          style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: page === totalPages ? '#646cff' : '#333', color: 'white', cursor: 'pointer', fontWeight: page === totalPages ? 'bold' : 'normal' }}>
                          {totalPages}
                        </button>
                      );
                    }
                    return buttons;
                  })()}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: page === totalPages ? '#222' : '#444', color: page === totalPages ? '#666' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                  > → </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Podcast;