// Interfaz de pagos — independiente del proveedor de pagos
// Para activar Flow.cl: reemplazar mockProcessPayment por flowProcessPayment

export type PaymentResult = {
  success: boolean
  transactionId: string | null
  error?: string
}

export type PaymentInput = {
  amount: number
  description: string
  clientEmail: string
  bookingId: string
}

async function mockProcessPayment(input: PaymentInput): Promise<PaymentResult> {
  console.log('[MOCK PAYMENT]', input)
  return {
    success: true,
    transactionId: `mock_${Date.now()}_${input.bookingId}`
  }
}

// TODO: implementar cuando se integre Flow.cl
// async function flowProcessPayment(input: PaymentInput): Promise<PaymentResult> {
//   const response = await fetch('https://www.flow.cl/api/payment/create', { ... })
// }

export async function processPayment(input: PaymentInput): Promise<PaymentResult> {
  return mockProcessPayment(input)
}
