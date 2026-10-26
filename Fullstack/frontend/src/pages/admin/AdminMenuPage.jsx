import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export const AdminMenuPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Lunch',
    price: '',
    preparationTime: '12',
    isVeg: true,
    isPopular: false,
    calories: '',
    image: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const fetchItems = async () => {
    try {
      const res = await api.getMenu();
      if (res.success && res.items) {
        setItems(res.items);
      }
    } catch (err) {
      setFeedbackMessage(err.message || 'Could not load menu. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleAvailability = async (itemId) => {
    try {
      const res = await api.toggleAvailability(itemId);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) => (i._id === itemId ? { ...i, isAvailable: res.item.isAvailable } : i))
        );
        showFeedback(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle availability');
    }
  };

  const handleDeleteItem = async (itemId, name) => {
    if (!window.confirm(`Are you sure you want to delete '${name}' from the menu?`)) {
      return;
    }

    try {
      const res = await api.deleteMenuItem(itemId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i._id !== itemId));
        showFeedback(`'${name}' deleted successfully`);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Lunch',
      price: '',
      preparationTime: '12',
      isVeg: true,
      isPopular: false,
      calories: '',
      image: '',
      description: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      preparationTime: item.preparationTime || '12',
      isVeg: item.isVeg,
      isPopular: item.isPopular,
      calories: item.calories ?? '',
      image: item.image,
      description: item.description,
    });
    setModalOpen(true);
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        const res = await api.updateMenuItem(editingItem._id, formData);
        if (res.success) {
          setItems((prev) => prev.map((i) => (i._id === editingItem._id ? res.item : i)));
          showFeedback('Item updated successfully!');
        }
      } else {
        const res = await api.createMenuItem(formData);
        if (res.success) {
          setItems((prev) => [res.item, ...prev]);
          showFeedback('New dish added to menu successfully!');
        }
      }
      setModalOpen(false);
    } catch (err) {
      alert(err.message || 'Error saving menu item');
    } finally {
      setSaving(false);
    }
  };

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const filteredItems = items.filter((item) => {
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#3c0921' }}>
            Menu Manager
          </h1>
          <p style={{ color: '#6b635c', fontSize: '0.92rem' }}>
            Add, update, or remove dishes, adjust prices, and toggle live availability.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn btn-primary"
          style={{ borderRadius: '12px', gap: '0.4rem', boxShadow: '0 4px 12px rgba(217, 83, 47, 0.25)' }}
        >
          <Plus size={18} /> Add Menu Item
        </button>
      </div>

      {feedbackMessage && (
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
          <CheckCircle2 size={18} /> {feedbackMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#9c9288" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search food in menu..."
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: '10px',
              border: '1px solid #edcbd6',
              background: '#fbf9f5',
              outline: 'none',
              fontSize: '0.88rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: categoryFilter === cat ? '700' : '500',
                background: categoryFilter === cat ? '#b32638' : '#f7f4ed',
                color: categoryFilter === cat ? '#ffffff' : '#581832',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Table */}
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
            Loading menu items...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#fbf9f5', borderBottom: '1px solid #eee7db', color: '#6b635c', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Dish</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Price</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Dietary & Prep</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Availability</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item._id}
                    style={{ borderBottom: '1px solid #f7f4ed' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fbf9f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: '750', color: '#3c0921' }}>{item.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#6b635c', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#fff0f1',
                          color: '#b32638',
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#3c0921' }}>
                      ₹{item.price}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: item.isVeg ? '#ecfdf5' : '#fef2f2',
                            color: item.isVeg ? '#065f46' : '#991b1b',
                          }}
                        >
                          {item.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#6b635c' }}>
                          {item.preparationTime}m
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => handleToggleAvailability(item._id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          background: item.isAvailable ? '#ecfdf5' : '#fef2f2',
                          color: item.isAvailable ? '#059669' : '#dc2626',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {item.isAvailable ? '✓ In Stock' : '✗ Sold Out'}
                      </button>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: '#f7f4ed',
                            color: '#581832',
                          }}
                          title="Edit Food Details"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            color: '#dc2626',
                          }}
                          title="Delete Item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
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
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
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

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '1.25rem', color: '#3c0921' }}>
              {editingItem ? 'Edit Food Item' : 'Add New Cafeteria Dish'}
            </h3>

            <form onSubmit={handleSubmitModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Paneer Rice Bowl"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #edcbd6',
                    background: '#fbf9f5',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #edcbd6',
                      background: '#fbf9f5',
                    }}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="120"
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #edcbd6',
                      background: '#fbf9f5',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #edcbd6',
                      background: '#fbf9f5',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #edcbd6',
                      background: '#fbf9f5',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Image URL
                </label>
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #edcbd6',
                    background: '#fbf9f5',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fresh ingredients, gravy details, spice level..."
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1px solid #edcbd6',
                    background: '#fbf9f5',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', margin: '0.25rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isVeg}
                    onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                    style={{ accentColor: '#16a34a' }}
                  />
                  <span>Pure Vegetarian (Veg)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    style={{ accentColor: '#b32638' }}
                  />
                  <span>Bestseller / Popular Dish</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ borderRadius: '12px', padding: '0.8rem', marginTop: '0.5rem' }}
              >
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Cafeteria Menu'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
