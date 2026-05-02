import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // YENİ EKLENDİ

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State'leri
  const [username, setUsername] = useState(''); // Girişte Email veya Username, Kayıtta Username
  const [email, setEmail] = useState('');       // Sadece Kayıtta
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const navigate = useNavigate(); // YENİ EKLENDİ

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'İşlem yapılıyor...', type: 'info' });

    if (isLogin) {
      // --- LİGİN İŞLEMİ ---
      // Backend OAuth2 Form Data beklediği için URLSearchParams kullanıyoruz.
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      try {
        const response = await fetch('http://localhost:8080/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });

        const data = await response.json();
        if (response.ok) {
          setMessage({ text: 'Giriş Başarılı! Yönlendiriliyorsunuz...', type: 'success' });
          localStorage.setItem('token', data.access_token);

          // --- YENİ EKLENEN KISIM: Profil Kontrolü ---
          try {
            // Token ile kullanıcının kendi profiline istek atıyoruz
            const userRes = await fetch('http://localhost:8080/users/me', {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const userData = await userRes.json();

            // Backend kuralı: interests listesi boşsa bu yeni bir kullanıcıdır.
            if (userData.interests && userData.interests.length > 0) {
              navigate('/home'); // İlgi alanları varsa ana sayfaya git
            } else {
              navigate('/onboarding'); // Yoksa kategori seçim ekranına git
            }
          } catch (profileError) {
            setMessage({ text: 'Profil bilgileri alınamadı.', type: 'error' });
          }

        } else {
          setMessage({ text: 'Hata: ' + data.detail, type: 'error' });
        }
      } catch (error) {
        setMessage({ text: 'Sunucu bağlantı hatası!', type: 'error' });
      }

    } else {
      // --- KAYIT (REGISTER) İŞLEMİ ---
      // Backend UserCreate şeması beklediği için JSON kullanıyoruz.
      try {
        const response = await fetch('http://localhost:8080/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password })
        });

        const data = await response.json();
        if (response.ok) {
          setMessage({ text: 'Kayıt Başarılı! Şimdi giriş yapabilirsin.', type: 'success' });
          setIsLogin(true); // Kayıt başarılı olunca otomatik Login ekranına geç
          setPassword('');  // Şifreyi güvenlik için temizle
        } else {
          setMessage({ text: 'Hata: ' + data.detail, type: 'error' });
        }
      } catch (error) {
        setMessage({ text: 'Sunucu bağlantı hatası!', type: 'error' });
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e2f', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#2a2a40', padding: '2.5rem', borderRadius: '12px', width: '350px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#fff' }}>
          {isLogin ? 'Hoş Geldiniz' : 'Yeni Hesap Oluştur'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Kayıt Modundaysa Email Alanı Görünsün */}
          {!isLogin && (
            <input 
              type="email" 
              placeholder="E-posta Adresi" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={inputStyle} 
              required 
            />
          )}

          {/* Girişte Esnek (Email/Kullanıcı Adı), Kayıtta Sadece Kullanıcı Adı */}
          <input 
            type="text" 
            placeholder={isLogin ? "E-posta veya Kullanıcı Adı" : "Kullanıcı Adı"} 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={inputStyle} 
            required 
          />

          <input 
            type="password" 
            placeholder="Şifre" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={inputStyle} 
            required 
          />

          <button type="submit" style={buttonStyle}>
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        {/* Mesaj Gösterimi */}
        {message.text && (
          <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: message.type === 'success' ? '#4caf50' : '#ff5252' }}>
            {message.text}
          </p>
        )}

        {/* Mod Değiştirme Butonu */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#aaa' }}>
          {isLogin ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
          <span 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }} 
            style={{ color: '#646cff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </span>
        </p>
      </div>
    </div>
  );
}

// Ortak stiller (Kod kalabalığı yapmaması için ayırdık)
const inputStyle = { padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#1e1e2f', color: '#fff', outline: 'none' };
const buttonStyle = { padding: '12px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px' };

export default Auth;