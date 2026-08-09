import { useState, useEffect } from 'react'
import { postApi, voteApi, commentApi } from '../api'

// 申请详情页
export default function DetailPage({ postId, onBack, user, requireLogin }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voteStatus, setVoteStatus] = useState(null)
  const [approveCount, setApproveCount] = useState(0)
  const [rejectCount, setRejectCount] = useState(0)
  const [isVoting, setIsVoting] = useState(false)
  const [animateType, setAnimateType] = useState(null)

  // 评论相关
  const [comments, setComments] = useState([])
  const [commentFilter, setCommentFilter] = useState('all')
  const [commentSort, setCommentSort] = useState('hot')
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 回复状态
  const [replyTo, setReplyTo] = useState(null) // { id, name } 正在回复的评论

  // 加载申请详情
  useEffect(() => {
    loadPost()
  }, [postId])

  // 加载评论
  useEffect(() => {
    if (postId) loadComments()
  }, [postId, commentFilter, commentSort])

  // 加载申请详情
  const loadPost = async () => {
    setLoading(true)
    try {
      const data = await postApi.getPost(postId)
      setPost(data)
      setApproveCount(data.approve_count)
      setRejectCount(data.reject_count)

      if (user) {
        const voteRes = await voteApi.getVoteStatus(postId, user.id)
        setVoteStatus(voteRes.voted)
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载评论
  const loadComments = async () => {
    try {
      const data = await commentApi.getComments(postId, {
        type: commentFilter === 'all' ? undefined : commentFilter,
        sort: commentSort,
      })
      setComments(data)
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  // 处理投票
  const handleVote = async (type) => {
    if (!user) { requireLogin(); return }
    if (isVoting) return
    setIsVoting(true)

    try {
      const result = await voteApi.vote(postId, user.id, type)
      if (result.action === 'added') {
        setVoteStatus(type)
        if (type === 'approve') setApproveCount(prev => prev + 1)
        else setRejectCount(prev => prev + 1)
      } else if (result.action === 'removed') {
        setVoteStatus(null)
        if (type === 'approve') setApproveCount(prev => prev - 1)
        else setRejectCount(prev => prev - 1)
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

      setAnimateType(type)
      setTimeout(() => setAnimateType(null), 300)
      loadComments()
    } catch (error) {
      console.error('投票失败:', error)
    } finally {
      setIsVoting(false)
    }
  }

  // 提交评论（普通评论或回复）
  const handleSubmitComment = async () => {
    if (!user) { requireLogin(); return }
    if (!newComment.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const comment = await commentApi.createComment(
        postId, user.id, newComment.trim(),
        replyTo?.id || null,    // parent_id
        replyTo?.name || null   // reply_to_name
      )
      setComments(prev => [comment, ...prev])
      setNewComment('')
      setReplyTo(null) // 清除回复状态
      setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }))
    } catch (error) {
      console.error('评论失败:', error)
      alert('评论失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 开始回复某条评论
  const handleStartReply = (comment) => {
    if (!user) { requireLogin(); return }
    setReplyTo({ id: comment.id, name: comment.author_name })
    setNewComment(`@${comment.author_name} `)
    // 聚焦输入框
    setTimeout(() => {
      const input = document.getElementById('comment-input')
      if (input) input.focus()
    }, 100)
  }

  // 取消回复
  const handleCancelReply = () => {
    setReplyTo(null)
    setNewComment('')
  }

  // 点赞评论
  const handleLikeComment = async (commentId) => {
    if (!user) { requireLogin(); return }
    try {
      const result = await commentApi.likeComment(commentId, user.id)
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return { ...c, like_count: result.liked ? c.like_count + 1 : c.like_count - 1 }
          }
          return c
        })
      )
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 组织评论树：顶层评论和它们的回复
  const organizeComments = () => {
    const topLevel = []     // 顶层评论
    const repliesMap = {}   // parent_id -> replies

    comments.forEach(c => {
      if (!c.parent_id) {
        topLevel.push(c)
      } else {
        if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = []
        repliesMap[c.parent_id].push(c)
      }
    })

    return { topLevel, repliesMap }
  }

  // 判断是否是博主（申请作者）
  const isAuthor = (commentUserId) => {
    return post && commentUserId === post.author_id
  }

  const formatPrice = (price) => price.toLocaleString('zh-CN')

  const totalCount = approveCount + rejectCount
  const approveRate = totalCount > 0 ? Math.round((approveCount / totalCount) * 100) : 50

  const getResultText = () => {
    if (totalCount < 10) return '还需要更多人投票才能出结果哦~'
    if (approveRate >= 80) return '🎉 全票通过，放心冲！'
    if (approveRate >= 60) return '👍 大部分人支持，可以考虑入手'
    if (approveRate >= 40) return '🤔 争议较大，建议再想想'
    if (approveRate >= 20) return '⚠️ 反对声音较多，谨慎考虑'
    return '🚫 驳回率超高，劝你收手！'
  }

  // 渲染单条评论
  const renderComment = (comment, isReply = false) => {
    const isPostAuthor = isAuthor(comment.user_id)

    return (
      <div key={comment.id} className={`animate-fade-in ${isReply ? 'ml-10 mt-2' : ''}`}>
        <div className="flex items-start gap-3">
          {/* 头像 */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
            isPostAuthor
              ? 'border-yellow-400 bg-yellow-100 text-yellow-700'
              : comment.vote_type === 'approve'
                ? 'bg-green-100 text-green-600'
                : comment.vote_type === 'reject'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
          }`}>
            {comment.author_name?.[0] || '?'}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                {comment.author_name}
              </span>
              {/* 博主标识 */}
              {isPostAuthor && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-400 text-yellow-800 rounded font-bold">
                  博主
                </span>
              )}
              {comment.vote_type && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  comment.vote_type === 'approve'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {comment.vote_type === 'approve' ? '批准' : '不批'}
                </span>
              )}
            </div>

            {/* 回复对象 */}
            {comment.reply_to_name && (
              <span className="text-xs text-indigo-500">
                回复 @{comment.reply_to_name}
              </span>
            )}

            <p className="text-sm text-gray-600 mt-1">{comment.content}</p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                ❤️ {comment.like_count || 0}
              </button>
              {/* 回复按钮 */}
              <button
                onClick={() => handleStartReply(comment)}
                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
              >
                💬 回复
              </button>
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        {/* 顶部导航骨架 */}
        <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="w-12" />
        </div>
        {/* 内容骨架 */}
        <div className="bg-white p-4 mb-2 space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="flex justify-between">
            <div className="h-7 bg-gray-200 rounded w-1/2" />
            <div className="h-7 bg-gray-200 rounded w-24" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-full" />
          <div className="flex gap-3">
            <div className="flex-1 h-14 bg-gray-200 rounded-xl" />
            <div className="flex-1 h-14 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-500">申请不存在</p>
        <button onClick={onBack} className="mt-4 text-indigo-600">返回首页</button>
      </div>
    )
  }

  const { topLevel, repliesMap } = organizeComments()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center text-gray-600">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <span className="font-medium">申请详情</span>
          <div className="w-12" />
        </div>
      </header>

      {/* 申请内容 */}
      <div className="bg-white p-4 mb-2">
        {/* 图片轮播 */}
        {post.images && post.images.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <div className="flex gap-2 overflow-x-auto snap-x">
              {post.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${post.title} ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-64 object-cover flex-shrink-0 snap-center"
                />
              ))}
            </div>
          </div>
        )}

        {/* 物品信息 */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-gray-900 flex-1">{post.title}</h1>
            <span className="text-2xl font-bold text-red-500 ml-4">
              ¥{formatPrice(post.price)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-yellow-400 bg-yellow-100 text-yellow-700`}>
              {post.anonymous ? '匿' : (post.author_name?.[0] || '?')}
            </span>
            <span>{post.anonymous ? '匿名用户' : post.author_name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-yellow-400 text-yellow-800 rounded font-bold">博主</span>
            <span>·</span>
            <span>{post.category}</span>
          </div>
        </div>

        {/* 购买理由 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">💭 购买理由</h3>
          <p className="text-gray-600 leading-relaxed">{post.reason}</p>
        </div>

        {/* 投票统计 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-600 font-bold text-lg">批准 {approveRate}%</span>
            <span className="text-gray-500 text-sm">共 {totalCount} 票</span>
          </div>
          <div className="progress-bar h-3 rounded-full">
            <div
              className="progress-bar-fill rounded-full"
              style={{ width: `${approveRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-green-600">✅ {approveCount} 票</span>
            <span className="text-red-500">❌ {rejectCount} 票</span>
          </div>
        </div>

        {/* 趣味结论 */}
        <div className="bg-indigo-50 rounded-xl p-3 text-center text-indigo-700 mb-4">
          {getResultText()}
        </div>

        {/* 投票按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => handleVote('approve')}
            disabled={isVoting}
            className={`flex-1 py-3.5 rounded-xl font-bold text-lg transition-all ${
              voteStatus === 'approve'
                ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            } ${animateType === 'approve' ? 'animate-pulse-once' : ''}`}
          >
            ✅ 批准
          </button>
          <button
            onClick={() => handleVote('reject')}
            disabled={isVoting}
            className={`flex-1 py-3.5 rounded-xl font-bold text-lg transition-all ${
              voteStatus === 'reject'
                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            } ${animateType === 'reject' ? 'animate-pulse-once' : ''}`}
          >
            ❌ 不批
          </button>
        </div>
      </div>

      {/* 评论区 */}
      <div className="bg-white p-4">
        <h3 className="font-bold text-lg mb-3">💬 讨论区 ({post.comment_count})</h3>

        {/* 评论筛选 */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setCommentFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              commentFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setCommentFilter('approve')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              commentFilter === 'approve' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            👍 批准方
          </button>
          <button
            onClick={() => setCommentFilter('reject')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              commentFilter === 'reject' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            👎 不批方
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setCommentSort(prev => prev === 'hot' ? 'new' : 'hot')}
            className="text-sm text-gray-500 whitespace-nowrap"
          >
            {commentSort === 'hot' ? '🔥 最热' : '🕐 最新'}
          </button>
        </div>

        {/* 评论输入框 */}
        <div className="mb-4">
          {/* 回复提示 */}
          {replyTo && (
            <div className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-t-xl text-sm">
              <span className="text-indigo-600">
                回复 @{replyTo.name}
              </span>
              <button onClick={handleCancelReply} className="text-gray-400 hover:text-gray-600">
                取消
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              id="comment-input"
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? (replyTo ? `回复 @${replyTo.name}...` : "说说你的看法...") : "登录后发表看法"}
              className={`flex-1 px-4 py-2.5 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                replyTo ? 'rounded-b-xl rounded-tr-none' : 'rounded-xl'
              }`}
              maxLength={200}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              onClick={() => !user && requireLogin()}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              {isSubmitting ? '发送中' : '发送'}
            </button>
          </div>
        </div>

        {/* 评论列表（树形结构） */}
        {topLevel.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>暂无评论</p>
            <p className="text-sm mt-1">快来和博主聊聊吧！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topLevel.map(comment => (
              <div key={comment.id}>
                {/* 顶层评论 */}
                {renderComment(comment)}

                {/* 该评论的回复 */}
                {repliesMap[comment.id] && (
                  <div className="mt-2">
                    {repliesMap[comment.id].map(reply => renderComment(reply, true))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部留白 */}
      <div className="h-20" />
    </div>
  )
}
