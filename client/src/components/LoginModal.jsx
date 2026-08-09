import { useState } from 'react'

// 登录弹窗组件
export default function LoginModal({ onLogin, onClose }) {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  // 处理登录
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onLogin(nickname.trim() || undefined)
    } finally {
      setLoading(false)
    }
  }

  // 游客模式直接进入
  const handleGuest = async () => {
    setLoading(true)
    try {
      await onLogin()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl w-[90%] max-w-sm p-6 animate-bounce-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">👋 欢迎来到买不买</h2>
          <p className="text-gray-500 mt-2">登录后即可发起申请和投票</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              你的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="取个好听的名字吧~"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '开始使用'}
          </button>
        </form>

        {/* 游客模式 */}
        <button
          onClick={handleGuest}
          disabled={loading}
          className="w-full mt-3 py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          随便逛逛，先不登录
        </button>
      </div>
    </div>
  )
}
