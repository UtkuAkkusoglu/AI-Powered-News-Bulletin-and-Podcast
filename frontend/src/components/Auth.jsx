import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState(''); // Backend hem email hem username kabul eder
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // --- LOGIN İŞLEMİ ---
      // Backend OAuth2PasswordRequestForm beklediği için veriyi FormData ile gönderiyoruz[cite: 1]
      const formData = new FormData();
      formData.append('username', username); // Buraya email veya kullanıcı adı girilebilir[cite: 1]
      formData.append('password', password);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: 'POST',
          body: formData,
          // KRİTİK: Çerezlerin (Refresh Token) kabul edilmesi ve gönderilmesi için şart
          credentials: 'include', 
        });

        if (response.ok) {
          const data = await response.json();
          // Access token'ı saklıyoruz[cite: 1]
          localStorage.setItem('token', data.access_token);
          
          // Kullanıcının ilgi alanları var mı kontrol etmek için profile gidiyoruz
          const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          const userData = await userResponse.json();

          // Eğer ilgi alanı seçmemişse onboarding'e, seçmişse ana sayfaya[cite: 5]
          if (userData.interests && userData.interests.length > 0) {
            navigate('/home');
          } else {
            navigate('/onboarding');
          }
        } else {
          alert("Giriş başarısız! Bilgilerini kontrol et.");
        }
      } catch (error) {
        console.error("Login hatası:", error);
      }

    } else {
      // --- REGISTER İŞLEMİ ---
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });

        if (response.ok) {
          alert("Kayıt başarılı! Şimdi giriş yapabilirsin.");
          setIsLogin(true);
        } else {
          const errorData = await response.json();
          alert(errorData.detail || "Kayıt sırasında bir hata oluştu.");
        }
      } catch (error) {
        console.error("Kayıt hatası:", error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e2f' }}>
      <div style={{ backgroundColor: '#2a2a40', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', width: '400px', color: 'white' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{isLogin ? 'Hoş Geldiniz' : 'Hesap Oluştur'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder={isLogin ? "E-posta veya Kullanıcı Adı" : "Kullanıcı Adı"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          
          {!isLogin && (
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#333', color: 'white' }}
            />
          )}
          
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          
          <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#646cff', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
          {isLogin ? 'Hesabın yok mu?' : 'Zaten üye misin?'} 
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ color: '#646cff', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;