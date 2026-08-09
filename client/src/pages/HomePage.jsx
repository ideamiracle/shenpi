import { useState, useEffect, useRef } from 'react'
import { postApi, voteApi } from '../api'
import PostCard from '../components/PostCard'
import StatsBar from '../components/StatsBar'
import SkeletonCard from '../components/SkeletonCard'

// 分类列表
const CATEGORIES = ['全部', '服饰', '数码', '美妆', '家居', '食品', '奇葩', '其他']

// 排序选项
const SORT_OPTIONS = [
  { value: 'hot', label: '最热' },
  { value: 'new', label: '最新' },
  { value: 'controversial', label: '最具争议' },
]

// 统计缓存（5 分钟有效）
const statsCache = { data: null, timestamp: 0, ttl: 5 * 60 * 1000 };

// 首页
export default function HomePage({ onGoToDetail, user, requireLogin }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true) // 首次加载标记
  const [category, setCategory] = useState('全部')
  const [sort, setSort] = useState('hot')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState(null) // 汇总统计数据
  const [voteStatusMap, setVoteStatusMap] = useState({}) // 批量投票状态
  const loadMoreRef = useRef(null) // 无限滚动交点观察器

  // 加载申请列表
  useEffect(() => {
    loadPosts(true)
  }, [category, sort, refreshKey])

  // 加载申请列表
  const loadPosts = async (reset = false) => {
    if (loading) return

    const currentPage = reset ? 1 : page
    setLoading(true)

    try {
      // 全部类别时合并统计查询，减少一次 HTTP 请求
      const params = {
        page: currentPage,
        limit: 10,
        category: category === '全部' ? undefined : category,
        sort,
      };
      if (category === '全部') params.include_stats = 'true';

      const result = await postApi.getPosts(params);

      if (reset) {
        setPosts(result.posts)
        setPage(2)
      } else {
        setPosts(prev => [...prev, ...result.posts])
        setPage(prev => prev + 1)
      }

      setHasMore(result.posts.length === 10)

      // 从合并响应中获取统计或使用缓存
      if (result.stats) {
        setStats(result.stats);
        statsCache.data = result.stats;
        statsCache.timestamp = Date.now();
      } else if (category === '全部') {
        // 从缓存读取（带 TTL）
        if (statsCache.data && (Date.now() - statsCache.timestamp) < statsCache.ttl) {
          setStats(statsCache.data);
        }
      }

      // 批量获取投票状态
      if (user && result.posts.length > 0) {
        const postIds = result.posts.map(p => p.id);
        try {
          const statusMap = await voteApi.getBatchVoteStatus(user.id, postIds);
          setVoteStatusMap(prev => reset ? statusMap : { ...prev, ...statusMap });
        } catch (e) { /* 忽略 */ }
      }

      setInitialLoad(false);
    } catch (error) {
      console.error('加载失败:', error)
      setInitialLoad(false);
    } finally {
      setLoading(false)
    }
  }

  // 加载更多
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(false)
    }
  }

  // 刷新列表
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-center">
            🛒 买不买
            <span className="text-sm font-normal text-gray-500 ml-2">购买审批神器</span>
          </h1>
        </div>

        {/* 分类标签栏 */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 排序选项 */}
        <div className="px-4 pb-2 flex gap-4 border-b border-gray-100">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`text-sm pb-2 transition-colors ${
                sort === opt.value
                  ? 'text-indigo-600 font-medium border-b-2 border-indigo-600'
                  : 'text-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* 数据汇总（仅全部类别显示） */}
      {category === '全部' && stats && <StatsBar stats={stats} />}

      {/* 申请列表 */}
      <div className="px-4 py-4">
        {/* 骨架屏加载 */}
        {initialLoad && loading && (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        )}

        {/* 空状态 */}
        {!initialLoad && posts.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤷</div>
            <p className="text-gray-500">暂无申请</p>
            <p className="text-sm text-gray-400 mt-1">快来发起第一个购买申请吧！</p>
          </div>
        )}

        {/* 帖子列表 */}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onClick={onGoToDetail}
            user={user}
            requireLogin={requireLogin}
            voteStatus={voteStatusMap[post.id] ?? undefined}
          />
        ))}

        {/* 加载更多 */}
        {hasMore && !initialLoad && (
          <div className="text-center py-4" ref={loadMoreRef}>
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="text-indigo-600 text-sm hover:underline disabled:opacity-50"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            —— 到底啦 ——
          </div>
        )}
      </div>
    </div>
  )
}
