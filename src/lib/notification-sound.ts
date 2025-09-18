// Definir tipos para compatibilidade com diferentes navegadores
interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext
}

// Função para gerar e tocar um som de notificação programaticamente
export const playNotificationSound = () => {
  try {
    // Criar um contexto de áudio
    const windowWithWebkit = window as WindowWithWebkitAudioContext
    const audioContext = new (window.AudioContext || windowWithWebkit.webkitAudioContext || AudioContext)()
    
    // Criar um oscilador para gerar o tom
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Conectar o oscilador ao ganho e ao destino
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configurar o som (tom duplo como notificação)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    
    // Configurar o volume com fade in/out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
    
    // Tocar o som
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
    
  } catch (error) {
    console.log('Não foi possível tocar o som de notificação:', error)
  }
}

// Função alternativa usando beep simples (fallback)
export const playSimpleBeep = () => {
  try {
    const windowWithWebkit = window as WindowWithWebkitAudioContext
    const audioContext = new (window.AudioContext || windowWithWebkit.webkitAudioContext || AudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch (error) {
    console.log('Não foi possível tocar o beep:', error)
  }
}
