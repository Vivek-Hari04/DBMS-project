import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopAPI } from '../services/api';

function ShopProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [images, setImages] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [shopRes, imgRes, jobRes] = await Promise.all([
          shopAPI.getShop(id),
          shopAPI.getShopImages(id),
          shopAPI.getShopJobs(id),
        ]);
        setShop(shopRes.data.shop);
        setImages(imgRes.data.images || []);
        setJobs(jobRes.data.jobs || []);
      } catch {
        setError('Shop not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="loading-state">Loading shop...</div>;
  if (error) return (
    <div className="empty-state card">
      <p>{error}</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );

  return (
    <div className="jobs-dashboard">
      {/* Back */}
      <button className="btn-link mb-4" onClick={() => navigate(-1)}>← Back</button>

      {/* Shop Header */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff', flexShrink: 0,
          }}>🏪</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 4 }}>{shop.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {shop.category && (
                <span className="badge badge-primary">{shop.category}</span>
              )}
              {shop.location && (
                <span style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {shop.location}
                </span>
              )}
            </div>
            <p style={{ color: '#555', lineHeight: 1.6 }}>{shop.description || 'No description provided.'}</p>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Gallery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {images.map(img => (
              <img
                key={img.id}
                src={img.image_url}
                alt="shop"
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Jobs Posted by Shop */}
      <div>
        <h2 className="section-title" style={{ marginBottom: 14 }}>Jobs Posted</h2>
        {jobs.length === 0 ? (
          <div className="empty-state card"><p>No active jobs from this shop.</p></div>
        ) : (
          <div className="jobs-grid">
            {jobs.map(job => (
              <div key={job.id} className="job-card card">
                <div className="job-card-header">
                  <h3>{job.title}</h3>
                  <span className={`badge ${job.job_type === 'permanent' ? 'badge-success' : 'badge-warning'}`}>
                    {job.job_type === 'permanent' ? 'Permanent' : 'Temporary'}
                  </span>
                </div>
                <div className="job-meta">
                  <span className="meta-item">📍 {job.location}</span>
                  <span className="meta-item" style={{ textTransform: 'capitalize' }}>⚡ {job.status}</span>
                </div>
                <p className="job-description">{job.description?.substring(0, 100)}...</p>
                <div className="job-footer">
                  <span className="job-expires">Expires: {new Date(job.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopProfilePage;
