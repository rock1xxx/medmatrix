import confetti from 'canvas-confetti'

export function triggerLockCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors: ['#10b981', '#34d399', '#f59e0b', '#38bdf8', '#8b5cf6'],
  })
}

export function triggerMasteredCelebration() {
  const duration = 2.5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#e11d48'],
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#8b5cf6', '#38bdf8', '#fbbf24', '#10b981'],
    })
  }, 250)
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}
