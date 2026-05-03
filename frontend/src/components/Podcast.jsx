import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { fetchWithAuth } from '../Utils/api'; // YENİ

function Podcast() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        // Artık token ekleme kodu yok!
        const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/podcast/`);
        if (response.ok) {
          const data = await response.json();
          setPodcasts(data.items);
        }
      } catch (error) {
        console.error("Podcastler çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPodcasts();
  }, []);

  return (
    <div style={{ backgroundColor: '#1e1e2f', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Navbar /> 
      
      <div style={{ padding: '2rem' }}>
        <button 
          onClick={() => navigate('/home')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'transparent', 
            color: '#aaa', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '1rem', 
            marginBottom: '15px',
            padding: '0',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
          onMouseOut={(e) => e.currentTarget.style.color = '#aaa'}
        >
          <span style={{ fontSize: '1.2rem' }}>⬅</span> Ana Sayfaya Dön
        </button>

        <h2 style={{ borderBottom: '2px solid #444', paddingBottom: '10px', textAlign: 'center' }}>
          Kişisel Podcast Kütüphanem
        </h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '2rem' }}>Kasetler sarılıyor...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', marginTop: '20px', margin: '0 auto' }}>
            
            {podcasts.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', marginTop: '4rem', fontSize: '1.1rem' }}>
                Henüz senin için üretilmiş bir podcast bulunmuyor.
              </p>
            ) : (
              podcasts.map((pod) => (
                <div key={pod.id} style={{ backgroundColor: '#2a2a40', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#646cff' }}>{pod.title}</h3>
                  <audio controls style={{ width: '100%', marginBottom: '10px' }}>
                    <source src={pod.audio_url} type="audio/mpeg" />
                    Tarayıcınız ses oynatıcıyı desteklemiyor.
                  </audio>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>
                    Üretim Tarihi: {new Date(pod.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              ))
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}

export default Podcast;