// 骨架屏卡片组件 — 加载时显示，提升感知速度
export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm animate-pulse">
      {/* 头部骨架：头像 + 昵称 + 时间 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-16 ml-auto" />
      </div>
      {/* 内容区域骨架：图片 + 文字 */}
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-6 bg-gray-200 rounded w-24" />
        </div>
      </div>
      {/* 投票进度条骨架 */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full w-full" />
      {/* 投票按钮骨架 */}
      <div className="flex gap-2 mt-3">
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
