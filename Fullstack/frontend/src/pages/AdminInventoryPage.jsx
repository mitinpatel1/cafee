import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
  Boxes,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

export const AdminInventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    ingredientName: '',
    quantity: '10',
    unit: 'kg',
    reorderLevel: '5',
    category: 'Dairy',
    supplier: 'Local Fresh Supplier',
  });
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await api.getInventory();
      if (res.success && res.items) {
        setItems(res.items);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockAdjust = async (id, delta) => {
    try {
      const res = await api.updateStock(id, { adjustment: delta });
      if (res.success) {
        setItems((prev) => prev.map((item) => (item._id === id ? res.item : item)));
        showFeedback(`Stock updated for ${res.item.ingredientName}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createIngredient(newIngredient);
      if (res.success) {
        setItems((prev) => [res.item, ...prev]);
        setModalOpen(false);
        showFeedback(`Added ${res.item.ingredientName} to inventory!`);
        setNewIngredient({
          ingredientName: '',
          quantity: '10',
          unit: 'kg',
          reorderLevel: '5',
          category: 'Dairy',
          supplier: 'Local Fresh Supplier',
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to add ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete '${name}' from inventory?`)) return;
    try {
      const res = await api.deleteIngredient(id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i._id !== id));
        showFeedback(`Deleted ${name}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const filteredItems = items.filter((i) =>
    i.ingredientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = items.filter((i) => i.quantity <= i.reorderLevel).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e1915' }}>
            Cafeteria Inventory & Ingredients
          </h1>
          <p style={{ color: '#6b635c', fontSize: '0.92rem' }}>
            Track pantry stock, set automatic low-stock reorder thresholds, and replenish ingredients.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          style={{ borderRadius: '12px', gap: '0.4rem', boxShadow: '0 4px 12px rgba(217, 83, 47, 0.25)' }}
        >
          <Plus size={18} /> Add New Ingredient
        </button>
      </div>

      {feedback && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={18} /> {feedback}
        </div>
      )}

      {/* Low stock summary alert */}
      {lowStockCount > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <AlertTriangle size={22} color="#d97706" />
          <div style={{ fontSize: '0.9rem' }}>
            <strong>{lowStockCount} ingredient(s)</strong> are below their designated minimum threshold level. Reorder from vendors soon to avoid kitchen dish shortages.
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} color="#9c9288" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredient (e.g. Paneer, Rice, Coffee)..."
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: '10px',
              border: '1px solid #e0d5c3',
              background: '#fbf9f5',
              outline: 'none',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #eee7db',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b635c' }}>
            Loading stock inventory...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#fbf9f5', borderBottom: '1px solid #eee7db', color: '#6b635c', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Ingredient</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Current Stock</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Reorder Level</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Stock Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Quick Restock / Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLow = item.quantity <= item.reorderLevel;
                  return (
                    <tr
                      key={item._id}
                      style={{ borderBottom: '1px solid #f7f4ed' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fbf9f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '750', color: '#1e1915' }}>
                        {item.ingredientName}
                        <div style={{ fontSize: '0.75rem', color: '#6b635c', fontWeight: '400' }}>
                          Supplier: {item.supplier || 'Pantry Depot'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1rem', color: '#6b635c' }}>
                        {item.category || 'Pantry'}
                      </td>

                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.05rem', color: isLow ? '#dc2626' : '#1e1915' }}>
                          {item.quantity}
                        </span>{' '}
                        <span style={{ fontSize: '0.8rem', color: '#6b635c' }}>{item.unit}</span>
                      </td>

                      <td style={{ padding: '1rem 1rem', color: '#6b635c' }}>
                        {item.reorderLevel} {item.unit}
                      </td>

                      <td style={{ padding: '1rem 1rem' }}>
                        {isLow ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <AlertTriangle size={12} /> Low Stock Warning
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                            }}
                          >
                            ✓ In Sufficient Stock
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleStockAdjust(item._id, 5)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            title="Add 5 units"
                          >
                            +5 {item.unit}
                          </button>
                          <button
                            onClick={() => handleStockAdjust(item._id, 10)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            title="Add 10 units"
                          >
                            +10 {item.unit}
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, item.ingredientName)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#dc2626',
                            }}
                            title="Remove Ingredient"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              borderRadius: '20px',
              background: '#ffffff',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', color: '#6b635c', padding: '4px' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              Add Ingredient to Stock
            </h3>

            <form onSubmit={handleAddIngredient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Ingredient Name
                </label>
                <input
                  type="text"
                  required
                  value={newIngredient.ingredientName}
                  onChange={(e) => setNewIngredient({ ...newIngredient, ingredientName: e.target.value })}
                  placeholder="e.g. Mozzarella Cheese"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={newIngredient.quantity}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #e0d5c3',
                      background: '#fbf9f5',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Unit
                  </label>
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #e0d5c3',
                      background: '#fbf9f5',
                    }}
                  >
                    <option value="kg">kg</option>
                    <option value="litres">litres</option>
                    <option value="packets">packets</option>
                    <option value="units">units</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newIngredient.reorderLevel}
                    onChange={(e) => setNewIngredient({ ...newIngredient, reorderLevel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #e0d5c3',
                      background: '#fbf9f5',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={newIngredient.category}
                    onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #e0d5c3',
                      background: '#fbf9f5',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  value={newIngredient.supplier}
                  onChange={(e) => setNewIngredient({ ...newIngredient, supplier: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ borderRadius: '12px', padding: '0.8rem', marginTop: '0.5rem' }}
              >
                {saving ? 'Saving...' : 'Add to Stock Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
