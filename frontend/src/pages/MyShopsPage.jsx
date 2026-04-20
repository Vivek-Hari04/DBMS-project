import { useState, useEffect } from 'react';
import { shopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import StructuredLocationField from '../components/Location/StructuredLocationField';

const CATEGORIES = ['General', 'Retail', 'Food & Beverage', 'Salon & Spa', 'Electronics', 'Pharmacy', 'Hardware', 'Other'];

const emptyForm = { name: '', category: '', description: '', location: '', customCategory: '' };

function MyShopsPage() {
  const { setActiveShop } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageModalShop, setImageModalShop] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [shopImages, setShopImages] = useState({});

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await shopAPI.getMyShops();
      setShops(res.data.shops || []);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setForm(emptyForm); setEditingShop(null); setShowCreateModal(true); };
  const openEdit = (shop) => { 
    const isOther = shop.category && !CATEGORIES.includes(shop.category);
    setForm({ 
      name: shop.name, 
      category: isOther ? 'Other' : (shop.category || ''), 
      description: shop.description || '', 
      location: shop.location || '',
      customCategory: isOther ? shop.category : ''
    }); 
    setEditingShop(shop); 
    setShowCreateModal(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Shop name is required'); return; }
    
    const category = form.category === 'Other' ? form.customCategory : form.category;
    const submitData = {
      name: form.name,
      category: category,
      description: form.description,
      location: form.location
    };

    try {
      setSubmitting(true);
      if (editingShop) {
        const res = await shopAPI.updateShop(editingShop.id, submitData);
        setShops(prev => prev.map(s => s.id === editingShop.id ? res.data.shop : s));
        toast.success('Shop updated!');
        if (setActiveShop) setActiveShop(res.data.shop);
      } else {
        const res = await shopAPI.createShop(submitData);
        setShops(prev => [res.data.shop, ...prev]);
        setActiveShop(res.data.shop);
        toast.success('Shop created!');
      }
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save shop');
    } finally {
      setSubmitting(false);
    }
  };

  const openImageManager = async (shop) => {
    setImageModalShop(shop);
    setImageUrl('');
    if (!shopImages[shop.id]) {
      try {
        const res = await shopAPI.getShopImages(shop.id);
        setShopImages(prev => ({ ...prev, [shop.id]: res.data.images || [] }));
      } catch { setShopImages(prev => ({ ...prev, [shop.id]: [] })); }
    }
  };

  const handleAddImage = async () => {
    if (!imageUrl.trim()) { toast.error('Enter an image URL'); return; }
    try {
      const res = await shopAPI.addShopImage(imageModalShop.id, { image_url: imageUrl });
      setShopImages(prev => ({ ...prev, [imageModalShop.id]: [res.data.image, ...(prev[imageModalShop.id] || [])] }));
      setImageUrl('');
      toast.success('Image added!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add image');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      toast.loading('Uploading...', { id: 'upload' });
      const res = await shopAPI.uploadFile(formData);
      setImageUrl(res.data.url);
      toast.success('File uploaded!', { id: 'upload' });
    } catch (err) {
      toast.error('Upload failed', { id: 'upload' });
    }
  };

  if (loading) return <div className="loading-state">Loading shops...</div>;

  return (
    <div className="jobs-dashboard">
      <div className="jobs-header">
        <h2 className="section-title">My Shops</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Shop</button>
      </div>

      {shops.length === 0 ? (
        <div className="empty-state card">
          <p>You don't have any shops yet. Create one to start posting jobs.</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {shops.map(shop => (
            <div key={shop.id} className="job-card card">
              <div className="job-card-header">
                <h3>{shop.name}</h3>
                {shop.category && <span className="badge badge-primary">{shop.category}</span>}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>📍 {shop.location || 'No location set'}</div>
              <p className="job-description">{shop.description || 'No description'}</p>
              <div className="job-footer" style={{ gap: 8 }}>
                <button className="btn btn-secondary text-sm" onClick={() => openEdit(shop)}>✏ Edit</button>
                <button className="btn btn-primary text-sm" onClick={() => openImageManager(shop)}>🖼 Images</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingShop ? 'Edit Shop' : 'Create Shop'}</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Shop Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Raju Electronics" required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {form.category === 'Other' && (
                <div className="form-group">
                  <label className="form-label">Custom Category</label>
                  <input className="form-input" value={form.customCategory} onChange={e => setForm(p => ({ ...p, customCategory: e.target.value }))} placeholder="Type your category..." />
                </div>
              )}
              <div className="form-group">
                <StructuredLocationField 
                  value={form.location} 
                  onChange={(loc) => setForm(p => ({ ...p, location: loc }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your shop..." />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : (editingShop ? 'Update Shop' : 'Create Shop')}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Manager Modal */}
      {imageModalShop && (
        <div className="modal-overlay" onClick={() => setImageModalShop(null)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Images — {imageModalShop.name}</h2>
              <button className="btn-close" onClick={() => setImageModalShop(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL..." style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={handleAddImage}>Add</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#666' }}>Or upload:</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                {(shopImages[imageModalShop.id] || []).map(img => (
                  <img key={img.id} src={img.image_url} alt="shop" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} onError={e => { e.target.style.display='none'; }} />
                ))}
                {(shopImages[imageModalShop.id] || []).length === 0 && <p style={{ gridColumn: 'span 3', color: '#888', textAlign: 'center' }}>No images yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyShopsPage;
