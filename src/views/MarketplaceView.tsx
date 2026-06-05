import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Star,
  Download,
  Store,
  Check,
  Loader2,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { Tag, EmptyState, SegmentedControl, Input } from '@renderer/components/ui/Controls'
import {
  installMarketplaceItem,
  listMarketplace,
  type MarketplaceItem
} from '@renderer/lib/gateway-api'

type FilterTab = 'all' | 'channel' | 'tool' | 'integration' | 'utility'

export function MarketplaceView(): React.JSX.Element {
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [installing, setInstalling] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const list = await listMarketplace()
    setItems(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchesQuery =
        !query.trim() ||
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      const matchesFilter = filter === 'all' || i.category === filter
      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

  const featured = useMemo(() => items.filter((i) => i.downloads > 10000), [items])

  const handleInstall = async (item: MarketplaceItem): Promise<void> => {
    setInstalling(item.id)
    const res = await installMarketplaceItem(item.id)
    setInstalling(null)
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, installed: true } : x))
      )
      toast.success(`${item.name} 安装完成`)
    } else {
      toast.error('安装失败，请稍后重试')
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Store size={16} className="text-[var(--accent-primary)]" />
            插件市场
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            浏览并安装社区贡献的扩展，让 OpenClaw 更强大
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.openclawAPI.shell.openExternal(
              'https://github.com/ValueCell-ai/ClawX'
            )
          }}
          className="text-xs text-[var(--accent-primary)] hover:underline"
        >
          提交插件 →
        </a>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <Input
              value={query}
              onChange={setQuery}
              placeholder="搜索插件、标签…"
              className="pl-7"
            />
          </div>
          <SegmentedControl<FilterTab>
            value={filter}
            onChange={setFilter}
            size="sm"
            options={[
              { value: 'all', label: '全部' },
              { value: 'channel', label: '频道' },
              { value: 'tool', label: '工具' },
              { value: 'integration', label: '集成' },
              { value: 'utility', label: '实用' }
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]"
              />
            ))}
          </div>
        ) : (
          <>
            {featured.length > 0 && !query && filter === 'all' && (
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                  <Sparkles size={14} className="text-[var(--accent-primary)]" />
                  编辑精选
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {featured.map((item) => (
                    <MarketplaceCard
                      key={item.id}
                      item={item}
                      featured
                      installing={installing === item.id}
                      onInstall={() => void handleInstall(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
              <TrendingUp size={14} className="text-[var(--text-tertiary)]" />
              全部插件
              <span className="text-[10px] text-[var(--text-tertiary)]">({filtered.length})</span>
            </h3>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Store size={20} />}
                title="没有找到插件"
                description="尝试更换搜索词或选择其他分类。"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <MarketplaceCard
                    key={item.id}
                    item={item}
                    installing={installing === item.id}
                    onInstall={() => void handleInstall(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MarketplaceCard({
  item,
  featured = false,
  installing,
  onInstall
}: {
  item: MarketplaceItem
  featured?: boolean
  installing: boolean
  onInstall: () => void
}): React.JSX.Element {
  return (
    <div
      className={`flex flex-col rounded-lg border bg-[var(--bg-overlay)] p-4 transition-colors ${
        featured
          ? 'border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40'
      }`}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--bg-base)] text-xl">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-[var(--text-primary)]">
              {item.name}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">v{item.version}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>by {item.author}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Star size={9} className="fill-[var(--accent-warning,#f59e0b)] text-[var(--accent-warning,#f59e0b)]" />
              {item.rating}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Download size={9} />
              {item.downloads.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        {item.description}
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {item.tags.slice(0, 3).map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-tertiary)]">{item.size}</span>
        {item.installed ? (
          <span className="flex items-center gap-1 rounded-md border border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--accent-secondary)]">
            <Check size={10} />
            已安装
          </span>
        ) : (
          <button
            onClick={onInstall}
            disabled={installing}
            className="flex items-center gap-1 rounded-md bg-[var(--accent-primary)] px-2.5 py-1 text-[10px] font-medium text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-glow)] disabled:opacity-50"
          >
            {installing ? (
              <>
                <Loader2 size={10} className="animate-spin" />
                安装中
              </>
            ) : (
              <>
                <Download size={10} />
                安装
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
