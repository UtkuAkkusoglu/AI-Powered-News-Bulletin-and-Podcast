import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Onboarding() {
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Sayfa açıldığında kategorileri backend'den çek[cite: 4]
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:8080/categories/');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          setMessage('Kategoriler yüklenemedi.');
        }
      } catch (error) {
        setMessage('Sunucuya bağlanılamadı. Docker açık mı?');
      }
    };
    fetchCategories();
  }, []);

  // Kategori seçme/çıkarma mantığı
  const toggleCategory = (id) => {
    if (selectedIds.includes(id)) {
      // Eğer zaten seçiliyse listeden çıkar
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      // Seçili değilse listeye ekle
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Seçimleri backend'e gönder ve Home'a geç
  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:8080/users/interests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Güvenlik biletimizi gösteriyoruz[cite: 7]
        },
        body: JSON.stringify({ category_ids: selectedIds }) // Şemaya uygun gönderiyoruz[cite: 2]
      });

      if (response.ok) {
        navigate('/home'); // Başarılıysa ana akışa yönlendir
      } else {
        const data = await response.json();
        setMessage('Hata: ' + data.detail);
      }
    } catch (error) {
      setMessage('Bağlantı hatası yaşandı.');
    }
  };

  // En az 2 seçim kuralı: 2'den azsa buton disabled olacak[cite: 7]
  const isButtonDisabled = selectedIds.length < 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1e1e2f', color: 'white', padding: '3rem 1rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Nelerle İlgileniyorsun?</h2>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>Sana özel bir haber akışı sunabilmemiz için en az 2 kategori seçmelisin.</p>
      
      {/* Kategorileri Dinamik Olarak Listeleme */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '600px', marginBottom: '2rem' }}>
        {categories.map((cat) => {
          const isSelected = selectedIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: isSelected ? '2px solid #646cff' : '1px solid #444',
                backgroundColor: isSelected ? '#646cff33' : '#2a2a40',
                color: isSelected ? '#646cff' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={isButtonDisabled}
        style={{ 
          padding: '12px 30px', 
          backgroundColor: isButtonDisabled ? '#555' : '#4caf50', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer', 
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}
      >
        Akışımı Hazırla
      </button>

      {message && <p style={{ marginTop: '1rem', color: '#ff5252' }}>{message}</p>}
    </div>
  );
}

export default Onboarding;