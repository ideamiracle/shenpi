import { useState, useEffect } from 'react'
import { voteApi } from '../api'

// 分类标签颜色映射
const categoryColors = {
  '服饰': 'bg-pink-100 text-pink-700',
  '数码': 'bg-blue-100 text-blue-700',
  '美妆': 'bg-purple-100 text-purple-700',
  '家居': 'bg-green-100 text-green-700',
  '食品': 'bg-yellow-100 text-yellow-700',
  '奇葩': 'bg-orange-100 text-orange-700',
  '其他': 'bg-gray-100 text-gray-700',
}

// 申请卡片组件
export default function PostCard({ post, onClick, user, requireLogin, voteStatus: initialVoteStatus }) {
  const [voteStatus, setVoteStatus] = useState(initialVoteStatus ?? null) // 用户的投票状态
  const [approveCount, setApproveCount] = useState(post.approve_count)
  const [rejectCount, setRejectCount] = useState(post.reject_count)
  const [isVoting, setIsVoting] = useState(false)
  const [animateType, setAnimateType] = useState(null)

  // 计算批准率
  const totalCount = approveCount + rejectCount
  const approveRate = totalCount > 0 ? Math.round((approveCount / totalCount) * 100) : 50

  // 同步外部投票状态
  useEffect(() => {
    if (initialVoteStatus !== undefined) {
      setVoteStatus(initialVoteStatus);
    }
  }, [initialVoteStatus]);

  // 仅在未传入投票状态时单独获取
  useEffect(() => {
    if (initialVoteStatus === undefined && user) {
      voteApi.getVoteStatus(post.id, user.id).then(res => {
        setVoteStatus(res.voted)
      }).catch(() => {})
    }
  }, [post.id, user, initialVoteStatus])

  // 处理投票
  const handleVote = async (e, type) => {
    e.stopPropagation() // 阻止冒泡，避免触发卡片点击

    if (!user) {
      requireLogin()
      return
    }

    if (isVoting) return
    setIsVoting(true)

    try {
      const result = await voteApi.vote(post.id, user.id, type)

      // 更新本地状态
      if (result.action === 'added') {
        setVoteStatus(type)
        if (type === 'approve') {
          setApproveCount(prev => prev + 1)
        } else {
          setRejectCount(prev => prev + 1)
        }
      } else if (result.action === 'removed') {
        setVoteStatus(null)
        if (type === 'approve') {
          setApproveCount(prev => prev - 1)
        } else {
          setRejectCount(prev => prev - 1)
        }
      } else if (result.action === 'changed') {
        setVoteStatus(type)
        if (type === 'approve') {
          setApproveCount(prev => prev + 1)
          setRejectCount(prev => prev - 1)
        } else {
          setApproveCount(prev => prev - 1)
          setRejectCount(prev => prev + 1)
        }
      }

      // 播放动画
      setAnimateType(type)
      setTimeout(() => setAnimateType(null), 300)
    } catch (error) {
      console.error('投票失败:', error)
    } finally {
      setIsVoting(false)
    }
  }

  // 格式化价格
  const formatPrice = (price) => {
    return price.toLocaleString('zh-CN')
  }

  // 格式化时间
  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div
      onClick={() => onClick(post.id)}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
    >
      {/* 头部：头像 + 昵称 + 时间 + 分类 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
            {post.anonymous ? '匿' : (post.author_name?.[0] || '?')}
          </div>
          <span className="text-sm text-gray-600">
            {post.anonymous ? '匿名用户' : post.author_name}
          </span>
          <span className="text-xs text-gray-400">{formatTime(post.created_at)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[post.category] || categoryColors['其他']}`}>
          {post.category}
        </span>
      </div>

      {/* 内容区域 */}
      <div className="flex gap-3">
        {/* 图片（如果有） */}
        {post.images && post.images.length > 0 && (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={post.images[0]}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 文字内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base mb-1 truncate">
            {post.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {post.reason}
          </p>
          <div className="text-lg font-bold text-red-500">
            ¥{formatPrice(post.price)}
          </div>
        </div>
      </div>

      {/* 投票进度条 */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-green-600 font-medium">批准 {approveRate}%</span>
          <span className="text-gray-400">{totalCount} 票</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${approveRate}%` }}
          />
        </div>
      </div>

      {/* 投票按钮 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => handleVote(e, 'approve')}
          disabled={isVoting}
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
            voteStatus === 'approve'
              ? 'bg-green-500 text-white shadow-md shadow-green-200'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          } ${animateType === 'approve' ? 'animate-pulse-once' : ''}`}
        >
          ✅ 批准 {approveCount}
        </button>
        <button
          onClick={(e) => handleVote(e, 'reject')}
          disabled={isVoting}
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
            voteStatus === 'reject'
              ? 'bg-red-500 text-white shadow-md shadow-red-200'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          } ${animateType === 'reject' ? 'animate-pulse-once' : ''}`}
        >
          ❌ 不批 {rejectCount}
        </button>
      </div>

      {/* 评论数 */}
      <div className="mt-2 text-xs text-gray-400 text-right">
        💬 {post.comment_count} 条评论
      </div>
    </div>
  )
}
