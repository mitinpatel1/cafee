import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, Shield, User, ChefHat, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login, register, quickLoginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState('employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ name, email, password, department, role });
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleType) => {
    setError('');
    setLoading(true);
    try {
      const loggedUser = await quickLoginAs(roleType);
      if (roleType === 'admin' || roleType === 'staff') {
        navigate('/admin');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card-elevated"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem 2rem',
          borderRadius: '20px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #d9532f 0%, #bf3f1d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 1rem',
              boxShadow: '0 6px 16px rgba(217, 83, 47, 0.3)',
            }}
          >
            <UtensilsCrossed size={28} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.35rem' }}>
            {isRegister ? 'Create Cafeteria Account' : 'Welcome to OfficeBite'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#6b635c' }}>
            {isRegister
              ? 'Join your corporate cafeteria meal service'
              : 'Sign in to order fresh meals or manage cafeteria'}
          </p>
        </div>

        {/* Quick Demo Login Switcher */}
        <div
          style={{
            background: '#f7f4ed',
            border: '1px solid #eee7db',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#6b635c',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.65rem',
              textAlign: 'center',
            }}
          >
            ⚡ 1-Click Demo Profiles
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('employee')}
              disabled={loading}
              style={{
                background: '#ffffff',
                border: '1px solid #e0d5c3',
                borderRadius: '10px',
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#2b231d',
                cursor: 'pointer',
              }}
            >
              <User size={16} color="#d9532f" />
              <span>Employee</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('staff')}
              disabled={loading}
              style={{
                background: '#ffffff',
                border: '1px solid #e0d5c3',
                borderRadius: '10px',
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#2b231d',
                cursor: 'pointer',
              }}
            >
              <ChefHat size={16} color="#ea580c" />
              <span>Kitchen</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
              style={{
                background: '#ffffff',
                border: '1px solid #e0d5c3',
                borderRadius: '10px',
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#2b231d',
                cursor: 'pointer',
              }}
            >
              <Shield size={16} color="#059669" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1e1915' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #e0d5c3',
                  outline: 'none',
                  background: '#fbf9f5',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1e1915' }}>
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@officebite.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e0d5c3',
                outline: 'none',
                background: '#fbf9f5',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1e1915' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e0d5c3',
                outline: 'none',
                background: '#fbf9f5',
              }}
            />
          </div>

          {isRegister && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1e1915' }}>
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                  }}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1e1915' }}>
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #e0d5c3',
                    background: '#fbf9f5',
                  }}
                >
                  <option value="employee">Employee</option>
                  <option value="staff">Kitchen Staff</option>
                  <option value="admin">Admin Manager</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              fontSize: '1rem',
              marginTop: '0.5rem',
            }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In to OfficeBite'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Toggle Register/Login */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: '#6b635c' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              color: '#d9532f',
              fontWeight: '700',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            {isRegister ? 'Sign In here' : 'Register now'}
          </button>
        </div>
      </div>
    </div>
  );
};
