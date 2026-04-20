import { useEffect, useMemo, useState } from 'react';
import { favoritesAPI, jobAPI, workersAPI, profileAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './BrowseWorkers.css';
import StructuredLocationField from '../Location/StructuredLocationField';
import { useAuth } from '../../context/AuthContext';

function WorkerCard({ worker, isFavorite, onToggleFavorite, onOfferJob, onHelpRequest, isHandyman }) {
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="worker-card card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {worker.avatar_url ? (
          <img
            src={worker.avatar_url}
            alt="avatar"
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#9ca3af', fontSize: '1.2rem' }}>
            {worker.full_name ? worker.full_name.charAt(0).toUpperCase() : '?'}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{worker.full_name}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            <span style={{ marginRight: 10 }}>📍 {worker.location || 'N/A'}</span>
            {worker.specification && <span>🛠️ {worker.specification}</span>}
          </div>
          <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4, fontWeight: 500 }}>
            {worker.average_rating > 0 ? `★ ${Number(worker.average_rating).toFixed(1)} / 5.0` : 'No ratings yet'}
          </div>
          
          {worker.bio && (
            <p style={{ fontSize: 13, color: '#4b5563', marginTop: 8, fontStyle: 'italic', lineHeight: '1.4' }}>
              "{worker.bio.substring(0, 100)}{worker.bio.length > 100 ? '...' : ''}"
            </p>
          )}
          
          {showContact && (
            <div style={{ marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 13, border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: 4 }}>📧 <strong>Email:</strong> {worker.email || 'Not shared'}</div>
              <div>📞 <strong>Phone:</strong> {worker.phone || 'Not shared'}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!isHandyman && (
            <button
              className={`btn ${isFavorite ? 'btn-primary' : 'btn-secondary'} text-xs`}
              style={{ padding: '6px 12px' }}
              onClick={() => onToggleFavorite(worker.id, isFavorite)}
            >
              {isFavorite ? '★ Favored' : '☆ Favorite'}
            </button>
          )}

          <button 
            className="btn btn-secondary text-xs" 
            style={{ padding: '6px 12px' }}
            onClick={() => setShowContact(!showContact)}
          >
            {showContact ? 'Hide Contact' : 'View Contact'}
          </button>

          {isHandyman ? (
            <button 
              className="btn btn-primary text-xs" 
              style={{ padding: '6px 12px', background: '#059669' }} 
              onClick={() => onHelpRequest(worker)}
            >
              Ask for Help
            </button>
          ) : (
            <button 
              className="btn btn-primary text-xs" 
              style={{ padding: '6px 12px' }} 
              onClick={() => onOfferJob(worker)}
            >
              Offer Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BrowseWorkers() {
  const { user, isHandyman } = useAuth();
  const [tab, setTab] = useState('all'); // all | favorites | received | sent
  const [loading, setLoading] = useState(true);
  const [locationTerm, setLocationTerm] = useState('');
  const [nameTerm, setNameTerm] = useState('');
  const [specTerm, setSpecTerm] = useState('');
  const [workers, setWorkers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [receivedReqs, setReceivedReqs] = useState([]);
  const [sentReqs, setSentReqs] = useState([]);
  const [helpModal, setHelpModal] = useState({ show: false, worker: null, message: '' });
  const [responseModal, setResponseModal] = useState({ show: false, requestId: null, status: '', message: '' });
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
    category_id: 11,
    contact_phone: '',
    contact_email: '',
    expiry_days: 7,
  });
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [useProfileLocation, setUseProfileLocation] = useState(false);
  const [categories, setCategories] = useState([]);

  const favoriteSet = useMemo(() => new Set(favorites.map((w) => w.id)), [favorites]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const requests = [
        workersAPI.listWorkers({ location: locationTerm || '', name: nameTerm || '', specification: specTerm || '' })
      ];
      
      const isEmployer = !isHandyman;
      if (isEmployer) {
        requests.push(favoritesAPI.listFavoriteWorkers());
      } else {
        // Fetch help requests for worker
        requests.push(workersAPI.getReceivedHelpRequests());
        requests.push(workersAPI.getSentHelpRequests());
      }

      const results = await Promise.all(requests);
      setWorkers(results[0].data.workers || []);
      
      if (isEmployer && results[1]) {
        setFavorites(results[1].data.workers || []);
      } else if (!isEmployer) {
        setReceivedReqs(results[1]?.data?.requests || []);
        setSentReqs(results[2]?.data?.requests || []);
      }
    } catch (e) {
      console.error('Fetch workers error:', e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    try {
      await workersAPI.respondHelpRequest(responseModal.requestId, {
        status: responseModal.status,
        message: responseModal.message
      });
      toast.success(`Request ${responseModal.status}`);
      setResponseModal({ show: false, requestId: null, status: '', message: '' });
      fetchAll();
    } catch (e) {
      toast.error('Failed to respond');
    }
  };

  const handleDeleteSent = async (id) => {
    if (!window.confirm('Delete this help request?')) return;
    try {
      await workersAPI.deleteHelpRequest(id);
      toast.success('Deleted');
      fetchAll();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchAll();
    }
  };

  useEffect(() => {
    fetchAll();
    jobAPI.getCategories().then(res => {
      const cats = res.data.categories || [];
      setCategories(cats);
      const general = cats.find(c => c.name.toLowerCase().includes('general'));
      if (general) {
        setOfferForm(prev => ({ ...prev, category_id: general.id }));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const run = async () => {
      if (useProfileLocation && user?.id) {
        try {
          const response = await profileAPI.getProfile(user.id);
          setOfferForm((prev) => ({ ...prev, location: response.data.location || '' }));
        } catch (err) {}
      }
    };
    run();
  }, [useProfileLocation, user?.id]);

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
      location: '',
    }));
    setUseProfileLocation(false);
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

  const submitHelpRequest = async () => {
    if (!helpModal.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      await workersAPI.sendHelpRequest({
        worker_id: helpModal.worker.id,
        message: helpModal.message
      });
      toast.success('Help request sent!');
      setHelpModal({ show: false, worker: null, message: '' });
      fetchAll();
    } catch (e) {
      toast.error('Failed to send help request');
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
            placeholder="Search by worker specification (e.g. Plumber)..."
            value={specTerm}
            onChange={(e) => setSpecTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Search workers by location..."
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

      {isHandyman ? (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setTab('all')}>
            Browse Colleagues
          </button>
          <button className={`btn ${tab === 'received' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setTab('received')}>
            Help Requests (Received)
          </button>
          <button className={`btn ${tab === 'sent' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setTab('sent')}>
            My Requests (Sent)
          </button>
        </div>
      ) : (
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
      )}

      {loading ? (
        <div className="loading-state">Loading data...</div>
      ) : tab === 'all' || tab === 'favorites' ? (
        <>
          {(tab === 'all' ? workers : favorites).length === 0 ? (
            <div className="empty-state card">
              <p>{tab === 'favorites' ? "You haven't favorited any workers yet." : 'No workers found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {(tab === 'all' ? workers : favorites).map((w) => (
                <WorkerCard
                  key={w.id}
                  worker={w}
                  isHandyman={isHandyman}
                  isFavorite={favoriteSet.has(w.id)}
                  onToggleFavorite={toggleFavorite}
                  onOfferJob={openOffer}
                  onHelpRequest={(worker) => setHelpModal({ show: true, worker, message: '' })}
                />
              ))}
            </div>
          )}
        </>
      ) : tab === 'received' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {receivedReqs.length === 0 ? (
            <div className="empty-state card"><p>No help requests received.</p></div>
          ) : (
            receivedReqs.map(req => (
              <div key={req.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {req.sender_avatar ? <img src={req.sender_avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : req.sender_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{req.sender_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Requested: {new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${req.status === 'pending' ? 'warning' : (req.status === 'accepted' ? 'success' : 'danger')}`}>
                    {req.status}
                  </span>
                </div>
                <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 14 }}>
                  {req.message}
                </div>
                {req.response_message && (
                  <div style={{ marginTop: 12, fontSize: 13, color: '#4b5563' }}>
                    <strong>Your Response:</strong> {req.response_message}
                  </div>
                )}
                {req.status === 'pending' && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary text-xs" style={{ background: '#059669' }} onClick={() => setResponseModal({ show: true, requestId: req.id, status: 'accepted', message: '' })}>
                      Accept
                    </button>
                    <button className="btn btn-secondary text-xs" onClick={() => setResponseModal({ show: true, requestId: req.id, status: 'rejected', message: '' })}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sentReqs.length === 0 ? (
            <div className="empty-state card"><p>You haven't sent any help requests.</p></div>
          ) : (
            sentReqs.map(req => (
              <div key={req.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {req.receiver_avatar ? <img src={req.receiver_avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : req.receiver_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>Sent to: {req.receiver_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Sent: {new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge badge-${req.status === 'pending' ? 'warning' : (req.status === 'accepted' ? 'success' : 'danger')}`}>
                      {req.status}
                    </span>
                    <button className="text-red-500 hover:text-red-700" title="Delete request" onClick={() => handleDeleteSent(req.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 14 }}>
                  {req.message}
                </div>
                {req.response_message && (
                  <div style={{ marginTop: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: req.status === 'accepted' ? '#059669' : '#dc2626' }}>
                      Response from {req.receiver_name}:
                    </div>
                    <div style={{ marginTop: 4 }}>{req.response_message}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {responseModal.show && (
        <div className="modal-overlay" onClick={() => setResponseModal({ show: false, requestId: null, status: '', message: '' })}>
          <div className="card" style={{ width: 450, maxWidth: '90vw', padding: 20 }} onClick={e => e.stopPropagation()}>
            <h3 className="section-title">Response to Help Request</h3>
            <p style={{ marginBottom: 16 }}>You are <strong>{responseModal.status}</strong> this request.</p>
            <div className="form-group">
              <label className="form-label">Message (Optional)</label>
              <textarea 
                className="form-textarea w-full" 
                rows={4} 
                placeholder="Include a helpful message..."
                value={responseModal.message}
                onChange={e => setResponseModal(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary text-sm" onClick={() => setResponseModal({ show: false, requestId: null, status: '', message: '' })}>Cancel</button>
              <button className="btn btn-primary text-sm" onClick={handleRespond}>Send Response</button>
            </div>
          </div>
        </div>
      )}

      {offerModal.show && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
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

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Job Location</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={useProfileLocation}
                      onChange={(e) => setUseProfileLocation(e.target.checked)}
                    />
                    Use my profile location
                  </label>
                </div>
                <StructuredLocationField
                  value={offerForm.location}
                  onChange={(locStr) => setOfferForm((p) => ({ ...p, location: locStr }))}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Category</label>
                <div className="select-wrapper">
                  <select
                    className="form-input w-full"
                    value={offerForm.category_id}
                    onChange={(e) => setOfferForm((p) => ({ ...p, category_id: e.target.value }))}
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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

      {helpModal.show && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
          }}
          onClick={() => setHelpModal({ show: false, worker: null, message: '' })}
        >
          <div className="card" style={{ width: 500, maxWidth: '92vw', padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>
              Ask Help from {helpModal.worker?.full_name}
            </h3>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea w-full"
                rows={5}
                placeholder="Explain what kind of help you need..."
                value={helpModal.message}
                onChange={(e) => setHelpModal(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary text-sm" onClick={() => setHelpModal({ show: false, worker: null, message: '' })}>
                Cancel
              </button>
              <button className="btn btn-primary text-sm" style={{ background: '#059669' }} onClick={submitHelpRequest}>
                Send Help Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrowseWorkers;

