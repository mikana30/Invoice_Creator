import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function ClientManager() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', street: '', street2: '', city: '', state: '', zip: '', phone: '', email: ''
  });
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load clients' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate name before submission
    if (!form.name || !form.name.trim()) {
      setMessage({ type: 'error', text: 'Client name is required' });
      return;
    }

    try {
      if (editingId) {
        await api.updateClient(editingId, form);
        setMessage({ type: 'success', text: 'Client updated successfully' });
      } else {
        await api.createClient(form);
        setMessage({ type: 'success', text: 'Client created successfully' });
      }
      setForm({ name: '', street: '', street2: '', city: '', state: '', zip: '', phone: '', email: '' });
      setEditingId(null);
      loadClients();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save client' });
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setForm({
      name: client.name || '',
      street: client.street || '',
      street2: client.street2 || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || '',
      phone: client.phone || '',
      email: client.email || '',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await api.deleteClient(id);
      setMessage({ type: 'success', text: 'Client deleted successfully' });
      loadClients();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete client' });
    }
  };

  // Filter clients by search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const search = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search) ||
      client.city?.toLowerCase().includes(search)
    );
  }, [clients, searchTerm]);

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', street: '', street2: '', city: '', state: '', zip: '', phone: '', email: '' });
  };

  const formatAddress = (client) => {
    const parts = [];
    if (client.street) parts.push(client.street);
    if (client.street2) parts.push(client.street2);
    if (client.city || client.state || client.zip) {
      parts.push([client.city, client.state, client.zip].filter(Boolean).join(', '));
    }
    return parts.join(', ') || '-';
  };

  if (loading) return <div className="loading">Loading clients...</div>;

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="card">
        <h2>{editingId ? 'Edit Client' : 'Add New Client'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="form-group">
            <label>Street Address 2 (optional)</label>
            <input
              type="text"
              value={form.street2}
              onChange={(e) => setForm({ ...form, street2: e.target.value })}
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>ZIP</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="ZIP"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Client' : 'Add Client'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Clients</h2>
        {clients.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search clients by name, email, phone, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            {searchTerm && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                Showing {filteredClients.length} of {clients.length} clients
              </div>
            )}
          </div>
        )}
        {clients.length === 0 ? (
          <div className="empty-state">
            <p>No clients yet. Add your first client above.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <p>No clients match your search.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{formatAddress(client)}</td>
                  <td>{client.phone || '-'}</td>
                  <td>{client.email || '-'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(client)}
                    >
                      Edit
                    </button>{' '}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(client.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
