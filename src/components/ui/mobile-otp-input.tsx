"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MobileOTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  className?: string
}

export function MobileOTPInput({
  value = "",
  onChange,
  length = 6,
  disabled = false,
  className
}: MobileOTPInputProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // Garantir que o array de refs tem o tamanho correto
  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  const handleInputChange = React.useCallback((index: number, newValue: string) => {
    // Permitir apenas dígitos
    const numericValue = newValue.replace(/\D/g, '')
    
    if (numericValue.length > 1) {
      // Se múltiplos dígitos foram colados, distribuir pelos campos
      const digits = numericValue.slice(0, length).split('')
      const newOtpValue = Array(length).fill('').map((_, i) => digits[i] || '').join('')
      onChange(newOtpValue)
      
      // Focar no próximo campo disponível ou no último
      const nextIndex = Math.min(digits.length, length - 1)
      setActiveIndex(nextIndex)
      inputRefs.current[nextIndex]?.focus()
    } else {
      // Atualizar valor single
      const newOtpArray = value.padEnd(length, ' ').split('')
      newOtpArray[index] = numericValue
      const newOtpValue = newOtpArray.join('').trimEnd()
      onChange(newOtpValue)
      
      // Mover para o próximo campo se um dígito foi inserido
      if (numericValue && index < length - 1) {
        setActiveIndex(index + 1)
        inputRefs.current[index + 1]?.focus()
      }
    }
  }, [value, onChange, length])

  const handleKeyDown = React.useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      
      const newOtpArray = value.padEnd(length, ' ').split('')
      
      if (newOtpArray[index] && newOtpArray[index] !== ' ') {
        // Apagar o dígito atual
        newOtpArray[index] = ''
        onChange(newOtpArray.join('').trimEnd())
      } else if (index > 0) {
        // Mover para o campo anterior e apagar
        newOtpArray[index - 1] = ''
        onChange(newOtpArray.join('').trimEnd())
        setActiveIndex(index - 1)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1)
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1)
      inputRefs.current[index + 1]?.focus()
    }
  }, [value, onChange, length])

  const handleFocus = React.useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            "h-12 w-12 rounded-md border border-input bg-transparent text-center text-lg font-mono shadow-sm transition-colors",
            "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "md:h-9 md:w-9 md:text-sm",
            activeIndex === index && "border-ring ring-2 ring-ring/20"
          )}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      ))}
    </div>
  )
}