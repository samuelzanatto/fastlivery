import * as React from 'react'
import { cn } from '@/lib/utils'
import { inputFormatters as formatters, useAddressAutocomplete } from '@/lib/utils/formatters'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  formatter?: keyof typeof formatters
  onAddressFound?: (address: {
    address: string
    neighborhood: string
    city: string
    state: string
    cep: string
  }) => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, formatter, onAddressFound, onChange, ...props }, ref) => {
    const { searchAddress } = useAddressAutocomplete()
    const [isSearching, setIsSearching] = React.useState(false)
    const lastSearchedCep = React.useRef<string>('')

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value

      // Aplicar formatador se especificado
      if (formatter && formatters[formatter]) {
        value = formatters[formatter](value)
        e.target.value = value
      }

      // Chamar onChange original primeiro para atualizar o estado imediatamente
      if (onChange) {
        onChange(e)
      }

      // Autocomplete para CEP (não bloquear atualização do input e evitar buscas repetidas)
      if (formatter === 'cep' && onAddressFound) {
        const clean = value.replace(/\D/g, '')
        if (clean.length === 8 && clean !== lastSearchedCep.current) {
          lastSearchedCep.current = clean
          setIsSearching(true)
          try {
            const addressData = await searchAddress(value)
            onAddressFound(addressData)
          } catch (error) {
            console.error('Erro ao buscar endereço:', error)
          } finally {
            setIsSearching(false)
          }
        }
      }
    }

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            isSearching && 'pr-8',
            className
          )}
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
