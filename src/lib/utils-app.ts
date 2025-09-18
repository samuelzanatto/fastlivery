// Funções utilitárias para o sistema
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function buildPublicStoreUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/${slug}`
}
export function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `${year}${month}${day}${random}`
}

export function generateQRCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

// ----- Horários de funcionamento -----
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

export function computeIsOpenNow(hours: WeeklyHours, now = new Date()): boolean {
  // Considerar dia da semana 0=Domingo ... 6=Sábado
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
    // janela cruza dia
    const isAfterOpen = now >= open
    const isBeforeCloseNextDay = now <= close
    // Se agora antes de close, considerar close no dia seguinte
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
      return now <= yClose && yCloseH < yOpenH // heurística simples
    }
    return true
  }

  return now >= open && now <= close
}
