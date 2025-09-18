import PWAInstallPrompt from './pwa-install-prompt'

interface PWAWrapperProps {
  restaurantName: string
  restaurantSlug: string
  iconUrl?: string
}

export default function PWAWrapper({ restaurantName, restaurantSlug, iconUrl }: PWAWrapperProps) {
  return (
    <PWAInstallPrompt
      restaurantName={restaurantName}
      restaurantSlug={restaurantSlug}
      iconUrl={iconUrl}
    />
  )
}