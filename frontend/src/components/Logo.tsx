/** Логотип AutoMind: тёмно-синий квадрат с оранжевым маршрутом и белой точкой старта. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#1B2A4A" />
      <path
        d="M13 32 C 20 32, 17 17.5, 26 16.5 C 30 16, 33 15.8, 36 15.5"
        stroke="#F5A623"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="13" cy="32" r="4" fill="#fff" />
    </svg>
  )
}

/** Логотип с вордмарком: иконка + «AutoMind» (Auto — жирный, Mind — обычный). */
export function Logo({
  size = 28,
  wordmarkSize = 18,
  withWordmark = true,
}: {
  size?: number
  wordmarkSize?: number
  withWordmark?: boolean
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className="whitespace-nowrap leading-none"
          style={{ color: '#1B2A4A', fontSize: wordmarkSize }}
        >
          <span className="font-bold">Auto</span>
          <span className="font-normal">Mind</span>
        </span>
      )}
    </span>
  )
}
