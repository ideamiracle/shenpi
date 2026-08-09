// 首页数据汇总栏
export default function StatsBar({ stats }) {
  if (!stats) return null

  return (
    <div className="px-4 py-4 animate-fade-in">
      {/* 大盘数据 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
        <h3 className="text-sm font-medium text-white/80 mb-3">📊 购买审批大盘</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-bold">{stats.total_posts}</div>
            <div className="text-xs text-white/70">待审批</div>
          </div>
          <div>
            <div className="text-xl font-bold">{Math.round(stats.total_votes / 100) / 10}k+</div>
            <div className="text-xs text-white/70">总投票</div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.overall_approve_rate}%</div>
            <div className="text-xs text-white/70">综合批准率</div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.today_posts}</div>
            <div className="text-xs text-white/70">今日新增</div>
          </div>
        </div>
      </div>

      {/* 分类分布 */}
      {stats.category_stats && stats.category_stats.length > 0 && (
        <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-700 mb-2">📂 分类分布</h4>
          <div className="space-y-2">
            {stats.category_stats.slice(0, 6).map(cat => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12">{cat.category}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all"
                    style={{
                      width: `${Math.max(5, Math.round((cat.count / stats.total_posts) * 100))}%`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 热门申请 */}
      {stats.hot_posts && stats.hot_posts.length > 0 && (
        <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-700 mb-2">🔥 热门话题</h4>
          <div className="flex flex-wrap gap-2">
            {stats.hot_posts.slice(0, 5).map(p => (
              <span
                key={p.id}
                className="px-3 py-1 bg-orange-50 text-orange-600 text-xs rounded-full"
              >
                {p.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 最具争议 */}
      {stats.controversial_posts && stats.controversial_posts.length > 0 && (
        <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-700 mb-2">⚡ 最具争议</h4>
          <div className="flex flex-wrap gap-2">
            {stats.controversial_posts.slice(0, 5).map(p => (
              <span
                key={p.id}
                className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs rounded-full"
              >
                {p.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
