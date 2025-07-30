import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [bmacLink, setBmacLink] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    fetchProfile();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/admin/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(res.data);
    } catch (err) {
      alert('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const admin = await axios.get('/api/admin/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBmacLink(admin.data.bmacLink || '');
    } catch (err) {
      // No need to alert — just let them set it
    }
  };

  const setQuote = async (id, price) => {
    if (!price || isNaN(price) || price <= 0) return alert('Enter a valid price');
    try {
      await axios.put(
        `/api/admin/requests/${id}/quote`,
        { price: parseFloat(price) },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setRequests(r => r.map(req => req._id === id ? { ...req, price, status: 'quoted', bmacLink } : req));
      alert('Quoted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to quote');
    }
  };

  const saveBmcLink = async () => {
    if (!bmacLink.startsWith('https://buymeacoffee.com/')) {
      return alert('Must be a valid BuyMeACoffee link');
    }
    try {
      await axios.put(
        '/api/admin/profile',
        { bmacLink },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      alert('BuyMeACoffee link saved!');
    } catch (err) {
      alert('Save failed');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Admin Panel</h2>

      {/* BMC Link Setup */}
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 mb-8">
        <h3 className="text-lg font-semibold mb-2">Your BuyMeACoffee Link</h3>
        <p className="text-sm text-gray-600 mb-3">
          This link will be automatically added to every quote you send.
        </p>
        <input
          type="url"
          placeholder="https://buymeacoffee.com/yourname"
          value={bmacLink}
          onChange={e => setBmacLink(e.target.value)}
          className="w-full p-3 border rounded mb-3"
        />
        <button onClick={saveBmcLink} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded font-medium transition">
          Save Link
        </button>
      </div>

      {/* Requests */}
      <h3 className="text-xl font-semibold mb-4">Client Requests</h3>
      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">No requests yet.</p>
      ) : (
        <div className="space-y-6">
          {requests.map(req => (
            <div key={req._id} className="border rounded-lg p-5 bg-white shadow-sm">
              <div className="flex flex-wrap gap-2 justify-between mb-3">
                <h4 className="font-bold text-lg">{req.type}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  req.status === 'quoted' ? 'bg-green-100 text-green-800' :
                  req.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {req.status}
                </span>
              </div>

              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{req.description}</p>

              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Budget:</strong> ${req.budget || 'Not specified'}</p>
                <p><strong>User:</strong> {req.userEmail}</p>
                {req.price && <p><strong>Quoted:</strong> ${req.price}</p>}
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    placeholder="Set price"
                    className="p-2 border rounded w-32"
                    onChange={e => setQuote(req._id, e.target.value)}
                  />
                  <span className="text-gray-500 text-sm">→ Auto-adds your BMC link</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
