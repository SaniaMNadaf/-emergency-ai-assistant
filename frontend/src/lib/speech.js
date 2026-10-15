export class SpeechRecognizer {
  constructor(onResult, onError, onEnd) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition not supported')
    }
    this.recognition = new SpeechRecognition()
    this.recognition.lang = 'en-US'
    this.recognition.interimResults = false
    this.recognition.continuous = false
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult?.(transcript)
    }
    this.recognition.onerror = (event) => {
      onError?.(event.error)
    }
    this.recognition.onend = () => {
      onEnd?.()
    }
  }

  start() {
    this.recognition.start()
  }

  stop() {
    this.recognition.stop()
  }

  isListening() {
    return this.recognition ? this.recognition.active !== false : false
  }

  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }
}

export function speak(text, options = {}) {
  if (!window.speechSynthesis) {
    console.warn('speechSynthesis not supported')
    return false
  }
  const { lang = 'en-US', rate = 1, pitch = 1, volume = 1, onEnd } = options
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = volume
  utterance.onend = onEnd
  speechSynthesis.speak(utterance)
  return true
}

export function speakStop() {
  if (window.speechSynthesis) {
    speechSynthesis.cancel()
  }
}
