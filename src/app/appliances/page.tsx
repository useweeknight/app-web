/**
 * Appliances Page
 *
 * 器具专题入口：Air Fryer / Sheet-pan / One-pot 专题
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/ui/BottomNav';
import { searchRecipes, type RecipeCard } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

interface ApplianceTopic {
  id: string;
  name: string;
  icon: string;
  description: string;
  equipment: string;
  color: string;
}

// =============================================================================
// Data
// =============================================================================

const APPLIANCE_TOPICS: ApplianceTopic[] = [
  {
    id: 'air-fryer',
    name: 'Air Fryer',
    icon: '🍟',
    description: 'Crispy & quick meals with minimal oil',
    equipment: 'air_fryer',
    color: '#FF6B35',
  },
  {
    id: 'sheet-pan',
    name: 'Sheet Pan',
    icon: '🍳',
    description: 'Easy cleanup, hands-off cooking',
    equipment: 'sheet_pan',
    color: '#3B82F6',
  },
  {
    id: 'one-pot',
    name: 'One Pot',
    icon: '🥘',
    description: 'Everything in one pot, minimal dishes',
    equipment: 'pot',
    color: '#22C55E',
  },
  {
    id: 'instant-pot',
    name: 'Instant Pot',
    icon: '⏰',
    description: 'Fast pressure cooking for busy nights',
    equipment: 'instant_pot',
    color: '#F59E0B',
  },
  {
    id: 'slow-cooker',
    name: 'Slow Cooker',
    icon: '🍲',
    description: 'Set it and forget it',
    equipment: 'slow_cooker',
    color: '#8B5CF6',
  },
  {
    id: 'grill',
    name: 'Grill',
    icon: '🔥',
    description: 'Outdoor flavor, indoors or out',
    equipment: 'grill',
    color: '#EF4444',
  },
];

// =============================================================================
// RecipeCard Component
// =============================================================================

interface RecipeCardViewProps {
  recipe: RecipeCard;
  onClick: () => void;
}

function RecipeCardView({ recipe, onClick }: RecipeCardViewProps) {
  return (
    <article className="recipe-card" onClick={onClick}>
      <style jsx>{`
        .recipe-card {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .recipe-card:hover {
          background: var(--color-border-light);
        }

        .recipe-image {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          flex-shrink: 0;
        }

        .recipe-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: var(--radius-md);
        }

        .recipe-content {
          flex: 1;
          min-width: 0;
        }

        .recipe-title {
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .recipe-meta {
          display: flex;
          gap: var(--spacing-md);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .recipe-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .tag {
          padding: 2px 8px;
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.625rem;
          color: var(--color-text-tertiary);
        }

        .tag.kid-friendly {
          background: rgb(34 197 94 / 0.1);
          color: var(--color-success);
        }
      `}</style>

        <div className="recipe-image">
          {recipe.hero_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={recipe.hero_image_url} alt={recipe.title} />
          ) : (
            '🍽️'
          )}
        </div>
      <div className="recipe-content">
        <h3 className="recipe-title">{recipe.title}</h3>
        <div className="recipe-meta">
          <span>⏱️ {recipe.time_total_min} min</span>
          <span>👥 {recipe.servings}</span>
          <span>🍳 {recipe.cookware_count}</span>
        </div>
        <div className="recipe-tags">
          {recipe.kid_friendly && <span className="tag kid-friendly">👶 Kid Friendly</span>}
          {recipe.difficulty && <span className="tag">{recipe.difficulty}</span>}
          {recipe.cuisine && <span className="tag">{recipe.cuisine}</span>}
        </div>
      </div>
    </article>
  );
}

// =============================================================================
// Appliances Page
// =============================================================================

export default function AppliancesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedTopic, setSelectedTopic] = useState<ApplianceTopic | null>(null);
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // 获取 token
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
      }
    };
    getSession();
  }, [supabase]);

  // 选择专题
  const handleSelectTopic = useCallback(async (topic: ApplianceTopic) => {
    setSelectedTopic(topic);
    setLoading(true);
    setRecipes([]);

    try {
      const result = await searchRecipes({
        equipment: topic.equipment,
        limit: 20,
      }, token || undefined);

      setRecipes(result.data);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 点击菜谱
  const handleRecipeClick = useCallback((recipe: RecipeCard) => {
    router.push(`/cook?recipeId=${recipe.recipe_id}`);
  }, [router]);

  // 返回主页
  const handleBack = useCallback(() => {
    setSelectedTopic(null);
    setRecipes([]);
  }, []);

  return (
    <div className="page-with-nav appliances-page">
      <style jsx>{`
        .appliances-page {
          background: var(--color-background);
        }

        .appliances-header {
          padding: var(--spacing-lg);
          padding-top: calc(var(--spacing-lg) + var(--safe-area-inset-top));
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
        }

        .header-with-back {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-border-light);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          margin-top: var(--spacing-xs);
        }

        .appliances-content {
          padding: var(--spacing-md);
        }

        .topics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        .topic-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          animation: slideUp var(--transition-slow) ease-out both;
        }

        .topic-card:nth-child(1) { animation-delay: 0ms; }
        .topic-card:nth-child(2) { animation-delay: 50ms; }
        .topic-card:nth-child(3) { animation-delay: 100ms; }
        .topic-card:nth-child(4) { animation-delay: 150ms; }
        .topic-card:nth-child(5) { animation-delay: 200ms; }
        .topic-card:nth-child(6) { animation-delay: 250ms; }

        .topic-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .topic-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-sm);
        }

        .topic-name {
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .topic-description {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .recipes-section {
          margin-top: var(--spacing-lg);
        }

        .recipes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .recipes-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .recipes-count {
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
        }

        .recipes-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
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
          width: 40px;
          height: 40px;
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

        .empty-recipes {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--color-text-secondary);
        }

        .topic-banner {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .banner-icon {
          font-size: 3rem;
        }

        .banner-content {
          flex: 1;
        }

        .banner-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .banner-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }
      `}</style>

      <header className="appliances-header">
        {selectedTopic ? (
          <div className="header-with-back">
            <button className="back-btn" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1 className="header-title">{selectedTopic.name}</h1>
              <p className="header-subtitle">{selectedTopic.description}</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="header-title">Cook by Appliance</h1>
            <p className="header-subtitle">Find recipes perfect for your favorite kitchen tools</p>
          </>
        )}
      </header>

      <main className="appliances-content">
        {!selectedTopic ? (
          <div className="topics-grid">
            {APPLIANCE_TOPICS.map((topic) => (
              <article 
                key={topic.id} 
                className="topic-card"
                onClick={() => handleSelectTopic(topic)}
                style={{ borderTop: `4px solid ${topic.color}` }}
              >
                <span className="topic-icon">{topic.icon}</span>
                <h2 className="topic-name">{topic.name}</h2>
                <p className="topic-description">{topic.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <section className="recipes-section">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading recipes...</p>
              </div>
            ) : recipes.length === 0 ? (
              <div className="empty-recipes">
                <p>No recipes found for this appliance.</p>
                <p>Check back soon!</p>
              </div>
            ) : (
              <>
                <div className="recipes-header">
                  <h2 className="recipes-title">
                    {selectedTopic.icon} {selectedTopic.name} Recipes
                  </h2>
                  <span className="recipes-count">{recipes.length} recipes</span>
                </div>
                <div className="recipes-list">
                  {recipes.map((recipe) => (
                    <RecipeCardView 
                      key={recipe.recipe_id} 
                      recipe={recipe}
                      onClick={() => handleRecipeClick(recipe)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

