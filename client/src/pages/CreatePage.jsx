import { useState } from 'react'
import { postApi } from '../api'

// 分类列表
const CATEGORIES = ['服饰', '数码', '美妆', '家居', '食品', '奇葩', '其他']

// 发起申请页
export default function CreatePage({ onBack, user, onCreated }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [images, setImages] = useState([]) // File 对象数组
  const [imagePreviews, setImagePreviews] = useState([]) // 预览 URL 数组
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 处理图片选择
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + imagePreviews.length > 3) {
      alert('最多只能上传 3 张图片')
      return
    }

    // 添加图片
    setImages(prev => [...prev, ...files])

    // 生成预览
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  // 删除图片
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // 处理价格输入（只允许数字和小数点）
  const handlePriceChange = (e) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrice(value)
    }
  }

  // 提交申请
  const handleSubmit = async () => {
    // 验证表单
    if (!title.trim()) {
      alert('请输入物品名称')
      return
    }
    if (!price || Number(price) <= 0) {
      alert('请输入有效价格')
      return
    }
    if (!reason.trim()) {
      alert('请输入购买理由')
      return
    }
    if (reason.trim().length < 10) {
      alert('购买理由至少 10 个字')
      return
    }
    if (!category) {
      alert('请选择分类')
      return
    }

    setIsSubmitting(true)

    try {
      // 构建 JSON 数据（图片用 base64）
      const result = await postApi.createPost({
        title: title.trim(),
        price: Number(price),
        reason: reason.trim(),
        category,
        anonymous,
        author_id: user.id,
        images: imagePreviews, // base64 图片数组
      })
      alert('发布成功！')
      onCreated(result.id)
    } catch (error) {
      console.error('发布失败:', error)
      alert('发布失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="text-gray-600">
            取消
          </button>
          <span className="font-bold text-lg">发起购买申请</span>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-indigo-600 font-medium disabled:opacity-50"
          >
            {isSubmitting ? '发布中...' : '发布'}
          </button>
        </div>
      </header>

      {/* 表单内容 */}
      <div className="p-4 space-y-4">
        {/* 图片上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📷 物品图片（最多 3 张）
          </label>
          <div className="flex gap-3 overflow-x-auto">
            {/* 已上传的图片预览 */}
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={preview}
                  alt={`预览 ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}

            {/* 添加图片按钮 */}
            {imagePreviews.length < 3 && (
              <label className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-400 mt-1">添加图片</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 物品名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🏷️ 物品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="你想买什么？"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={50}
          />
          <div className="text-xs text-gray-400 text-right mt-1">{title.length}/50</div>
        </div>

        {/* 价格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💰 价格 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
            <input
              type="text"
              value={price}
              onChange={handlePriceChange}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 分类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📂 分类 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
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

        {/* 购买理由 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            💭 购买理由 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="说说你为什么想买它？至少 10 个字~"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            maxLength={200}
          />
          <div className="text-xs text-gray-400 text-right mt-1">{reason.length}/200</div>
        </div>

        {/* 匿名开关 */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-700">🎭 匿名发布</span>
            <p className="text-xs text-gray-400 mt-0.5">开启后其他人看不到你的昵称</p>
          </div>
          <button
            onClick={() => setAnonymous(!anonymous)}
            className={`w-12 h-7 rounded-full transition-colors ${
              anonymous ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
              anonymous ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* 发布按钮 */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
        >
          {isSubmitting ? '发布中...' : '🚀 发布申请'}
        </button>

        {/* 提示 */}
        <p className="text-xs text-gray-400 text-center">
          发布后将由全网用户投票决定是否批准购买
        </p>
      </div>

      {/* 底部留白 */}
      <div className="h-20" />
    </div>
  )
}
