/**
 * Profile Page
 *
 * 用户资料页面
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/ui/BottomNav';

// =============================================================================
// Profile Page
// =============================================================================

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户信息
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  // 登出
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  const household = user?.user_metadata?.household as {
    adults_count?: number;
    kids_count?: number;
    has_kids?: boolean;
    max_cookware?: number;
  } | undefined;

  return (
    <div className="page-with-nav profile-page">
      <style jsx>{`
        .profile-page {
          background: var(--color-background);
        }

        .profile-header {
          padding: var(--spacing-xl);
          padding-top: calc(var(--spacing-xl) + var(--safe-area-inset-top));
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
          text-align: center;
        }

        .avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto var(--spacing-md);
        }

        .user-email {
          font-size: 1rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .profile-content {
          padding: var(--spacing-md);
        }

        .section {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
          overflow: hidden;
        }

        .section-title {
          padding: var(--spacing-md);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--color-border-light);
        }

        .section-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .section-item:last-child {
          border-bottom: none;
        }

        .item-label {
          color: var(--color-text-primary);
        }

        .item-value {
          color: var(--color-text-secondary);
        }

        .section-item.clickable {
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .section-item.clickable:hover {
          background: var(--color-border-light);
        }

        .section-item.danger {
          color: var(--color-error);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-2xl);
        }

        .app-info {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--color-text-tertiary);
          font-size: 0.75rem;
        }
      `}</style>

      <header className="profile-header">
        <div className="avatar">👤</div>
        {loading ? (
          <p className="user-email">Loading...</p>
        ) : (
          <p className="user-email">{user?.email || 'Guest'}</p>
        )}
      </header>

      <main className="profile-content">
        {/* 家庭设置 */}
        <section className="section">
          <h2 className="section-title">Household</h2>
          <div className="section-item">
            <span className="item-label">Adults</span>
            <span className="item-value">{household?.adults_count || 2}</span>
          </div>
          <div className="section-item">
            <span className="item-label">Kids</span>
            <span className="item-value">
              {household?.has_kids ? household.kids_count || 0 : 'None'}
            </span>
          </div>
          <div className="section-item">
            <span className="item-label">Max cookware at once</span>
            <span className="item-value">{household?.max_cookware || 2}</span>
          </div>
          <div 
            className="section-item clickable"
            onClick={() => router.push('/onboarding')}
          >
            <span className="item-label">Update preferences</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </section>

        {/* 应用设置 */}
        <section className="section">
          <h2 className="section-title">App Settings</h2>
          <div className="section-item">
            <span className="item-label">Units</span>
            <span className="item-value">US (°F, cups, oz)</span>
          </div>
          <div className="section-item">
            <span className="item-label">Language</span>
            <span className="item-value">English</span>
          </div>
          <div className="section-item">
            <span className="item-label">Notifications</span>
            <span className="item-value">On</span>
          </div>
        </section>

        {/* 账户 */}
        <section className="section">
          <h2 className="section-title">Account</h2>
          <div 
            className="section-item clickable"
            onClick={handleSignOut}
          >
            <span className="item-label" style={{ color: 'var(--color-error)' }}>Sign Out</span>
          </div>
        </section>

        <div className="app-info">
          <p>Weeknight v1.0.0</p>
          <p>Your dinner planning copilot</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

