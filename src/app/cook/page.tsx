/**
 * Cooking Page
 *
 * 点按式时间线执行界面（无语音）
 * - 展示当前步骤、倒计时
 * - 支持 下一步/重播提示/停止 基础控制
 */
'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { EmojiFeedback } from '@/components/cook/EmojiFeedback';
import { LeftoverMarker } from '@/components/cook/LeftoverMarker';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { getRecipeTimeline, getRecipeById, sendTelemetry, type TimelineStep } from '@/lib/api';

// =============================================================================
// Timer Hook
// =============================================================================

function useTimer(initialSeconds: number, onComplete?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  const addTime = useCallback((addSeconds: number) => {
    setSeconds(prev => Math.max(0, prev + addSeconds));
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds, onComplete]);

  return { seconds, isRunning, start, pause, reset, addTime };
}

// =============================================================================
// Format Helpers
// =============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// CookingContent Component (uses useSearchParams)
// =============================================================================

function CookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const recipeId = searchParams.get('recipeId');

  const [recipe, setRecipe] = useState<{ title: string; hero_image_url?: string } | null>(null);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cookingStarted, setCookingStarted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showSideDishHint, setShowSideDishHint] = useState(false);

  // Step 7 补丁：完成后反馈弹窗状态
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showLeftoverModal, setShowLeftoverModal] = useState(false);

  // Feature flags
  const { isEnabled } = useFeatureFlags();

  const currentStep = steps[currentStepIndex];
  const timerSeconds = currentStep?.timer_sec || 0;

  const handleTimerComplete = useCallback(() => {
    // 播放提示音
    try {
      const audio = new Audio('/sounds/timer-done.mp3');
      audio.play().catch(() => {
        // 静默失败
      });
    } catch {
      // 忽略
    }
  }, []);

  const timer = useTimer(timerSeconds, handleTimerComplete);

  // 获取用户 session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setToken(session.access_token);
      }
    };
    getSession();
  }, [supabase]);

  // 加载菜谱和时间线
  useEffect(() => {
    if (!recipeId) {
      setError('No recipe selected');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [recipeResult, timelineResult] = await Promise.all([
          getRecipeById(recipeId, token || undefined),
          getRecipeTimeline(recipeId, token || undefined),
        ]);

        if (recipeResult.ok) {
          setRecipe(recipeResult.data as { title: string; hero_image_url?: string });
        }

        if (timelineResult.ok) {
          setSteps(timelineResult.data);
        }
      } catch (err) {
        console.error('Failed to load recipe:', err);
        setError('Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [recipeId, token]);

  // 当步骤改变时重置计时器
  useEffect(() => {
    if (currentStep?.timer_sec) {
      timer.reset(currentStep.timer_sec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, currentStep?.timer_sec]);

  // 开始烹饪
  const handleStartCooking = useCallback(async () => {
    setCookingStarted(true);
    if (userId && recipeId) {
      await sendTelemetry('cook_start', { recipe_id: recipeId, user_id: userId }, token || undefined);
    }
  }, [userId, recipeId, token]);

  // 下一步
  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      timer.pause();
    }
  }, [currentStepIndex, steps.length, timer]);

  // 上一步
  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      timer.pause();
    }
  }, [currentStepIndex, timer]);

  // 完成烹饪
  const handleComplete = useCallback(async () => {
    if (userId && recipeId) {
      await sendTelemetry('cook_complete', { recipe_id: recipeId, user_id: userId }, token || undefined);
    }

    // 根据 feature flags 显示反馈弹窗
    if (isEnabled('emoji_feedback')) {
      setShowEmojiModal(true);
    } else {
      // 如果没有 emoji 反馈，直接显示剩菜标记
      setShowLeftoverModal(true);
    }
  }, [userId, recipeId, token, isEnabled]);

  // Emoji 反馈完成后显示剩菜标记
  const handleEmojiSubmit = useCallback(() => {
    setShowEmojiModal(false);
    setShowLeftoverModal(true);
  }, []);

  // 剩菜标记完成后返回 Tonight
  const handleLeftoverSubmit = useCallback(() => {
    setShowLeftoverModal(false);
    router.push('/tonight');
  }, [router]);

  // 跳过 Emoji 反馈
  const handleSkipEmoji = useCallback(() => {
    setShowEmojiModal(false);
    setShowLeftoverModal(true);
  }, []);

  // 跳过剩菜标记
  const handleSkipLeftover = useCallback(() => {
    setShowLeftoverModal(false);
    router.push('/tonight');
  }, [router]);

  // 停止并返回
  const handleStop = useCallback(() => {
    if (confirm('Are you sure you want to stop cooking?')) {
      router.push('/tonight');
    }
  }, [router]);

  // 重播当前步骤
  const handleRepeat = useCallback(() => {
    // 可以添加 TTS 或震动反馈
    alert(currentStep?.instruction || 'No instruction');
  }, [currentStep]);

  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  if (loading) {
    return (
      <div className="cooking-loading">
        <style jsx>{`
          .cooking-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--color-background);
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: var(--spacing-md);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loading-spinner" />
        <p>Loading recipe...</p>
      </div>
    );
  }

  if (error || !recipeId) {
    return (
      <div className="cooking-error">
        <style jsx>{`
          .cooking-error {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-lg);
            background: var(--color-background);
            text-align: center;
          }
          .error-emoji {
            font-size: 4rem;
            margin-bottom: var(--spacing-md);
          }
          .error-message {
            color: var(--color-error);
            margin-bottom: var(--spacing-lg);
          }
        `}</style>
        <span className="error-emoji">😕</span>
        <p className="error-message">{error || 'No recipe selected'}</p>
        <Button onClick={() => router.push('/tonight')}>
          Back to Tonight
        </Button>
      </div>
    );
  }

  // 开始前的预览界面
  if (!cookingStarted) {
    return (
      <div className="cooking-preview">
        <style jsx>{`
          .cooking-preview {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--color-background);
          }
          .preview-header {
            position: relative;
            height: 240px;
            background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .preview-header img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .preview-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
          }
          .preview-title {
            position: absolute;
            bottom: var(--spacing-lg);
            left: var(--spacing-lg);
            right: var(--spacing-lg);
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
          }
          .back-btn {
            position: absolute;
            top: calc(var(--spacing-md) + var(--safe-area-inset-top));
            left: var(--spacing-md);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.3);
            border-radius: var(--radius-full);
            color: white;
          }
          .preview-content {
            flex: 1;
            padding: var(--spacing-lg);
          }
          .steps-preview {
            margin-bottom: var(--spacing-xl);
          }
          .steps-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-md);
          }
          .steps-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
          }
          .step-preview-item {
            display: flex;
            gap: var(--spacing-md);
            padding: var(--spacing-sm);
            font-size: 0.875rem;
            color: var(--color-text-secondary);
          }
          .step-number {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-border-light);
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 600;
            flex-shrink: 0;
          }
          .preview-footer {
            padding: var(--spacing-lg);
            padding-bottom: calc(var(--spacing-lg) + var(--safe-area-inset-bottom));
          }
          .preview-meta {
            display: flex;
            justify-content: center;
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-lg);
            color: var(--color-text-secondary);
            font-size: 0.875rem;
          }
        `}</style>

        <div className="preview-header">
          {recipe?.hero_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={recipe.hero_image_url} alt={recipe?.title} />
          ) : (
            <span style={{ fontSize: '4rem' }}>🍳</span>
          )}
          <div className="preview-overlay" />
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="preview-title">{recipe?.title || 'Recipe'}</h1>
        </div>

        <div className="preview-content">
          <div className="steps-preview">
            <h2 className="steps-title">{steps.length} Steps Overview</h2>
            <div className="steps-list">
              {steps.slice(0, 5).map((step, index) => (
                <div key={step.id} className="step-preview-item">
                  <span className="step-number">{index + 1}</span>
                  <span>{step.instruction.slice(0, 60)}{step.instruction.length > 60 ? '...' : ''}</span>
                </div>
              ))}
              {steps.length > 5 && (
                <div className="step-preview-item">
                  <span className="step-number">...</span>
                  <span>+ {steps.length - 5} more steps</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="preview-footer">
          <div className="preview-meta">
            <span>⏱️ {steps.reduce((acc, s) => acc + (s.duration_sec || 0), 0) / 60} min total</span>
            <span>📋 {steps.length} steps</span>
          </div>
          <Button fullWidth size="lg" onClick={handleStartCooking}>
            Start Cooking
          </Button>
        </div>
      </div>
    );
  }

  // 烹饪中界面
  return (
    <div className="cooking-page">
      <style jsx>{`
        .cooking-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-background);
        }

        .cooking-header {
          padding: var(--spacing-md);
          padding-top: calc(var(--spacing-md) + var(--safe-area-inset-top));
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .stop-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--color-error);
        }

        .recipe-name {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          text-align: center;
        }

        .progress-bar {
          height: 4px;
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-top: var(--spacing-sm);
        }

        .progress-fill {
          height: 100%;
          background: var(--color-primary);
          transition: width var(--transition-normal);
        }

        .step-counter {
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-top: var(--spacing-xs);
        }

        .cooking-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: var(--spacing-lg);
          overflow-y: auto;
        }

        .timer-section {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .timer-display {
          font-family: var(--font-mono);
          font-size: 4rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-md);
        }

        .timer-display.running {
          color: var(--color-primary);
        }

        .timer-display.warning {
          color: var(--color-warning);
          animation: pulse 1s ease-in-out infinite;
        }

        .timer-display.done {
          color: var(--color-success);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .timer-controls {
          display: flex;
          justify-content: center;
          gap: var(--spacing-md);
        }

        .timer-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .timer-btn:hover {
          background: var(--color-border);
        }

        .timer-btn.primary {
          background: var(--color-primary);
          color: white;
          width: 64px;
          height: 64px;
        }

        .step-section {
          flex: 1;
        }

        .step-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
        }

        .step-method {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .step-instruction {
          font-size: 1.25rem;
          line-height: 1.6;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-md);
        }

        .step-hints {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--color-border-light);
        }

        .step-hint {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .step-hint-icon {
          font-size: 1rem;
        }

        .side-dish-hint {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-md);
          background: rgb(59 130 246 / 0.1);
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .side-dish-title {
          font-weight: 600;
          color: var(--color-info);
          margin-bottom: var(--spacing-xs);
        }

        .side-dish-text {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .cooking-footer {
          padding: var(--spacing-lg);
          padding-bottom: calc(var(--spacing-lg) + var(--safe-area-inset-bottom));
          background: var(--color-surface);
          border-top: 1px solid var(--color-border-light);
        }

        .nav-buttons {
          display: flex;
          gap: var(--spacing-md);
        }

        .nav-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--color-border-light);
          border-radius: var(--radius-md);
          font-weight: 500;
          color: var(--color-text-primary);
          transition: all var(--transition-fast);
        }

        .nav-btn:hover:not(:disabled) {
          background: var(--color-border);
        }

        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-btn.primary {
          background: var(--color-primary);
          color: white;
        }

        .nav-btn.primary:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        .repeat-btn {
          width: 100%;
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: transparent;
          color: var(--color-text-tertiary);
          font-size: 0.875rem);
        }
      `}</style>

      <header className="cooking-header">
        <div className="header-top">
          <button className="stop-btn" onClick={handleStop}>
            Stop
          </button>
          <span className="recipe-name">{recipe?.title}</span>
          <div style={{ width: 60 }} />
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="step-counter">Step {currentStepIndex + 1} of {steps.length}</p>
      </header>

      <main className="cooking-main">
        {/* 计时器区域 */}
        {timerSeconds > 0 && (
          <div className="timer-section">
            <div className={`timer-display ${
              timer.isRunning ? 'running' : ''
            } ${
              timer.seconds <= 10 && timer.seconds > 0 ? 'warning' : ''
            } ${
              timer.seconds === 0 ? 'done' : ''
            }`}>
              {formatTime(timer.seconds)}
            </div>
            <div className="timer-controls">
              <button className="timer-btn" onClick={() => timer.addTime(-60)}>
                -1m
              </button>
              <button 
                className="timer-btn primary" 
                onClick={timer.isRunning ? timer.pause : timer.start}
              >
                {timer.isRunning ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              <button className="timer-btn" onClick={() => timer.addTime(60)}>
                +1m
              </button>
            </div>
          </div>
        )}

        {/* 步骤卡片 */}
        <div className="step-section">
          <div className="step-card">
            {currentStep?.method && (
              <span className="step-method">
                {currentStep.equipment && `🍳 ${currentStep.equipment}`}
                {currentStep.method}
              </span>
            )}

            <p className="step-instruction">{currentStep?.instruction}</p>

            <div className="step-hints">
              {currentStep?.temperature_f && (
                <div className="step-hint">
                  <span className="step-hint-icon">🌡️</span>
                  <span>{currentStep.temperature_f}°F</span>
                </div>
              )}
              {currentStep?.doneness_cue && (
                <div className="step-hint">
                  <span className="step-hint-icon">👀</span>
                  <span>{currentStep.doneness_cue}</span>
                </div>
              )}
              {currentStep?.cleanup_hint && (
                <div className="step-hint">
                  <span className="step-hint-icon">🧹</span>
                  <span>{currentStep.cleanup_hint}</span>
                </div>
              )}
            </div>

            {/* 配菜提示卡 - 在等待窗口显示 */}
            {timerSeconds > 60 && (
              <div 
                className="side-dish-hint"
                onClick={() => setShowSideDishHint(!showSideDishHint)}
              >
                <p className="side-dish-title">💡 Got a minute?</p>
                <p className="side-dish-text">
                  {showSideDishHint 
                    ? 'Prep a quick side salad while you wait! Wash some greens, slice a cucumber, and drizzle with olive oil.'
                    : 'Tap for a side dish suggestion'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="cooking-footer">
        <div className="nav-buttons">
          <button 
            className="nav-btn"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </button>

          {isLastStep ? (
            <button className="nav-btn primary" onClick={handleComplete}>
              Done! 🎉
            </button>
          ) : (
            <button className="nav-btn primary" onClick={handleNextStep}>
              Next
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        <button className="repeat-btn" onClick={handleRepeat}>
          🔄 Repeat this step
        </button>
      </footer>

      {/* Step 7 补丁：完成后弹窗 */}
      {showEmojiModal && recipeId && (
        <EmojiFeedback
          recipeId={recipeId}
          userId={userId || undefined}
          token={token || undefined}
          onSubmit={handleEmojiSubmit}
          onClose={handleSkipEmoji}
        />
      )}

      {showLeftoverModal && recipeId && (
        <LeftoverMarker
          recipeId={recipeId}
          recipeTitle={recipe?.title}
          userId={userId || undefined}
          token={token || undefined}
          onSubmit={handleLeftoverSubmit}
          onClose={handleSkipLeftover}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main Component with Suspense
// =============================================================================

export default function CookPage() {
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
      <CookingContent />
    </Suspense>
  );
}

