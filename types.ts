
// === PRISMA SCHEMA REFLECTION ===

export interface License {
  id: string;
  hotelId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  validUntil: string; // ISO DateTime
  isActive: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface Client {
  id: string;
  hotelId: string;
  name: string; // "Guest" if unknown
  phone: string; // Primary Key for lookup in UI (Normalized +256)
  email?: string;
  preferences?: string;
  createdAt: string;
  
  // Computed / Extended fields for UI convenience
  lastVisit?: string;
  totalSpent: number;
  stayCount: number;
}

export interface Room {
  id: string;
  hotelId: string;
  type: string;
  priceUGX: number;
  quantity: number;
}

export interface Booking {
  id: string;
  hotelId: string;
  clientId: string;
  roomType: string;
  checkIn: string; // ISO DateTime
  checkOut: string; // ISO DateTime
  totalUGX: number;
  status: 'Confirmed' | 'Pending' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes?: string;
  createdAt: string;

  // Relation for UI display
  guestName: string; 
  guestPhone: string;
}

export interface MessageLog {
  id: string;
  hotelId: string;
  channel: 'whatsapp' | 'email' | 'voice' | 'system';
  recipient: string; // Phone or Email
  content: string; // Summary or full body (HTML for email)
  status: 'sent' | 'delivered' | 'failed' | 'read' | 'queued';
  referenceId?: string; // External ID (wamid, etc.)
  createdAt: string;
}

// === MESSAGING DTOs (Strict Contracts) ===

export interface SendWhatsAppDto {
  hotelId: string;
  to: string;              // +2567XXXXXXXX
  template: string;        // booking_confirmation | location_map | airport_pickup
  language?: string;       // en_US
  parameters: string[];    // template variables
}

export interface SendEmailDto {
  hotelId: string;
  to: string;
  subject: string;
  template: 'booking-confirmation' | 'general-message';
  variables: Record<string, string>;
}

// === AUTHENTICATION ===

export interface User {
  id: string;
  email: string;
  name: string;
  hotelId: string;
  role: 'owner' | 'manager' | 'staff';
}

// === CONFIGURATION (Knowledge Base) ===

export interface TelephonyConfig {
  provider: 'twilio' | 'africastalking' | 'telnyx';
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  voiceId: string; // e.g., Polly.Joanna
}

export interface HotelConfig {
  hotelName: string;
  currency: string;
  contactPhone: string;
  contactEmail: string;
  
  // White-label / Branding
  branding: {
    logoUrl?: string;
    primaryColor: string;
  };

  // Telephony
  telephony: TelephonyConfig;

  // These text blocks are fed to Gemini
  roomTypes: string[]; 
  roomInfo: string; 
  diningInfo: string; 
  servicesInfo: string; 
  policyInfo: string; 
  loyaltyProgramInfo: string; 
  customInstructions: string; 
}

// === AI TOOLS ===

export interface ToolCall {
  id: string;
  name: string;
  args: any;
}
