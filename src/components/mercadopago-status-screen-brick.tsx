'use client';

import React, { useMemo, useCallback } from 'react';
import { StatusScreen } from '@mercadopago/sdk-react';
import { toast } from 'sonner';

interface MercadoPagoStatusScreenBrickProps {
  paymentId: string;
  onError?: (error: unknown) => void;
  onReady?: () => void;
  backUrls?: {
    error?: string;
    return?: string;
  };
  hideStatusDetails?: boolean;
}

const MercadoPagoStatusScreenBrick: React.FC<MercadoPagoStatusScreenBrickProps> = ({
  paymentId,
  onError,
  onReady,
  backUrls,
  hideStatusDetails = false,
}) => {
  // Objeto de inicialização memoizado
  const initialization = useMemo(() => ({
    paymentId: paymentId,
  }), [paymentId]);

  // Objeto de customização memoizado
  const customization = useMemo(() => ({
    ...(backUrls && { backUrls }),
    ...(hideStatusDetails && {
      visual: {
        hideStatusDetails: true,
      },
    }),
  }), [backUrls, hideStatusDetails]);

  // Callback de erro memoizado
  const handleError = useCallback(async (error: unknown) => {
    console.error('Status Screen Brick Error:', error);
    toast.error('Erro ao carregar status do pagamento');
    onError?.(error);
  }, [onError]);

  // Callback de pronto memoizado
  const handleReady = useCallback(async () => {
    console.log('Status Screen Brick está pronto');
    onReady?.();
  }, [onReady]);

  return (
    <StatusScreen
      initialization={initialization}
      customization={customization}
      onError={handleError}
      onReady={handleReady}
    />
  );
};

export default React.memo(MercadoPagoStatusScreenBrick);