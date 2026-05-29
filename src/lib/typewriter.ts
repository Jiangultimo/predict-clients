export function getTypewriterText(text: string, visibleCharacters: number) {
  return text.slice(0, Math.max(0, visibleCharacters))
}
