// Utilitários para gerenciar horário de funcionamento dos restaurantes

interface OpeningHours {
  monday: { open: string; close: string; closed: boolean }
  tuesday: { open: string; close: string; closed: boolean }
  wednesday: { open: string; close: string; closed: boolean }
  thursday: { open: string; close: string; closed: boolean }
  friday: { open: string; close: string; closed: boolean }
  saturday: { open: string; close: string; closed: boolean }
  sunday: { open: string; close: string; closed: boolean }
}

export function parseOpeningHours(openingHoursString: string | null): OpeningHours | null {
  if (!openingHoursString) return null
  
  try {
    return JSON.parse(openingHoursString) as OpeningHours
  } catch {
    return null
  }
}

export function isRestaurantOpen(isOpen: boolean, openingHours: string | null): boolean {
  // Se o restaurante está marcado como fechado, sempre fechado
  if (!isOpen) return false
  
  // Se não há horários configurados, considerar sempre aberto
  if (!openingHours) return true
  
  const hours = parseOpeningHours(openingHours)
  if (!hours) return true
  
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()] as keyof OpeningHours
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM
  
  const daySchedule = hours[currentDay]
  
  // Se está fechado neste dia
  if (daySchedule.closed) return false
  
  // Verificar se está dentro do horário
  const openTime = daySchedule.open
  const closeTime = daySchedule.close
  
  // Caso especial: horário que cruza meia-noite (ex: 22:00 - 02:00)
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime
  }
  
  // Horário normal no mesmo dia
  return currentTime >= openTime && currentTime <= closeTime
}

export function getRestaurantStatus(isOpen: boolean, openingHours: string | null): {
  isCurrentlyOpen: boolean
  message: string
} {
  const isCurrentlyOpen = isRestaurantOpen(isOpen, openingHours)
  
  if (!isOpen) {
    return {
      isCurrentlyOpen: false,
      message: 'Restaurante temporariamente fechado'
    }
  }
  
  if (!openingHours) {
    return {
      isCurrentlyOpen: true,
      message: 'Aberto 24 horas'
    }
  }
  
  if (isCurrentlyOpen) {
    return {
      isCurrentlyOpen: true,
      message: 'Aberto agora'
    }
  }
  
  const hours = parseOpeningHours(openingHours)
  if (!hours) {
    return {
      isCurrentlyOpen: true,
      message: 'Aberto'
    }
  }
  
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()] as keyof OpeningHours
  const daySchedule = hours[currentDay]
  
  if (daySchedule.closed) {
    return {
      isCurrentlyOpen: false,
      message: 'Fechado hoje'
    }
  }
  
  return {
    isCurrentlyOpen: false,
    message: `Abre às ${daySchedule.open}`
  }
}