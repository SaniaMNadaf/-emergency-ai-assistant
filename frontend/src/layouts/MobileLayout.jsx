export default function MobileLayout({ children }) {
  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', width: '100%', minHeight: '100vh', position: 'relative' }}>
      {children}
    </div>
  )
}
