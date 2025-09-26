// Utilitários para gerenciar horários de funcionamento dos negócios
export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type DaySchedule = {
  open: string // HH:MM
  close: string // HH:MM
  closed: boolean
}

export type WeeklyHours = Record<DayKey, DaySchedule>

const defaultDay: DaySchedule = { open: '08:00', close: '22:00', closed: false }

export function defaultWeeklyHours(): WeeklyHours {
  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
    sunday: { ...defaultDay },
  }
}

// Função unificada para parsing de horários (consolidando ambas as implementações)
export function parseOpeningHours(input?: string | null): WeeklyHours {
  if (!input) return defaultWeeklyHours()
  
  try {
    const parsed = JSON.parse(input)
    const hours = defaultWeeklyHours()
    
    for (const key of Object.keys(hours) as DayKey[]) {
      if (parsed[key]) {
        const day = parsed[key]
        hours[key] = {
          open: typeof day.open === 'string' ? day.open : hours[key].open,
          close: typeof day.close === 'string' ? day.close : hours[key].close,
          closed: typeof day.closed === 'boolean' ? day.closed : hours[key].closed,
        }
      }
    }
    return hours
  } catch {
    // Fallback: string tipo "HH:MM - HH:MM" para todos os dias
    const match = input.match(/(\d{1,2}:\d{2}).*(\d{1,2}:\d{2})/)
    if (match) {
      const hours = defaultWeeklyHours()
      const [, open, close] = match
      for (const key of Object.keys(hours) as DayKey[]) {
        hours[key] = { open, close, closed: false }
      }
      return hours
    }
    return defaultWeeklyHours()
  }
}

// Função para verificar se o negócio está aberto agora
export function computeIsOpenNow(hours: WeeklyHours, now = new Date()): boolean {
  const dayIndex = now.getDay()
  const mapIndexToKey: DayKey[] = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const key = mapIndexToKey[dayIndex]
  const schedule = hours[key]
  
  if (!schedule || schedule.closed) return false
  
  const [openH, openM] = schedule.open.split(':').map(Number)
  const [closeH, closeM] = schedule.close.split(':').map(Number)

  const open = new Date(now)
  open.setHours(openH, openM, 0, 0)
  const close = new Date(now)
  close.setHours(closeH, closeM, 0, 0)

  // Suporte a período que cruza meia-noite (ex: 18:00 -> 02:00)
  if (close <= open) {
    const isAfterOpen = now >= open
    const isBeforeCloseNextDay = now <= close
    
    if (!isAfterOpen) {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yDayIndex = yesterday.getDay()
      const yKey = mapIndexToKey[yDayIndex]
      const ySchedule = hours[yKey]
      
      if (!ySchedule || ySchedule.closed) return isBeforeCloseNextDay
      
      const [yOpenH, yOpenM] = ySchedule.open.split(':').map(Number)
      const [yCloseH, yCloseM] = ySchedule.close.split(':').map(Number)
      const yOpen = new Date(yesterday)
      yOpen.setHours(yOpenH, yOpenM, 0, 0)
      const yClose = new Date(now)
      yClose.setHours(yCloseH, yCloseM, 0, 0)
      
      return now <= yClose && yCloseH < yOpenH
    }
    return true
  }

  return now >= open && now <= close
}

// Função unificada para verificar status do negócio
export function isBusinessOpen(isOpen: boolean, openingHours: string | null): boolean {
  if (!isOpen) return false
  if (!openingHours) return true
  
  const hours = parseOpeningHours(openingHours)
  return computeIsOpenNow(hours)
}

// Função para obter status detalhado do negócio
export function getBusinessStatus(isOpen: boolean, openingHours: string | null): {
  isCurrentlyOpen: boolean
  message: string
} {
  const isCurrentlyOpen = isBusinessOpen(isOpen, openingHours)
  
  if (!isOpen) {
    return {
      isCurrentlyOpen: false,
      message: 'Negócio temporariamente fechado'
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
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()] as DayKey
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