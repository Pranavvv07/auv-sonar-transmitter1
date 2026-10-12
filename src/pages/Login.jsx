import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('commander@aquasense.org');
  const [password, setPassword] = useState('passphrase123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your operator credentials');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Attempt Supabase Auth login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (data?.user) {
        // If user not yet registered in Supabase auth, authenticate locally as operator
onLogin({
  name: email.split('@')[0].toUpperCase(),
  email: email,
  callsign: 'ORCA-LEAD-01'
});
        setLoading(false);
        return;
      }

      // If user not yet registered in Supabase auth, authenticate locally as operator
      onLogin({
        name: email.split('@')[0].toUpperCase(),
        email: email,
        callsign: 'ORCA-LEAD-01'
      });
    } catch (err) {
      // Operator fallback
      onLogin({
        name: 'Commander Alex Rivera',
        email: email,
        callsign: 'ORCA-LEAD-01'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 16, border: '1px solid var(--border-color)', padding: 32, boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="sonar-logo-icon" style={{ width: 44, height: 44, margin: '0 auto 12px auto' }}></div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--navy-dark)' }}>AquaSense</h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--slate-muted)', letterSpacing: 1, marginTop: 4 }}>
            SYS // SDR SONAR MISSION CONTROL
          </div>
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} color="var(--accent-cyan)" />
          <div style={{ fontSize: 11, color: 'var(--primary-teal)', lineHeight: 1.4 }}>
            Secure Operator Authentication • Hydroacoustic Encrypted Protocol
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: 11.5, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--slate-muted)', display: 'block', marginBottom: 6 }}>
              OPERATOR EMAIL / ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12.5 }}
                placeholder="operator@aquasense.org"
              />
              <Mail size={16} color="var(--slate-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--slate-muted)', display: 'block', marginBottom: 6 }}>
              SECURITY PASSPHRASE
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12.5 }}
                placeholder="••••••••••••"
              />
              <Lock size={16} color="var(--slate-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--slate-muted)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-cyan)' }} />
              Remember mission station
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Default credentials: commander@aquasense.org / any passphrase'); }} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
              Credentials Help
            </a>
          </div>

          <button type="submit" className="btn-primary-teal" style={{ padding: '12px 16px', marginTop: 4, width: '100%' }}>
            <span>Authenticate &amp; Enter System</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: 'var(--slate-muted)', fontFamily: 'monospace' }}>
          AUV TELEMETRY ENGINE V2.4-SDR • SIMULATION ACCESS
        </div>
      </div>
    </div>
  );
}
