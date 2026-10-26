import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Building,
  IdCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Heart,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage = () => {
  const { user, rechargeWallet, updateProfile } = useAuth();

  const [rechargeAmount, setRechargeAmount] = useState(500);
  const [loadingRecharge, setLoadingRecharge] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState('');
  const [error, setError] = useState('');

  // Editable preferences
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [dietary, setDietary] = useState(user?.dietaryPreferences || ['Vegetarian']);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const dietaryOptions = [
    'Vegetarian',
    'High Protein',
    'Jain Friendly',
    'Low Calorie',
    'Gluten Free',
    'Dairy Free',
  ];

  const handleToggleDietary = (pref) => {
    if (dietary.includes(pref)) {
      setDietary(dietary.filter((d) => d !== pref));
    } else {
      setDietary([...dietary, pref]);
    }
  };

  const handleRecharge = async (amt) => {
    const val = amt || rechargeAmount;
    if (!val || val <= 0) return;

    setError('');
    setLoadingRecharge(true);
    try {
      await rechargeWallet(val);
      setRechargeSuccess(`₹${val} credited to your cafeteria wallet!`);
      setTimeout(() => setRechargeSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Recharge failed');
    } finally {
      setLoadingRecharge(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      await updateProfile({
        department,
        dietaryPreferences: dietary,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-width-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1e1915' }}>
          Employee Profile & Cafeteria Card
        </h1>
        <p style={{ color: '#6b635c', fontSize: '0.95rem' }}>
          Manage your cafeteria wallet balance, corporate department details, and dietary preferences.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {rechargeSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={18} /> {rechargeSuccess}
        </div>
      )}

      {profileSaved && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={18} /> Preferences updated successfully!
        </div>
      )}

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Cafeteria Wallet Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Smart Card Visual */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e1915 0%, #2b231d 60%, #3e332a 100%)',
              borderRadius: '20px',
              padding: '2rem',
              color: '#ffffff',
              boxShadow: '0 16px 32px rgba(43, 35, 29, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #4a3d34',
            }}
          >
            {/* Background glowing sphere decoration */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(217, 83, 47, 0.4) 0%, transparent 70%)',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: '#e59838', textTransform: 'uppercase', fontWeight: '700' }}>
                  CORPORATE SMART MEAL CARD
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: '800', marginTop: '2px' }}>
                  Office<span style={{ color: '#d9532f' }}>Bite</span>
                </div>
              </div>

              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={20} color="#e59838" />
              </div>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#b2a79b', textTransform: 'uppercase' }}>
                AVAILABLE MEAL ALLOWANCE
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                ₹{user?.balance || 0}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #3e332a', paddingTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9c9288', textTransform: 'uppercase' }}>CARD HOLDER</div>
                <div style={{ fontWeight: '750', fontSize: '0.95rem' }}>{user?.name || 'Employee'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#9c9288', textTransform: 'uppercase' }}>EMP ID</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#e0d5c3' }}>
                  {user?.employeeId || 'EMP-4012'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Recharge Box */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Plus size={18} color="#d9532f" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                Recharge Cafeteria Wallet
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6b635c', marginBottom: '1.25rem' }}>
              Add meal credits using your corporate allowance or instant UPI:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              {[200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleRecharge(amt)}
                  disabled={loadingRecharge}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                    color: '#2b231d',
                    fontWeight: '750',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d9532f';
                    e.currentTarget.style.color = '#d9532f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0d5c3';
                    e.currentTarget.style.color = '#2b231d';
                  }}
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                min="50"
                step="50"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value))}
                placeholder="Custom Amount (₹)"
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #e0d5c3',
                  background: '#fbf9f5',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => handleRecharge()}
                disabled={loadingRecharge}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: '10px', padding: '0.65rem 1.25rem' }}
              >
                {loadingRecharge ? 'Recharging...' : 'Recharge'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Employee Profile Details & Dietary Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              background: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem', color: '#1e1915' }}>
              Employee Information
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.35rem' }}>
                  FULL NAME
                </label>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#f7f4ed',
                    border: '1px solid #eee7db',
                    fontWeight: '700',
                    color: '#1e1915',
                  }}
                >
                  {user?.name}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.35rem' }}>
                  CORPORATE EMAIL
                </label>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#f7f4ed',
                    border: '1px solid #eee7db',
                    color: '#6b635c',
                  }}
                >
                  {user?.email}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.35rem' }}>
                    EMPLOYEE ID
                  </label>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: '#f7f4ed',
                      border: '1px solid #eee7db',
                      fontWeight: '700',
                    }}
                  >
                    {user?.employeeId || 'EMP-4012'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.35rem' }}>
                    ROLE
                  </label>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: '#fff2ee',
                      border: '1px solid #fbd9cf',
                      color: '#d9532f',
                      fontWeight: '700',
                      textTransform: 'capitalize',
                    }}
                  >
                    {user?.role || 'Employee'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.35rem' }}>
                  DEPARTMENT
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                    color: '#1e1915',
                    fontSize: '0.92rem',
                  }}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                  <option value="Operations & Logistics">Operations & Logistics</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance & Legal">Finance & Legal</option>
                </select>
              </div>

              {/* Dietary Preferences Chips */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#6b635c', marginBottom: '0.5rem' }}>
                  DIETARY TAGS & ALLERGY PREFERENCES
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {dietaryOptions.map((opt) => {
                    const isSelected = dietary.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => handleToggleDietary(opt)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '9999px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          border: isSelected ? '1px solid #d9532f' : '1px solid #e0d5c3',
                          background: isSelected ? '#fff2ee' : '#fbf9f5',
                          color: isSelected ? '#d9532f' : '#2b231d',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary"
                style={{
                  borderRadius: '12px',
                  padding: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                {savingProfile ? 'Saving...' : 'Update Preferences'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
