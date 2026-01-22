/**
 * Invoice Creator - API Client
 * Copyright (c) 2025 Blue Line Scannables. All rights reserved.
 * Proprietary and confidential.
 */

// API base URL - backend always runs on port 3001
const API_BASE = 'http://localhost:3001';

export const api = {
  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  // Clients
  async getClients() {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error('Failed to load clients');
    return res.json();
  },

  async searchClients(query) {
    const res = await fetch(`${API_BASE}/clients/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search clients');
    return res.json();
  },

  async createClient(client) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) {
      try {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create client');
      } catch (parseError) {
        throw new Error('Failed to create client - server error');
      }
    }
    return res.json();
  },

  async updateClient(id, client) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update client');
    }
    return res.json();
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to delete client');
    }
    return res.json();
  },

  // Items
  async getItems() {
    const res = await fetch(`${API_BASE}/items`);
    return res.json();
  },

  async searchItems(query) {
    const res = await fetch(`${API_BASE}/items/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async createItem(item) {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create item');
    }
    return res.json();
  },

  async updateItem(id, item) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res.json();
  },

  async deleteItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to delete item');
    }
    return res.json();
  },

  async toggleItemActive(id, active) {
    const res = await fetch(`${API_BASE}/items/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update item status');
    }
    return res.json();
  },

  // Item Components (unified - items can contain other items)
  async getItemComponents(itemId) {
    const res = await fetch(`${API_BASE}/items/${itemId}/components`);
    if (!res.ok) {
      throw new Error('Failed to load components');
    }
    return res.json();
  },

  async updateItemComponents(itemId, components) {
    const res = await fetch(`${API_BASE}/items/${itemId}/components`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update components');
    }
    return res.json();
  },

  // Quick create a component item (for inline creation in dropdowns)
  async createQuickComponent(component) {
    const res = await fetch(`${API_BASE}/items/quick-component`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(component),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create component');
    }
    return res.json();
  },

  // Invoices
  async getInvoices() {
    const res = await fetch(`${API_BASE}/invoices`);
    return res.json();
  },

  async getInvoice(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}`);
    return res.json();
  },

  async createInvoice(invoice) {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create invoice');
    }
    return res.json();
  },

  async updateInvoice(id, invoice) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update invoice');
    }
    return res.json();
  },

  async deleteInvoice(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to delete invoice');
    }
    return res.json();
  },

  async updateInvoicePayment(id, { paymentStatus, amountPaid }) {
    const res = await fetch(`${API_BASE}/invoices/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus, amountPaid }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update payment');
    }
    return res.json();
  },

  async voidInvoice(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}/void`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to void invoice');
    }
    return res.json();
  },

  // Full data restore
  async restoreData(backup) {
    const res = await fetch(`${API_BASE}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to restore data');
    }
    return res.json();
  },
};
