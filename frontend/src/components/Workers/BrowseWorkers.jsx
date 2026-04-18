import { useEffect, useMemo, useState } from 'react';
import { favoritesAPI, jobAPI, workersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './BrowseWorkers.css';
import StructuredLocationField from '../Location/StructuredLocationField';

function WorkerCard({ worker, isFavorite, onToggleFavorite, onOfferJob }) {
  return (
    <div className="worker-card card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {worker.avatar_url ? (
          <img
            src={worker.avatar_url}
            alt="avatar"
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#eaebef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#6d7280',
            }}
          >
            {worker.full_name ? worker.full_name.charAt(0).toUpperCase() : '?'}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{worker.full_name}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{worker.location || 'Location not provided'}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {worker.average_rating > 0 ? `★ ${Number(worker.average_rating).toFixed(1)}/5.0` : 'No ratings yet'}
          </div>
        </div>

        <button
          className={`btn ${isFavorite ? 'btn-primary' : 'btn-secondary'} text-sm`}
          onClick={() => onToggleFavorite(worker.id, isFavorite)}
        >
          {isFavorite ? '★ Favorite' : '☆ Favorite'}
        </button>

        <button className="btn btn-primary text-sm" onClick={() => onOfferJob(worker)}>
          Offer Job
        </button>
      </div>
    </div>
  );
}

function BrowseWorkers() {
  const [tab, setTab] = useState('all'); // all | favorites
  const [loading, setLoading] = useState(true);
  const [locationTerm, setLocationTerm] = useState('');
  const [nameTerm, setNameTerm] = useState('');
  const [workers, setWorkers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [offerModal, setOfferModal] = useState({ show: false, worker: null });
  const [offerForm, setOfferForm] = useState({
    worker_id: null,
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_min: '',
    salary_max: '',
    duration: '',
    category_id: 1,
    contact_phone: '',
    contact_email: '',
    expiry_days: 7,
  });
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  const favoriteSet = useMemo(() => new Set(favorites.map((w) => w.id)), [favorites]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, fRes] = await Promise.all([
        workersAPI.listWorkers({ location: locationTerm || '', name: nameTerm || '' }),
        favoritesAPI.listFavoriteWorkers(),
      ]);
      setWorkers(wRes.data.workers || []);
      setFavorites(fRes.data.workers || []);
    } catch (e) {
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchAll();
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFavorite = async (workerId, currentlyFav) => {
    try {
      if (currentlyFav) {
        await favoritesAPI.unfavoriteWorker(workerId);
        setFavorites((prev) => prev.filter((w) => w.id !== workerId));
      } else {
        await favoritesAPI.favoriteWorker(workerId);
        // refresh favorites list so it contains full worker fields
        const fRes = await favoritesAPI.listFavoriteWorkers();
        setFavorites(fRes.data.workers || []);
      }
    } catch (e) {
      toast.error('Failed to update favorite');
    }
  };

  const shown = tab === 'favorites' ? favorites : workers;

  const openOffer = (worker) => {
    setOfferForm((prev) => ({
      ...prev,
      worker_id: worker.id,
      title: '',
      description: '',
      requirements: '',
      location: worker.location || '',
    }));
    setOfferModal({ show: true, worker });
  };

  const submitOffer = async () => {
    try {
      setOfferSubmitting(true);
      await jobAPI.createPrivateOffer({
        ...offerForm,
        salary_min: offerForm.salary_min === '' ? null : Number(offerForm.salary_min),
        salary_max: offerForm.salary_max === '' ? null : Number(offerForm.salary_max),
        category_id: offerForm.category_id ? Number(offerForm.category_id) : null,
        expiry_days: Number(offerForm.expiry_days || 7),
      });
      toast.success('Offer sent!');
      setOfferModal({ show: false, worker: null });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send offer');
    } finally {
      setOfferSubmitting(false);
    }
  };

  return (
    <div className="browse-workers-page">
      <div className="jobs-header">
        <h2 className="section-title">Browse Workers</h2>
        <div className="search-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search workers by name..."
            value={nameTerm}
            onChange={(e) => setNameTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Search workers by location (state/district/pin)..."
            value={locationTerm}
            onChange={(e) => setLocationTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="form-input"
          />
          <button className="btn btn-primary text-sm" onClick={fetchAll}>
            Search
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setTab('all')}>
          All Workers
        </button>
        <button
          className={`btn ${tab === 'favorites' ? 'btn-primary' : 'btn-secondary'} text-sm`}
          onClick={() => setTab('favorites')}
        >
          Favorites
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading workers...</div>
      ) : shown.length === 0 ? (
        <div className="empty-state card">
          <p>{tab === 'favorites' ? "You haven't favorited any workers yet." : 'No workers found.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {shown.map((w) => (
            <WorkerCard
              key={w.id}
              worker={w}
              isFavorite={favoriteSet.has(w.id)}
              onToggleFavorite={toggleFavorite}
              onOfferJob={openOffer}
            />
          ))}
        </div>
      )}

      {offerModal.show && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
          }}
          onClick={() => setOfferModal({ show: false, worker: null })}
        >
          <div className="card" style={{ width: 720, maxWidth: '94vw', padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title" style={{ marginBottom: 10 }}>
              Offer Job to {offerModal.worker?.full_name}
            </h3>

            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Title</label>
                <input
                  className="form-input w-full"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Need an electrician for wiring"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea w-full"
                  rows={4}
                  value={offerForm.description}
                  onChange={(e) => setOfferForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <StructuredLocationField
                value={offerForm.location}
                onChange={(locStr) => setOfferForm((p) => ({ ...p, location: locStr }))}
                required
                label="Job Location"
              />

              <div className="form-group">
                <label className="form-label">Min Salary (₹)</label>
                <input
                  type="number"
                  className="form-input w-full"
                  value={offerForm.salary_min}
                  onChange={(e) => setOfferForm((p) => ({ ...p, salary_min: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Salary (₹)</label>
                <input
                  type="number"
                  className="form-input w-full"
                  value={offerForm.salary_max}
                  onChange={(e) => setOfferForm((p) => ({ ...p, salary_max: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Requirements (optional)</label>
                <textarea
                  className="form-textarea w-full"
                  rows={3}
                  value={offerForm.requirements}
                  onChange={(e) => setOfferForm((p) => ({ ...p, requirements: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (optional)</label>
                <input
                  className="form-input w-full"
                  value={offerForm.duration}
                  onChange={(e) => setOfferForm((p) => ({ ...p, duration: e.target.value }))}
                  placeholder="e.g. 1 day"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry (days)</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  className="form-input w-full"
                  value={offerForm.expiry_days}
                  onChange={(e) => setOfferForm((p) => ({ ...p, expiry_days: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-input w-full"
                  value={offerForm.contact_phone}
                  onChange={(e) => setOfferForm((p) => ({ ...p, contact_phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  className="form-input w-full"
                  value={offerForm.contact_email}
                  onChange={(e) => setOfferForm((p) => ({ ...p, contact_email: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button className="btn btn-secondary text-sm" onClick={() => setOfferModal({ show: false, worker: null })}>
                Cancel
              </button>
              <button className="btn btn-primary text-sm" onClick={submitOffer} disabled={offerSubmitting}>
                {offerSubmitting ? 'Sending…' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrowseWorkers;

