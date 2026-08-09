import { useState, useEffect } from 'react'
import { userApi, postApi } from '../api'

// 个人中心页
export default function ProfilePage({ user, onLogout, onGoToDetail }) {
  const [userInfo, setUserInfo] = useState(null)
  const [myPosts, setMyPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts') // posts, stats

  // 加载用户信息和我的申请
  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    setLoading(true)
    try {
      // 并行加载用户信息和申请列表
      const [userData, postsData] = await Promise.all([
        userApi.getUser(user.id),
        postApi.getPosts({ limit: 50 }), // 获取所有申请，后面会筛选
      ])

      setUserInfo(userData)

      // 筛选出用户的申请
      const myPostsList = postsData.posts.filter(p => p.author_id === user.id)
      setMyPosts(myPostsList)
    } catch (error) {
      console.error('加载用户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算统计数据
  const getStats = () => {
    if (!userInfo?.stats) return { postCount: 0, voteCount: 0, approveRate: 0 }

    const { post_count, vote_count, approve_count } = userInfo.stats
    const approveRate = vote_count > 0 ? Math.round((approve_count / vote_count) * 100) : 0

    return {
      postCount: post_count,
      voteCount: vote_count,
      approveRate,
    }
  }

  // 格式化价格
  const formatPrice = (price) => {
    return price.toLocaleString('zh-CN')
  }

  // 获取申请状态
  const getPostStatus = (post) => {
    const total = post.approve_count + post.reject_count
    if (total < 10) return { text: '进行中', color: 'bg-blue-100 text-blue-600' }
    const rate = Math.round((post.approve_count / total) * 100)
    if (rate >= 60) return { text: '已批准', color: 'bg-green-100 text-green-600' }
    return { text: '已驳回', color: 'bg-red-100 text-red-600' }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">👤</div>
        <p className="text-gray-500">请先登录</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        {/* 头部骨架 */}
        <div className="bg-indigo-600 pt-12 pb-8 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-24 bg-white/20 rounded" />
            <div className="h-8 w-20 bg-white/20 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20" />
            <div className="space-y-2">
              <div className="h-6 w-24 bg-white/20 rounded" />
              <div className="h-4 w-32 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        {/* 统计卡片骨架 */}
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-lg p-4 grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2"><div className="h-8 w-12 bg-gray-200 rounded" /><div className="h-3 w-12 bg-gray-200 rounded" /></div>
            <div className="flex flex-col items-center gap-2"><div className="h-8 w-12 bg-gray-200 rounded" /><div className="h-3 w-12 bg-gray-200 rounded" /></div>
            <div className="flex flex-col items-center gap-2"><div className="h-8 w-12 bg-gray-200 rounded" /><div className="h-3 w-12 bg-gray-200 rounded" /></div>
          </div>
        </div>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 Header */}
      <header className="bg-indigo-600 text-white pt-12 pb-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">个人中心</h1>
          <button
            onClick={onLogout}
            className="text-sm bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30"
          >
            退出登录
          </button>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-2xl font-bold">
            {userInfo?.nickname?.[0] || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{userInfo?.nickname || '用户'}</h2>
            <p className="text-white/70 text-sm mt-1">
              {stats.postCount} 个申请 · {stats.voteCount} 次投票
            </p>
          </div>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.postCount}</div>
            <div className="text-xs text-gray-500 mt-1">发起申请</div>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="text-2xl font-bold text-green-600">{stats.voteCount}</div>
            <div className="text-xs text-gray-500 mt-1">参与投票</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.approveRate}%</div>
            <div className="text-xs text-gray-500 mt-1">我的批准率</div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'posts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            我的申请
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            投票统计
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 pb-20">
        {activeTab === 'posts' ? (
          // 我的申请列表
          myPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-500">还没有发起过申请</p>
              <p className="text-sm text-gray-400 mt-1">快去发起第一个购买申请吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPosts.map(post => {
                const status = getPostStatus(post)
                const total = post.approve_count + post.reject_count
                const rate = total > 0 ? Math.round((post.approve_count / total) * 100) : 0

                return (
                  <div
                    key={post.id}
                    onClick={() => onGoToDetail(post.id)}
                    className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 flex-1">{post.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>¥{formatPrice(post.price)}</span>
                      <span>{total} 票 · 批准率 {rate}%</span>
                    </div>
                    <div className="mt-2 progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          // 投票统计
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-500">投票统计功能开发中</p>
            <p className="text-sm text-gray-400 mt-1">敬请期待！</p>
          </div>
        )}
      </div>
    </div>
  )
}
