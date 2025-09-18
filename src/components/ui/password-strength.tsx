"use client";

import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface StrengthCriteria {
  label: string;
  test: (password: string) => boolean;
}

const strengthCriteria: StrengthCriteria[] = [
  {
    label: 'Pelo menos 8 caracteres',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contém letra maiúscula',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contém letra minúscula',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contém número',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contém caractere especial',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

const getPasswordStrength = (password: string): { score: number; level: string; color: string } => {
  const passedCriteria = strengthCriteria.filter(criteria => criteria.test(password)).length;
  
  if (passedCriteria === 0) return { score: 0, level: 'Muito Fraca', color: 'bg-gray-300' };
  if (passedCriteria <= 2) return { score: passedCriteria, level: 'Fraca', color: 'bg-red-500' };
  if (passedCriteria <= 3) return { score: passedCriteria, level: 'Média', color: 'bg-yellow-500' };
  if (passedCriteria <= 4) return { score: passedCriteria, level: 'Forte', color: 'bg-blue-500' };
  return { score: passedCriteria, level: 'Muito Forte', color: 'bg-green-500' };
};

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, level, color } = getPasswordStrength(password);
  
  if (!password) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Barra de Força */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Força da senha:</span>
          <span className={cn(
            "font-medium",
            score <= 2 ? "text-red-600" : 
            score <= 3 ? "text-yellow-600" : 
            score <= 4 ? "text-blue-600" : "text-green-600"
          )}>
            {level}
          </span>
        </div>
        
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={cn(
                "h-2 flex-1 rounded-sm transition-colors",
                index <= score ? color : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Lista de Critérios */}
      <div className="space-y-1">
        {strengthCriteria.map((criteria, index) => {
          const isPassed = criteria.test(password);
          return (
            <div key={index} className="flex items-center space-x-2 text-sm">
              {isPassed ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
              <span className={cn(
                isPassed ? "text-green-700" : "text-gray-500"
              )}>
                {criteria.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook para validação de força de senha
export function usePasswordStrength(password: string) {
  const { score } = getPasswordStrength(password);
  const isStrong = score >= 4;
  const isValid = score >= 3; // Mínimo para aceitar
  
  return {
    score,
    isStrong,
    isValid,
    getStrength: () => getPasswordStrength(password),
  };
}
