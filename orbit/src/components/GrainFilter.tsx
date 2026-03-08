export default function GrainFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </svg>
  )
}
