type OrbitPulseProps = {
  size?: number
  label?: string
}

export default function OrbitPulse({ size = 24, label = 'Thinking...' }: OrbitPulseProps) {
  const dotSize = Math.round(size / 6)
  const ringRadius = size / 2

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid #d6d3d1',
            animation: 'orbit-pulse 2s ease-in-out infinite',
          }}
        />
        {/* Orbiting dot */}
        <div
          className="absolute"
          style={{
            width: size,
            height: size,
            animation: 'orbit-spin 1.5s linear infinite',
          }}
        >
          <div
            className="rounded-full bg-teal-500"
            style={{
              width: dotSize,
              height: dotSize,
              position: 'absolute',
              top: 0,
              left: ringRadius - dotSize / 2,
            }}
          />
        </div>
      </div>
      {label && (
        <span className="text-[12px] italic text-white/34">
          {label}
        </span>
      )}
    </div>
  )
}
