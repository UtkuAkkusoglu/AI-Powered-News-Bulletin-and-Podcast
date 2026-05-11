import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Haber Akışı', path: '/home', icon: '🏠' },
    { name: 'Podcastlerim', path: '/podcasts', icon: '🎙️' },
    { name: 'Ayarlar', path: '/settings', icon: '⚙️' }
  ];

  const styles = {
    sidebar: {
      width: '280px', height: '100vh', position: 'fixed', left: 0, top: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRight: '1px solid rgba(255,255,255,0.05)',
      padding: '2rem 1.5rem', backdropFilter: 'blur(20px)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    },
    logo: {
      fontSize: '1.6rem', fontWeight: '900', color: 'white', textDecoration: 'none',
      marginBottom: '3.5rem', display: 'block', paddingLeft: '1rem'
    },
    navItem: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: '15px', padding: '14px 20px',
      borderRadius: '16px', color: isActive ? 'white' : '#94a3b8',
      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
      textDecoration: 'none', fontWeight: '700', marginBottom: '10px',
      transition: 'all 0.3s ease', border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
    })
  };

  return (
    <aside style={styles.sidebar}>
      <Link to="/home" style={styles.logo}>🌐 NewsFlow</Link>
      
      <nav>
        {menuItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            style={styles.navItem(location.pathname === item.path)}
          >
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '1rem', color: '#475569', fontSize: '0.8rem', textAlign: 'center' }}>
        NewsFlow v2.0
      </div>
    </aside>
  );
}

export default Sidebar;