export type PaymentStatus = "open" | "pending" | "paid" | "failed" | "canceled" | "expired";
export interface Payment { id: string; orderId: string; amount: number; currency: string; status: PaymentStatus; checkoutUrl?: string; }
export interface PaymentProvider {
  createPayment(input: { orderId: string; amount: number; currency?: string; description: string; redirectUrl: string; webhookUrl: string }): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
}
