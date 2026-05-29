import { useEffect, useState } from 'react'
import { getTypewriterText } from '../lib/typewriter'

export function useTypewriter(text: string, speed = 18, enabled = true) {
  const [visibleCharacters, setVisibleCharacters] = useState(() =>
    enabled ? 0 : text.length,
  )

  useEffect(() => {
    if (!enabled || !text) {
      return
    }

    const timer = window.setInterval(() => {
      setVisibleCharacters((current) => {
        if (current >= text.length) {
          window.clearInterval(timer)
          return current
        }

        return current + 1
      })
    }, speed)

    return () => window.clearInterval(timer)
  }, [enabled, speed, text])

  return {
    text: enabled ? getTypewriterText(text, visibleCharacters) : text,
    isTyping: enabled && visibleCharacters < text.length,
  }
}
