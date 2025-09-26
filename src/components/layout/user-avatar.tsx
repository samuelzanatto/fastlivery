'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface UserAvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ 
  src, 
  name, 
  size = 32, 
  className = '', 
  fallbackClassName = '' 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const containerClass = `rounded-full bg-slate-200 flex items-center justify-center ${className}`
  const fallbackClass = `text-sm font-medium text-slate-600 ${fallbackClassName}`
  
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return fullName.charAt(0).toUpperCase()
  }

  if (!src || imageError) {
    return (
      <div 
        className={containerClass}
        style={{ width: size, height: size }}
      >
        <span className={fallbackClass}>
          {getInitials(name)}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={containerClass}
      style={{ width: size, height: size }}
    >
      {imageLoading && (
        <div className="animate-pulse bg-slate-300 rounded-full w-full h-full" />
      )}
      <Image
        src={src}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        className={`rounded-full object-cover ${imageLoading ? 'hidden' : ''}`}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoading(false)}
        priority={false}
      />
    </div>
  )
}

export default UserAvatar