/**
 * Tonight Page
 *
 * 主页面：文本输入 + 调用 /api/tonight + 展示 SuggestionCard 列表
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/ui/BottomNav';
import { Button } from '@/components/ui/Button';
import {
  getTonightSuggestions,
  sendTelemetry,
  type SuggestionCard,
  type SideDish,
  type TonightResponse,
} from '@/lib/api';

// =============================================================================
// SuggestionCard 组件
// =============================================================================

interface SuggestionCardProps {
  card: SuggestionCard;
  sideDishes?: SideDish[];
  onSelect: () => void;
  onShare: () => void;
}

function SuggestionCardView({ card, sideDishes, onSelect, onShare }: SuggestionCardProps) {
  return (
    <article className="suggestion-card" onClick={onSelect}>
      <style jsx>{`
        .suggestion-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          animation: slideUp var(--transition-slow) ease-out both;
        }

        .suggestion-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
        }

        .card-image {
          height: 160px;
          background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-content {
          padding: var(--spacing-md);
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .card-meta {
          display: flex;
          gap: var(--spacing-md);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-sm);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
        }

        .tag {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .tag.kid-friendly {
          background: rgb(34 197 94 / 0.1);
          color: var(--color-success);
        }

        .substitutions {
          padding: var(--spacing-sm);
          background: rgb(245 158 11 / 0.1);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-size: 0.75rem;
          color: var(--color-warning);
        }

        .leftover-hint {
          padding: var(--spacing-sm);
          background: rgb(59 130 246 / 0.1);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-size: 0.75rem;
          color: var(--color-info);
        }

        .side-dishes {
          border-top: 1px solid var(--color-border-light);
          padding-top: var(--spacing-sm);
          margin-top: var(--spacing-sm);
        }

        .side-dishes-title {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-bottom: var(--spacing-xs);
        }

        .side-dish-item {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--color-border-light);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          margin-right: var(--spacing-xs);
        }

        .card-actions {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
        }

        .share-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-border-light);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .share-btn:hover {
          background: var(--color-border);
        }

        .nutrition-row {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }

        .nutrition-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .nutrition-value {
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .score-badge {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
      `}</style>

      <div className="card-image" style={{ position: 'relative' }}>
        {card.hero_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={card.hero_image_url} alt={card.title} />
        ) : (
          '🍳'
        )}
        <span className="score-badge">Score: {card.score}</span>
      </div>

      <div className="card-content">
        <h3 className="card-title">{card.title}</h3>

        <div className="card-meta">
          <span className="meta-item">⏱️ {card.time_total_min} min</span>
          <span className="meta-item">🍳 {card.cookware_count} pot{card.cookware_count > 1 ? 's' : ''}</span>
          <span className="meta-item">👥 {card.servings} servings</span>
        </div>

        <div className="card-tags">
          {card.kid_friendly && <span className="tag kid-friendly">👶 Kid Friendly</span>}
          {card.equipment.slice(0, 2).map((eq) => (
            <span key={eq} className="tag">{eq}</span>
          ))}
          {card.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        {card.substitutions_applied && card.substitutions_applied.length > 0 && (
          <div className="substitutions">
            ⚠️ Substitutions: {card.substitutions_applied.map(s => 
              `${s.original} → ${s.substitute}`
            ).join(', ')}
          </div>
        )}

        {card.leftover_potential?.suitable && (
          <div className="leftover-hint">
            ♻️ Great for leftovers! {card.leftover_potential.transformation && 
              `Can be transformed into ${card.leftover_potential.transformation}`
            } (Safe for {card.leftover_potential.safe_hours}h)
          </div>
        )}

        {card.nutrition && (
          <div className="nutrition-row">
            {card.nutrition.calories_kcal && (
              <div className="nutrition-item">
                <span className="nutrition-value">{card.nutrition.calories_kcal}</span>
                <span>kcal</span>
              </div>
            )}
            {card.nutrition.protein_g && (
              <div className="nutrition-item">
                <span className="nutrition-value">{card.nutrition.protein_g}g</span>
                <span>protein</span>
              </div>
            )}
            {card.nutrition.carbs_g && (
              <div className="nutrition-item">
                <span className="nutrition-value">{card.nutrition.carbs_g}g</span>
                <span>carbs</span>
              </div>
            )}
            {card.nutrition.fat_g && (
              <div className="nutrition-item">
                <span className="nutrition-value">{card.nutrition.fat_g}g</span>
                <span>fat</span>
              </div>
            )}
          </div>
        )}

        {/* 配菜软入口 */}
        {sideDishes && sideDishes.length > 0 && (
          <div className="side-dishes">
            <p className="side-dishes-title">Suggested side dishes:</p>
            {sideDishes.slice(0, 2).map((dish) => (
              <span key={dish.name} className="side-dish-item">
                🥬 {dish.name} ({dish.time_min} min)
              </span>
            ))}
          </div>
        )}

        <div className="card-actions">
          <Button fullWidth onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            Let&apos;s Cook This!
          </Button>
          <button className="share-btn" onClick={(e) => { e.stopPropagation(); onShare(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        {card.rank_reasons.length > 0 && (
          <p style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--spacing-sm)',
            fontStyle: 'italic'
          }}>
            Why we picked this: {card.rank_reasons.join(' • ')}
          </p>
        )}
      </div>
    </article>
  );
}

