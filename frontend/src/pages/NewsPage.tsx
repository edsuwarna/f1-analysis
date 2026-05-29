import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/formatters';
import { ExternalLink, Newspaper } from 'lucide-react';

interface Article {
  title: string;
  link: string;
  description: string;
  pub_date: string;
  thumbnail: string | null;
  source: string;
  source_icon: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  'Motorsport': '#e10600',
  'The Guardian': '#052962',
  'RaceFans': '#faa41a',
  'F1i': '#00bd68',
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  'Motorsport': 'bg-red-600/15 text-red-500 border-red-500/30',
  'The Guardian': 'bg-blue-900/15 text-blue-400 border-blue-900/30',
  'RaceFans': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'F1i': 'bg-green-500/15 text-green-400 border-green-500/30',
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] || '#666';
}

function getSourceBadgeClass(source: string): string {
  return SOURCE_BADGE_COLORS[source] || 'bg-muted/50 text-muted-foreground border-border';
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/news`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (e) {
        console.error('News load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-red-500" />
          F1 News
        </h1>
        <div className="text-center p-12 text-muted-foreground">Loading articles...</div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-red-500" />
          F1 News
        </h1>
        <div className="text-center p-12 text-muted-foreground">No articles available at the moment.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-red-500" />
          F1 News
        </h1>
        <Badge variant="secondary" className="text-xs">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {articles.map((article, index) => (
          <Card
            key={index}
            className="overflow-hidden border-l-4"
            style={{ borderLeftColor: getSourceColor(article.source) }}
          >
            <div className="flex flex-row">
              {article.thumbnail && (
                <div className="w-28 sm:w-36 shrink-0">
                  <img
                    src={article.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              {!article.thumbnail && article.source_icon && (
                <div className="w-14 shrink-0 flex items-center justify-center bg-muted/30">
                  <img
                    src={article.source_icon}
                    alt={article.source}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium ${getSourceBadgeClass(article.source)}`}
                  >
                    {article.source}
                  </Badge>
                  {article.pub_date && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDateTime(article.pub_date)}
                    </span>
                  )}
                </div>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm leading-tight line-clamp-2 hover:text-red-500 transition-colors block"
                >
                  {article.title}
                  <ExternalLink className="h-3 w-3 inline-block ml-1 shrink-0" />
                </a>
                {article.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {article.description}
                  </p>
                )}
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
