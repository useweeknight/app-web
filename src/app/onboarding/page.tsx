/**
 * Onboarding / Cold Start Flow
 *
 * 冷启动流程：
 * Step 1: 家庭人数、是否有儿童、锅具上限
 * Step 2: 12 张原型滑卡（左滑❌、右滑✅，可跳过）
 * Step 3: 饭后 emoji（😋/😐/🙅）+ "孩子不爱"标记
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

// =============================================================================
// Types
// =============================================================================

interface HouseholdSettings {
  adultsCount: number;
  kidsCount: number;
  hasKids: boolean;
  maxCookware: number;
}

interface SwipeCard {
  id: string;
  title: string;
  image: string;
  category: string;
}

type OnboardingStep = 1 | 2 | 3;

// =============================================================================
// Mock Data
// =============================================================================

const SWIPE_CARDS: SwipeCard[] = [
  { id: '1', title: 'Pasta Carbonara', image: '🍝', category: 'Italian' },
  { id: '2', title: 'Chicken Stir Fry', image: '🥘', category: 'Asian' },
  { id: '3', title: 'Tacos', image: '🌮', category: 'Mexican' },
  { id: '4', title: 'Salmon & Rice', image: '🍣', category: 'Healthy' },
  { id: '5', title: 'Burgers', image: '🍔', category: 'American' },
  { id: '6', title: 'Pizza', image: '🍕', category: 'Italian' },
  { id: '7', title: 'Curry', image: '🍛', category: 'Indian' },
  { id: '8', title: 'Salad Bowl', image: '🥗', category: 'Healthy' },
  { id: '9', title: 'Soup', image: '🍲', category: 'Comfort' },
  { id: '10', title: 'Sandwich', image: '🥪', category: 'Quick' },
  { id: '11', title: 'Fried Rice', image: '🍚', category: 'Asian' },
  { id: '12', title: 'Grilled Chicken', image: '🍗', category: 'Protein' },
];

// =============================================================================
// Component
// =============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Household settings
  const [household, setHousehold] = useState<HouseholdSettings>({
    adultsCount: 2,
    kidsCount: 0,
    hasKids: false,
    maxCookware: 2,
  });

  // Step 2: Swipe cards
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [dislikes, setDislikes] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Step 3: Emoji feedback - 跳过此步骤（MVP）

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleStep1Next = useCallback(() => {
    setStep(2);
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const card = SWIPE_CARDS[currentCardIndex];
    setSwipeDirection(direction);

    setTimeout(() => {
      if (direction === 'right') {
        setLikes(prev => new Set(prev).add(card.id));
      } else {
        setDislikes(prev => new Set(prev).add(card.id));
      }

      setSwipeDirection(null);

      if (currentCardIndex < SWIPE_CARDS.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // 完成滑卡
        setStep(3);
      }
    }, 200);
  }, [currentCardIndex]);

  const handleSkipCards = useCallback(() => {
    setStep(3);
  }, []);

  const handleComplete = useCallback(async () => {
    setLoading(true);

    try {
      // 保存用户偏好到数据库
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 更新 user metadata 标记 onboarding 完成
        await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,
            household: {
              adults_count: household.adultsCount,
              kids_count: household.kidsCount,
              has_kids: household.hasKids,
              max_cookware: household.maxCookware,
            },
            preferences: {
              liked_categories: Array.from(likes),
              disliked_categories: Array.from(dislikes),
            }
          }
        });
      }

      // 跳转到 Tonight 页面
      router.push('/tonight');
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // 即使失败也跳转
      router.push('/tonight');
    } finally {
      setLoading(false);
    }
  }, [supabase, household, likes, dislikes, router]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="onboarding-page">
      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
        }

        .onboarding-header {
          padding: var(--spacing-lg);
          padding-top: calc(var(--spacing-lg) + var(--safe-area-inset-top));
          text-align: center;
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-border);
          transition: all var(--transition-fast);
        }

        .step-dot.active {
          width: 24px;
          border-radius: 4px;
          background: var(--color-primary);
        }

        .step-dot.completed {
          background: var(--color-success);
        }

        .onboarding-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .onboarding-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .onboarding-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: var(--spacing-lg);
          overflow: hidden;
        }

        .onboarding-footer {
          padding: var(--spacing-lg);
          padding-bottom: calc(var(--spacing-lg) + var(--safe-area-inset-bottom));
        }

        /* Step 1: Household Settings */
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .setting-label {
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .setting-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .counter-control {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .counter-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .counter-btn:hover:not(:disabled) {
          background: var(--color-border-light);
        }

        .counter-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .counter-value {
          font-size: 1.5rem;
          font-weight: 600;
          min-width: 40px;
          text-align: center;
        }

        .toggle-control {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .toggle-btn {
          position: relative;
          width: 52px;
          height: 32px;
          background: var(--color-border);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .toggle-btn.active {
          background: var(--color-primary);
        }

        .toggle-btn::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .toggle-btn.active::after {
          left: 24px;
        }

        /* Step 2: Swipe Cards */
        .swipe-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .swipe-card-wrapper {
          position: relative;
          width: 280px;
          height: 360px;
        }

        .swipe-card {
          position: absolute;
          inset: 0;
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          transition: transform 0.2s ease-out, opacity 0.2s ease-out;
        }

        .swipe-card.swiping-left {
          transform: translateX(-120%) rotate(-15deg);
          opacity: 0;
        }

        .swipe-card.swiping-right {
          transform: translateX(120%) rotate(15deg);
          opacity: 0;
        }

        .swipe-card-emoji {
          font-size: 6rem;
        }

        .swipe-card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .swipe-card-category {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .swipe-indicator {
          position: absolute;
          top: var(--spacing-md);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .swipe-indicator.like {
          right: var(--spacing-md);
          background: rgb(34 197 94 / 0.2);
          color: var(--color-success);
        }

        .swipe-indicator.dislike {
          left: var(--spacing-md);
          background: rgb(239 68 68 / 0.2);
          color: var(--color-error);
        }

        .swipe-card.swiping-right .swipe-indicator.like,
        .swipe-card.swiping-left .swipe-indicator.dislike {
          opacity: 1;
        }

        .swipe-buttons {
          display: flex;
          justify-content: center;
          gap: var(--spacing-xl);
          margin-top: var(--spacing-xl);
        }

        .swipe-btn {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .swipe-btn.dislike-btn {
          background: var(--color-surface);
          border: 2px solid var(--color-error);
          color: var(--color-error);
        }

        .swipe-btn.like-btn {
          background: var(--color-surface);
          border: 2px solid var(--color-success);
          color: var(--color-success);
        }

        .swipe-btn:hover {
          transform: scale(1.1);
        }

        .swipe-btn:active {
          transform: scale(0.95);
        }

        .swipe-progress {
          margin-top: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .skip-btn {
          margin-top: var(--spacing-md);
          color: var(--color-text-tertiary);
          font-size: 0.875rem;
          cursor: pointer;
        }

        /* Step 3: Complete */
        .complete-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .complete-emoji {
          font-size: 5rem;
          margin-bottom: var(--spacing-lg);
        }

        .complete-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .complete-description {
          color: var(--color-text-secondary);
          max-width: 280px;
        }
      `}</style>

      <header className="onboarding-header">
        <div className="step-indicator">
          <div className={`step-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`} />
          <div className={`step-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`} />
          <div className={`step-dot ${step === 3 ? 'active' : ''}`} />
        </div>
        <h1 className="onboarding-title">
          {step === 1 && 'Tell us about your household'}
          {step === 2 && 'What do you like?'}
          {step === 3 && "You're all set!"}
        </h1>
        <p className="onboarding-subtitle">
          {step === 1 && 'Help us personalize your dinner suggestions'}
          {step === 2 && 'Swipe right if you like it, left if not'}
          {step === 3 && "Let's find tonight's dinner"}
        </p>
      </header>

      <div className="onboarding-content">
        {/* Step 1: Household Settings */}
        {step === 1 && (
          <div className="settings-form">
            <div className="setting-group">
              <label className="setting-label">Adults in household</label>
              <p className="setting-description">How many adults will be eating?</p>
              <div className="counter-control">
                <button
                  className="counter-btn"
                  onClick={() => setHousehold(h => ({
                    ...h,
                    adultsCount: Math.max(1, h.adultsCount - 1)
                  }))}
                  disabled={household.adultsCount <= 1}
                >
                  −
                </button>
                <span className="counter-value">{household.adultsCount}</span>
                <button
                  className="counter-btn"
                  onClick={() => setHousehold(h => ({
                    ...h,
                    adultsCount: Math.min(10, h.adultsCount + 1)
                  }))}
                  disabled={household.adultsCount >= 10}
                >
                  +
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">Kids in household</label>
              <p className="setting-description">We&apos;ll suggest kid-friendly options</p>
              <div className="toggle-control">
                <button
                  className={`toggle-btn ${household.hasKids ? 'active' : ''}`}
                  onClick={() => setHousehold(h => ({
                    ...h,
                    hasKids: !h.hasKids,
                    kidsCount: h.hasKids ? 0 : 1
                  }))}
                />
                <span>
                  {household.hasKids ? 'Yes' : 'No kids'}
                </span>
              </div>
              {household.hasKids && (
                <div className="counter-control" style={{ marginTop: 'var(--spacing-sm)' }}>
                  <button
                    className="counter-btn"
                    onClick={() => setHousehold(h => ({
                      ...h,
                      kidsCount: Math.max(1, h.kidsCount - 1)
                    }))}
                    disabled={household.kidsCount <= 1}
                  >
                    −
                  </button>
                  <span className="counter-value">{household.kidsCount}</span>
                  <button
                    className="counter-btn"
                    onClick={() => setHousehold(h => ({
                      ...h,
                      kidsCount: Math.min(10, h.kidsCount + 1)
                    }))}
                    disabled={household.kidsCount >= 10}
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <div className="setting-group">
              <label className="setting-label">Max cookware at once</label>
              <p className="setting-description">How many pots/pans can you manage?</p>
              <div className="counter-control">
                <button
                  className="counter-btn"
                  onClick={() => setHousehold(h => ({
                    ...h,
                    maxCookware: Math.max(1, h.maxCookware - 1)
                  }))}
                  disabled={household.maxCookware <= 1}
                >
                  −
                </button>
                <span className="counter-value">{household.maxCookware}</span>
                <button
                  className="counter-btn"
                  onClick={() => setHousehold(h => ({
                    ...h,
                    maxCookware: Math.min(5, h.maxCookware + 1)
                  }))}
                  disabled={household.maxCookware >= 5}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Swipe Cards */}
        {step === 2 && (
          <div className="swipe-container">
            <div className="swipe-card-wrapper">
              {currentCardIndex < SWIPE_CARDS.length && (
                <div
                  className={`swipe-card ${
                    swipeDirection === 'left' ? 'swiping-left' :
                    swipeDirection === 'right' ? 'swiping-right' : ''
                  }`}
                >
                  <span className="swipe-indicator like">LIKE</span>
                  <span className="swipe-indicator dislike">NOPE</span>
                  <span className="swipe-card-emoji">{SWIPE_CARDS[currentCardIndex].image}</span>
                  <span className="swipe-card-title">{SWIPE_CARDS[currentCardIndex].title}</span>
                  <span className="swipe-card-category">{SWIPE_CARDS[currentCardIndex].category}</span>
                </div>
              )}
            </div>

            <div className="swipe-buttons">
              <button
                className="swipe-btn dislike-btn"
                onClick={() => handleSwipe('left')}
                disabled={swipeDirection !== null}
              >
                ✕
              </button>
              <button
                className="swipe-btn like-btn"
                onClick={() => handleSwipe('right')}
                disabled={swipeDirection !== null}
              >
                ♥
              </button>
            </div>

            <p className="swipe-progress">
              {currentCardIndex + 1} of {SWIPE_CARDS.length}
            </p>

            <button className="skip-btn" onClick={handleSkipCards}>
              Skip this step
            </button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="complete-content">
            <span className="complete-emoji">🎉</span>
            <h2 className="complete-title">Great choices!</h2>
            <p className="complete-description">
              We&apos;ll use your preferences to suggest the perfect weeknight dinners.
            </p>
          </div>
        )}
      </div>

      <footer className="onboarding-footer">
        {step === 1 && (
          <Button onClick={handleStep1Next} fullWidth>
            Continue
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleComplete} loading={loading} fullWidth>
            Start Cooking
          </Button>
        )}
      </footer>
    </div>
  );
}

