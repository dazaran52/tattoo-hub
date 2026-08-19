export default function BackgroundGlow() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-500/10 dark:bg-primary-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
      <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-accent-500/10 dark:bg-accent-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob" style={{ animationDelay: '4s' }}></div>
    </div>
  )
}
