export default function DesktopLayout({ children }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      {children}
    </div>
  )
}
