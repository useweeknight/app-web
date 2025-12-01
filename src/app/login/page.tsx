/**
 * Login Page
 *
 * Supabase Auth: Apple / Google / Email
 */
'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type AuthMode = 'signin' | 'signup' | 'magic-link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 检查 URL 参数中的错误，用于初始化状态
  const initialError = useMemo(() => {
    const errorParam = searchParams.get('error');
    return errorParam === 'auth_failed' ? 'Sign in failed. Please try again.' : null;
  }, [searchParams]);
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [message, setMessage] = useState<string | null>(null);

  // OAuth 登录（Apple / Google）
  const handleOAuth = async (provider: 'apple' | 'google') => {
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  // Email/Password 登录/注册
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'magic-link') {
      // Magic Link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the magic link!');
      }
    } else if (mode === 'signin') {
      // Email/Password Sign In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/tonight');
      }
    } else {
      // Sign Up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account!');
      }
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <style jsx>{`
        .login-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          background: linear-gradient(
            135deg,
            var(--color-background) 0%,
            var(--color-surface) 100%
          );
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
          animation: slideUp var(--transition-slow) ease-out;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .login-logo {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .login-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .oauth-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
        }

        .oauth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .oauth-btn:hover {
          background: var(--color-border-light);
        }

        .oauth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .oauth-btn svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          color: var(--color-text-tertiary);
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }

        .email-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .mode-toggle {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .mode-btn {
          flex: 1;
          padding: var(--spacing-sm);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--color-text-tertiary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mode-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .error-message {
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgb(239 68 68 / 0.1);
          color: var(--color-error);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .success-message {
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgb(34 197 94 / 0.1);
          color: var(--color-success);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }
      `}</style>

      <div className="login-card">
        <header className="login-header">
          <div className="login-logo">🍳</div>
          <h1 className="login-title">Welcome to Weeknight</h1>
          <p className="login-subtitle">Your dinner planning copilot</p>
        </header>

        {/* OAuth Buttons */}
        <div className="oauth-buttons">
          <button
            className="oauth-btn"
            onClick={() => handleOAuth('apple')}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.22-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          <button
            className="oauth-btn"
            onClick={() => handleOAuth('google')}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="divider">or</div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
          <button
            className={`mode-btn ${mode === 'magic-link' ? 'active' : ''}`}
            onClick={() => setMode('magic-link')}
          >
            Magic Link
          </button>
        </div>

        {/* Email Form */}
        <form className="email-form" onSubmit={handleEmailAuth}>
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {mode !== 'magic-link' && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}

          <Button type="submit" loading={loading} fullWidth>
            {mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Magic Link'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-background)'
      }}>
        <p>Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

