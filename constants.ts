
import { Booking, Client, HotelConfig, MessageLog, License } from './types';

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview'; // For phone/text based interactions

export const INITIAL_LICENSE: License = {
  id: 'lic_1',
  hotelId: 'h1',
  plan: 'pro', // Change to 'starter' to test feature gating
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  isActive: true
};

export const INITIAL_CONFIG: HotelConfig = {
  hotelName: 'Source Garden Hotel Jinja',
  currency: 'UGX',
  contactPhone: '0392 832 912 / +256 777 077 422',
  contactEmail: 'wachaexperience@gmail.com',
  
  branding: {
    primaryColor: '#2563EB', // Blue-600
  },

  telephony: {
    provider: 'twilio',
    accountSid: 'AC_SIMULATED_SID_12345',
    authToken: 'SIMULATED_TOKEN_XYZ',
    phoneNumber: '+256700000000',
    voiceId: 'Polly.Joanna'
  },

  roomTypes: ['Deluxe Single', 'Deluxe Double', 'Twin', 'Cottage', 'Family Cottage'],
  
  roomInfo: `
- Deluxe Single: 120,000 UGX (Continental Plan). Max 1 Adult, 1 Kid.
- Deluxe Double: 140,000 UGX (Continental Plan). Max 2 Adults, 2 Kids.
- Twin: 150,000 UGX (Continental Plan). Max 2 Adults, 2 Kids.
- Cottage: 170,000 UGX (Continental Plan). Themed cottages (Elephant, Giraffe, Horse, Leopard, Zebra). Max 2 Adults, 2 Kids.
- Family Cottage: 450,000 UGX (Continental Plan). Max 5 Adults, 4 Kids.
  `,

  diningInfo: `
--- STARTERS & SALADS ---
- Chefs Caesar Salad: 25,000 UGX
- Ovacado Sunrise: 25,000 UGX
- Chicken Salads: 25,000 UGX

--- MAIN COURSE ---
- Nile Special Fish: 40,000 UGX
- Premium Whole Fish: 35,000 UGX
- Fish Fingers: 25,000 UGX
- Supreme of Chicken: 30,000 UGX
- Pan-Fried Goat: 30,000 UGX

--- BEVERAGES ---
- Fresh Juices: 10,000 UGX
- Beers: 6,000 - 10,000 UGX
- Soft Drinks: 3,000 UGX
  `,

  servicesInfo: `
- Accommodation: Unpretentiously Luxurious rooms and cottages.
- Bar & Restaurant: Extensive menu featuring local and international cuisine.
- Gym: Fitness center available.
- Spa & Sauna: Wellness services available.
  `,

  policyInfo: `
- Check-in: 2:00 PM.
- Check-out: 11:00 AM.
- Payment: Cash (UGX/USD), Mobile Money, Visa.
- Cancellation: Free up to 24h before check-in.
  `,

  loyaltyProgramInfo: `
- Silver Tier (0-5 nights): Free Wi-Fi.
- Gold Tier (6-20 nights): Room upgrade, 10% dining discount.
- Platinum Tier (20+ nights): Free airport pickup, 20% dining discount.
  `,

  customInstructions: `
You are the AI Receptionist for Source Garden Hotel Jinja.
Your motto is "Unpretentiously Luxurious".
Your tone should be warm, welcoming, and professional.
Always check availability before confirming a booking.
When quoting prices, always use UGX unless asked otherwise.
  `
};

export const INITIAL_CLIENTS: Client[] = [
    {
        id: 'c1',
        hotelId: 'h1',
        name: 'John Doe',
        phone: '+256700123456',
        email: 'john.doe@example.com',
        preferences: 'Prefers quiet rooms away from the pool.',
        lastVisit: '2023-11-15',
        totalSpent: 420000,
        stayCount: 3,
        createdAt: '2023-01-01T00:00:00Z'
    },
    {
        id: 'c2',
        hotelId: 'h1',
        name: 'Sarah Namukasa',
        phone: '+256777112233',
        email: 'sarah.n@example.com',
        preferences: 'Allergic to peanuts.',
        lastVisit: '2023-12-01',
        totalSpent: 1500000,
        stayCount: 5,
        createdAt: '2023-02-01T00:00:00Z'
    }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    hotelId: 'h1',
    clientId: 'c1',
    guestName: 'John Doe',
    guestPhone: '+256700123456',
    roomType: 'Deluxe Double',
    checkIn: new Date(Date.now() + 86400000).toISOString(),
    checkOut: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'Confirmed',
    totalUGX: 420000,
    createdAt: new Date().toISOString()
  },
  {
    id: 'b2',
    hotelId: 'h1',
    clientId: 'c2',
    guestName: 'Sarah Namukasa',
    guestPhone: '+256777112233',
    roomType: 'Family Cottage',
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'Checked In',
    totalUGX: 900000,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_LOGS: MessageLog[] = [
  {
    id: 'l1',
    hotelId: 'h1',
    channel: 'whatsapp',
    recipient: '+256700123456',
    content: 'Template: info - Inquiry about pool hours',
    status: 'read',
    referenceId: 'wamid.123456',
    createdAt: new Date().toISOString()
  },
  {
    id: 'l2',
    hotelId: 'h1',
    channel: 'system',
    recipient: 'Admin',
    content: 'Booking created via Voice AI',
    status: 'delivered',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];
