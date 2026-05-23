import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../Utils/api';
import { useWindowSize } from '../Utils/useWindowSize';

function RssReader() {
  const { isMobile } = useWindowSize();
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  // Panel visibility (mobile: show either list panel or articles)
  const [showListPanel, setShowListPanel] = useState(true);

  // New list form
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Feed management
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [showFeedForm, setShowFeedForm] = useState(false);

  // Rename
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast(p => ({ ...p, show: false })), 2500);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    setLoadingLists(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists`);
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        if (data.length > 0 && !selectedList) {
          setSelectedList(data[0]);
          loadArticles(data[0].id);
        }
      }
    } catch (_) { showToast('Listeler yüklenemedi.', 'error'); }
    finally { setLoadingLists(false); }
  };

  const loadArticles = async (listId) => {
    setLoadingArticles(true);
    setArticles([]);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists/${listId}/articles`);
      if (res.ok) setArticles(await res.json());
    } catch (_) { showToast('Haberler çekilemedi.', 'error'); }
    finally { setLoadingArticles(false); }
  };

  const handleSelectList = (lst) => {
    setSelectedList(lst);
    setShowFeedForm(false);
    loadArticles(lst.id);
    if (isMobile) setShowListPanel(false);
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists`, {
        method: 'POST',
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setLists(prev => [...prev, created]);
        setNewListName('');
        setSelectedList(created);
        setArticles([]);
        if (isMobile) setShowListPanel(false);
        showToast('Liste oluşturuldu!', 'success');
      }
    } catch (_) { showToast('Oluşturulamadı.', 'error'); }
    finally { setCreatingList(false); }
  };

  const handleDeleteList = async (listId, e) => {
    e.stopPropagation();
    if (!confirm('Bu listeyi ve tüm feedlerini silmek istiyor musun?')) return;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        if (selectedList?.id === listId) { setSelectedList(null); setArticles([]); }
        showToast('Liste silindi.', 'success');
      }
    } catch (_) { showToast('Silinemedi.', 'error'); }
  };

  const handleRename = async (listId) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists/${listId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l.id === listId ? { ...l, name: updated.name } : l));
        if (selectedList?.id === listId) setSelectedList(p => ({ ...p, name: updated.name }));
        showToast('Yeniden adlandırıldı.', 'success');
      }
    } catch (_) {}
    finally { setRenamingId(null); }
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    if (!newFeedUrl.trim() || !selectedList) return;
    setAddingFeed(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists/${selectedList.id}/feeds`, {
        method: 'POST',
        body: JSON.stringify({ url: newFeedUrl.trim() }),
      });
      if (res.ok) {
        const feed = await res.json();
        const updatedList = { ...selectedList, feeds: [...(selectedList.feeds || []), feed], feed_count: (selectedList.feed_count || 0) + 1 };
        setSelectedList(updatedList);
        setLists(prev => prev.map(l => l.id === selectedList.id ? updatedList : l));
        setNewFeedUrl('');
        showToast(`"${feed.title || feed.url}" eklendi!`, 'success');
        loadArticles(selectedList.id);
      } else {
        const err = await res.json();
        showToast(err.detail || 'Eklenemedi.', 'error');
      }
    } catch (_) { showToast('Bağlantı hatası.', 'error'); }
    finally { setAddingFeed(false); }
  };

  const handleRemoveFeed = async (feedId) => {
    if (!selectedList) return;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/rss-reader/lists/${selectedList.id}/feeds/${feedId}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedFeeds = selectedList.feeds.filter(f => f.id !== feedId);
        const updatedList = { ...selectedList, feeds: updatedFeeds, feed_count: updatedFeeds.length };
        setSelectedList(updatedList);
        setLists(prev => prev.map(l => l.id === selectedList.id ? updatedList : l));
        showToast('Feed kaldırıldı.', 'success');
        loadArticles(selectedList.id);
      }
    } catch (_) { showToast('Kaldırılamadı.', 'error'); }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').slice(0, 180);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const s = {
    page: { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", color: '#f1f5f9', padding: isMobile ? '5rem 0 0' : '0' },

    listPanel: {
      width: isMobile ? '100%' : '280px',
      flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: isMobile ? (showListPanel ? 'flex' : 'none') : 'flex',
      flexDirection: 'column',
      background: 'rgba(8, 12, 24, 0.6)',
      overflowY: 'auto',
      padding: isMobile ? '1rem' : '1.5rem 1rem',
    },

    articlePanel: {
      flex: 1,
      overflowY: 'auto',
      display: isMobile ? (showListPanel ? 'none' : 'flex') : 'flex',
      flexDirection: 'column',
      padding: isMobile ? '1rem' : '2rem 2.5rem',
    },

    listItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '11px 14px', borderRadius: '14px', cursor: 'pointer',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
      marginBottom: '4px', transition: '0.2s',
    }),

    articleCard: {
      background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '18px', padding: '1.25rem 1.5rem', marginBottom: '14px',
      transition: '0.2s', cursor: 'pointer',
    },

    input: {
      width: '100%', padding: '10px 14px', borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(2,6,23,0.5)',
      color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
    },

    btn: (variant = 'primary') => ({
      padding: '9px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
      fontWeight: '700', fontSize: '0.82rem', transition: '0.2s',
      ...(variant === 'primary' ? { background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white' } : {}),
      ...(variant === 'ghost' ? { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' } : {}),
      ...(variant === 'danger' ? { background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' } : {}),
    }),

    toast: {
      position: 'fixed', top: toast.show ? '24px' : '-80px', left: '50%', transform: 'translateX(-50%)',
      background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      color: toast.type === 'success' ? '#10b981' : '#ef4444',
      border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
      backdropFilter: 'blur(12px)', padding: '10px 22px', borderRadius: '14px', fontWeight: '600',
      transition: 'all 0.4s', opacity: toast.show ? 1 : 0, zIndex: 9999, whiteSpace: 'nowrap',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.toast}>{toast.message}</div>

      {/* ── LIST PANEL ────────────────────────────────────────── */}
      <div style={s.listPanel}>
        {isMobile && !showListPanel && (
          <button onClick={() => setShowListPanel(true)} style={{ ...s.btn('ghost'), marginBottom: '1rem', alignSelf: 'flex-start' }}>← Listeler</button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white' }}>📡 RSS Listelerim</h2>
        </div>

        {/* Create list form */}
        <form onSubmit={handleCreateList} style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
          <input
            style={{ ...s.input, fontSize: '0.8rem', padding: '8px 12px' }}
            placeholder="Yeni liste adı..."
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
          />
          <button type="submit" disabled={creatingList || !newListName.trim()} style={{ ...s.btn('primary'), padding: '8px 12px', flexShrink: 0, opacity: !newListName.trim() ? 0.5 : 1 }}>+</button>
        </form>

        {/* List items */}
        {loadingLists ? (
          <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Yükleniyor...</p>
        ) : lists.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Henüz liste yok.<br />Yukarıdan oluştur.</p>
        ) : (
          lists.map(lst => (
            <div key={lst.id}>
              {renamingId === lst.id ? (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                  <input
                    autoFocus
                    style={{ ...s.input, fontSize: '0.82rem', padding: '8px 10px' }}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(lst.id); if (e.key === 'Escape') setRenamingId(null); }}
                  />
                  <button onClick={() => handleRename(lst.id)} style={{ ...s.btn('primary'), padding: '8px 10px', flexShrink: 0 }}>✓</button>
                </div>
              ) : (
                <div
                  style={s.listItem(selectedList?.id === lst.id)}
                  onClick={() => handleSelectList(lst)}
                  onMouseOver={e => { if (selectedList?.id !== lst.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseOut={e => { if (selectedList?.id !== lst.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: selectedList?.id === lst.id ? '700' : '500', color: selectedList?.id === lst.id ? 'white' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lst.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0 }}>{lst.feed_count}</span>
                  <button onClick={e => { e.stopPropagation(); setRenamingId(lst.id); setRenameValue(lst.name); }} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem', flexShrink: 0 }} title="Yeniden adlandır">✏️</button>
                  <button onClick={e => handleDeleteList(lst.id, e)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem', flexShrink: 0 }} title="Sil">🗑</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── ARTICLE PANEL ─────────────────────────────────────── */}
      <div style={s.articlePanel}>
        {isMobile && !showListPanel && (
          <button onClick={() => setShowListPanel(true)} style={{ ...s.btn('ghost'), marginBottom: '1.25rem', alignSelf: 'flex-start' }}>← Listeler</button>
        )}

        {!selectedList ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#475569', gap: '12px' }}>
            <div style={{ fontSize: '3rem' }}>📡</div>
            <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Bir liste seç veya oluştur</p>
            <p style={{ fontSize: '0.9rem' }}>Soldaki panelden listeye tıkla.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: '900', color: 'white' }}>{selectedList.name}</h1>
                  <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.85rem' }}>{selectedList.feed_count || 0} kaynak · {articles.length} makale</p>
                </div>
                <button onClick={() => setShowFeedForm(p => !p)} style={{ ...s.btn(showFeedForm ? 'ghost' : 'primary'), whiteSpace: 'nowrap' }}>
                  {showFeedForm ? '✕ Kapat' : '+ RSS Ekle'}
                </button>
              </div>

              {/* Add feed form */}
              {showFeedForm && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '16px', padding: '1.25rem' }}>
                  <form onSubmit={handleAddFeed} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      style={{ ...s.input, flex: 1, minWidth: '200px' }}
                      placeholder="https://example.com/feed.xml"
                      type="url"
                      required
                      value={newFeedUrl}
                      onChange={e => setNewFeedUrl(e.target.value)}
                    />
                    <button type="submit" disabled={addingFeed} style={{ ...s.btn('primary'), flexShrink: 0 }}>
                      {addingFeed ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                  </form>

                  {/* Existing feeds list */}
                  {selectedList.feeds?.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedList.feeds.map(f => (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title || f.url}</p>
                            {f.title && <p style={{ margin: 0, fontSize: '0.7rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</p>}
                          </div>
                          <button onClick={() => handleRemoveFeed(f.id)} style={{ ...s.btn('danger'), padding: '5px 10px', flexShrink: 0 }}>Kaldır</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Articles */}
            {loadingArticles ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px', color: '#475569' }}>
                <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                <p>Haberler çekiliyor...</p>
              </div>
            ) : articles.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#475569', gap: '12px' }}>
                <div style={{ fontSize: '3rem' }}>🗞️</div>
                {selectedList.feed_count === 0
                  ? <><p style={{ fontWeight: '600' }}>Henüz kaynak eklenmedi.</p><p style={{ fontSize: '0.9rem' }}>"+ RSS Ekle" butonuna tıkla.</p></>
                  : <p style={{ fontWeight: '600' }}>Kaynaklar boş veya erişilemiyor.</p>
                }
              </div>
            ) : (
              <div style={{ paddingBottom: '4rem' }}>
                {articles.map((a, i) => (
                  <a
                    key={i}
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div
                      style={s.articleCard}
                      onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(15,23,42,0.5)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{a.feed_title}</span>
                        {a.published && <span style={{ fontSize: '0.65rem', color: '#475569' }}>· {formatDate(a.published)}</span>}
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: isMobile ? '1rem' : '1.1rem', color: 'white', fontWeight: '700', lineHeight: '1.4' }}>{a.title}</h3>
                      {a.summary && <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>{stripHtml(a.summary)}</p>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RssReader;
