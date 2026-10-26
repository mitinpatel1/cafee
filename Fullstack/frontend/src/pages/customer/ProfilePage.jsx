import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try { await updateProfile({ name: name.trim(), phone: phone.trim() }); setMessage('Your profile has been updated.'); }
    catch (err) { setError(err.message || 'Could not save your profile.'); }
    finally { setSaving(false); }
  };
  return <div className="portal-auth-wrap"><div className="portal-auth-card" style={{maxWidth:540}}>
    <h1>My profile</h1><p>Manage your customer account details.</p>
    {error && <div className="portal-error" role="alert">{error}</div>}
    {message && <div className="site-notice" role="status">{message}</div>}
    <form className="portal-form" onSubmit={submit}>
      <label>Name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Email<input disabled value={user?.email || ''} type="email"/></label>
      <label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" autoComplete="tel"/></label>
      <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  </div></div>;
};
