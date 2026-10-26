import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, ShieldCheck, Store, UserRound } from 'lucide-react';

export const LoginPage = ({ portal = 'user' }) => {
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const settings = {
    user: { title: isRegister ? 'Create your account' : 'Customer login', icon: UserRound, redirect: '/', label: 'Customer' },
    franchise: { title: 'Franchise owner login', icon: Store, redirect: '/franchise/dashboard', label: 'Franchise Owner' },
    admin: { title: 'Service administration', icon: ShieldCheck, redirect: '/admin/dashboard', label: 'Administrator' },
  };
  const config = settings[portal];
  const Icon = config.icon;
  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const account = isRegister && portal === 'user'
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login(email.trim(), password);
      const role = account?.role;
      const valid = portal === 'user' ? ['user', 'employee'].includes(role) : role === portal;
      if (!valid) {
        logout();
        setError(`This login is for ${config.label.toLowerCase()} accounts only.`);
        return;
      }
      navigate(config.redirect, { replace: true });
    } catch (err) { setError(err.message || 'Could not sign in.'); }
    finally { setLoading(false); }
  };
  return <div className="portal-auth-wrap">
    <div className="portal-auth-card">
      <div className="portal-auth-icon"><Icon size={26}/></div>
      <h1>{config.title}</h1>
      <p>Sign in securely to your {config.label.toLowerCase()} account.</p>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <form onSubmit={submit} className="portal-form">
        {isRegister && portal === 'user' && <label>Full name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"/></label>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>Password<input required type="password" minLength={isRegister ? 8 : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></label>
        <button disabled={loading} className="btn btn-primary" type="submit">{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></button>
      </form>
      {portal === 'user' && <p className="portal-auth-foot">{isRegister ? 'Already have an account?' : 'New customer?'} <button type="button" onClick={() => { setIsRegister(v => !v); setError(''); }}>{isRegister ? 'Sign in' : 'Create an account'}</button></p>}
      {portal === 'franchise' && <p className="portal-auth-foot">New franchise? <Link to="/franchise/register">Register your franchise</Link></p>}
      <Link className="portal-back" to="/">Return to customer website</Link>
    </div>
  </div>;
};
