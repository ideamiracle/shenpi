import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import DetailPage from './pages/DetailPage'
import CreatePage from './pages/CreatePage'
import ProfilePage from './pages/ProfilePage'
import LoginModal from './components/LoginModal'
import { storage, userApi } from './api'

function App() {
  // 当前页面：home, detail, create, profile
  const [currentPage, setCurrentPage] = useState('home')
  // 当前查看的申请ID
  const [currentPostId, setCurrentPostId] = useState(null)
  // 用户信息
  const [user, setUser] = useState(null)
  // 是否显示登录弹窗
  const [showLogin, setShowLogin] = useState(false)
  // 登录后需要执行的回调
  const [loginCallback, setLoginCallback] = useState(null)

  // 初始化：检查本地存储的用户
  useEffect(() => {
    const savedUser = storage.getUser()
    if (savedUser) {
      setUser(savedUser)
    }
  }, [])

  // 导航到详情页
  const goToDetail = (postId) => {
    setCurrentPostId(postId)
    setCurrentPage('detail')
  }

  // 导航到首页
  const goToHome = () => {
    setCurrentPage('home')
    setCurrentPostId(null)
  }

  // 导航到创建页
  const goToCreate = () => {
    if (!user) {
      requireLogin(() => {
        setCurrentPage('create')
      })
      return
    }
    setCurrentPage('create')
  }

  // 导航到个人中心
  const goToProfile = () => {
    if (!user) {
      requireLogin(() => {
        setCurrentPage('profile')
      })
      return
    }
    setCurrentPage('profile')
  }

  // 需要登录时调用
  const requireLogin = (callback) => {
    setLoginCallback(() => callback)
    setShowLogin(true)
  }

  // 处理登录
  const handleLogin = async (nickname) => {
    try {
      const newUser = await userApi.login(nickname)
      setUser(newUser)
      storage.setUser(newUser)
      setShowLogin(false)
      if (loginCallback) {
        loginCallback()
        setLoginCallback(null)
      }
    } catch (error) {
      console.error('登录失败:', error)
      alert('登录失败，请重试')
    }
  }

  // 退出登录
  const handleLogout = () => {
    setUser(null)
    storage.clearUser()
    goToHome()
  }

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onGoToDetail={goToDetail} user={user} requireLogin={requireLogin} />
      case 'detail':
        return <DetailPage postId={currentPostId} onBack={goToHome} user={user} requireLogin={requireLogin} />
      case 'create':
        return <CreatePage onBack={goToHome} user={user} onCreated={(postId) => goToDetail(postId)} />
      case 'profile':
        return <ProfilePage user={user} onLogout={handleLogout} onGoToDetail={goToDetail} />
      default:
        return <HomePage onGoToDetail={goToDetail} user={user} requireLogin={requireLogin} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 主内容区域 */}
      <div className="flex-1 pb-16">
        {renderPage()}
      </div>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around h-16">
          {/* 首页 */}
          <button
            onClick={goToHome}
            className={`flex flex-col items-center justify-center w-16 h-full ${
              currentPage === 'home' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">首页</span>
          </button>

          {/* 发起申请（中间大按钮） */}
          <button
            onClick={goToCreate}
            className="relative -mt-6"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
              currentPage === 'create' ? 'bg-indigo-700' : 'bg-indigo-600'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs text-gray-500 mt-1 block text-center">发起</span>
          </button>

          {/* 个人中心 */}
          <button
            onClick={goToProfile}
            className={`flex flex-col items-center justify-center w-16 h-full ${
              currentPage === 'profile' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">我的</span>
          </button>
        </div>
      </nav>

      {/* 登录弹窗 */}
      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => {
            setShowLogin(false)
            setLoginCallback(null)
          }}
        />
      )}
    </div>
  )
}

export default App