// =============================================================================
// Tonight Page
// =============================================================================

export default function TonightPage() {
  const router = useRouter();
  const supabase = createClient();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TonightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 获取用户信息
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setToken(session.access_token);
      }
    };
    getUser();
  }, [supabase]);

  // 提交查询
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getTonightSuggestions({
        user_id: userId,
        text_input: input.trim(),
      }, token || undefined);

      setResponse(result);

      // 发送 telemetry
      result.suggestions.forEach((card) => {
        sendTelemetry('card_view', { recipe_id: card.recipe_id, user_id: userId }, token || undefined);
      });
    } catch (e) {
      console.error('Tonight API error:', e);
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [input, userId, token]);

  // 选择菜谱
  const handleSelectRecipe = useCallback(async (card: SuggestionCard) => {
    if (!userId) return;

    // 发送 telemetry
    await sendTelemetry('card_select', { recipe_id: card.recipe_id, user_id: userId }, token || undefined);

    // 跳转到 cooking 页面
    router.push(`/cook?recipeId=${card.recipe_id}`);
  }, [userId, token, router]);

  // 分享卡片
  const handleShare = useCallback(async (card: SuggestionCard) => {
    if (!userId) return;

    await sendTelemetry('share', { recipe_id: card.recipe_id, user_id: userId }, token || undefined);

    // 使用 Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: card.title,
          text: `Check out this recipe: ${card.title} - ${card.time_total_min} min, ${card.servings} servings`,
          url: `${window.location.origin}/recipes/${card.recipe_id}`,
        });
      } catch {
        // 用户取消分享
        console.log('Share cancelled');
      }
    } else {
      // 降级：复制链接
      const url = `${window.location.origin}/recipes/${card.recipe_id}`;
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }, [userId, token]);

  // 快捷输入
  const quickPrompts = [
    'Something quick with chicken',
    'Vegetarian under 30 min',
    'Kid-friendly one-pot meal',
    'Use my leftover rice',
  ];

  return (
    <div className="page-with-nav tonight-page">
      <style jsx>{`
        .tonight-page {
          background: var(--color-background);
        }

        .tonight-header {
          padding: var(--spacing-lg);
          padding-top: calc(var(--spacing-lg) + var(--safe-area-inset-top));
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
        }

        .tonight-greeting {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .tonight-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .input-section {
          padding: var(--spacing-md);
          background: var(--color-surface);
        }

        .input-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .input-wrapper {
          position: relative;
        }

        .input-field {
          width: 100%;
          padding: var(--spacing-md);
          padding-right: 3rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 1rem;
          color: var(--color-text-primary);
          transition: all var(--transition-fast);
        }

        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgb(255 107 53 / 0.1);
        }

        .input-field::placeholder {
          color: var(--color-text-tertiary);
        }

        .submit-btn {
          position: absolute;
          right: var(--spacing-sm);
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        .submit-btn:disabled {
          opacity: 0.5;
        }

        .quick-prompts {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .quick-prompt {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .quick-prompt:hover {
          background: var(--color-border);
          color: var(--color-text-primary);
        }

        .results-section {
          padding: var(--spacing-md);
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .results-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .results-meta {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
        }

        .cards-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .error-message {
          padding: var(--spacing-md);
          background: rgb(239 68 68 / 0.1);
          color: var(--color-error);
          border-radius: var(--radius-md);
          text-align: center;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-2xl);
          color: var(--color-text-secondary);
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
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-2xl);
          text-align: center;
        }

        .empty-emoji {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .empty-description {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .clarifying-question {
          padding: var(--spacing-md);
          background: rgb(59 130 246 / 0.1);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          color: var(--color-info);
        }
      `}</style>

      <header className="tonight-header">
        <h1 className="tonight-greeting">What&apos;s for dinner?</h1>
        <p className="tonight-subtitle">Tell me what you&apos;re in the mood for</p>
      </header>

      <section className="input-section">
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Something quick with chicken..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="quick-prompt"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="results-section">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Finding perfect recipes for you...</p>
          </div>
        )}

        {!loading && !response && !error && (
          <div className="empty-state">
            <span className="empty-emoji">🍽️</span>
            <h2 className="empty-title">Ready to cook?</h2>
            <p className="empty-description">
              Tell me what you want to eat, and I&apos;ll find the perfect recipe for tonight.
            </p>
          </div>
        )}

        {response && (
          <>
            <div className="results-header">
              <h2 className="results-title">
                {response.suggestions.length} suggestions
              </h2>
              <span className="results-meta">
                {response.decision_time_ms}ms • {response.trace_id.slice(0, 8)}
              </span>
            </div>

            {response.clarifying_question && (
              <div className="clarifying-question">
                💡 {response.clarifying_question}
              </div>
            )}

            <div className="cards-list stagger-children">
              {response.suggestions.map((card) => (
                <SuggestionCardView
                  key={card.recipe_id}
                  card={card}
                  sideDishes={response.side_dishes}
                  onSelect={() => handleSelectRecipe(card)}
                  onShare={() => handleShare(card)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

