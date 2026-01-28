import { HotelConfig } from '../types';
import { Type, FunctionDeclaration } from '@google/genai';

export const generateSystemInstruction = (config: HotelConfig): string => {
  return `
${config.customInstructions}

=== HOTEL KNOWLEDGE BASE ===

--- GENERAL INFORMATION ---
Name: ${config.hotelName}
Phone: ${config.contactPhone}
Email: ${config.contactEmail}
Currency: ${config.currency}

--- ROOMS & RATES ---
${config.roomInfo}

--- DINING & MENU ---
${config.diningInfo}

--- SERVICES & AMENITIES ---
${config.servicesInfo}

--- POLICIES ---
${config.policyInfo}

--- LOYALTY PROGRAM & BENEFITS ---
${config.loyaltyProgramInfo}

--- PROCEDURES ---
- Latency & Style: Your goal is to be EFFICIENT but POLITE.
- **Verbal Acknowledgement**: Before executing any tool that retrieves information (like checking availability, looking up clients, or checking status), you MUST verbally tell the user you are doing so (e.g., "One moment, let me check the system for you", "Checking that now, please hold on", "Let me look up your profile"). Do not just silently execute the tool.

- **Client Recognition**:
  1. **Greeting**: Greet the user IMMEDIATELY upon connection. Do not wait for them to speak first. Politely ask for the caller's phone number to look up their profile.
  2. **Lookup**: Use the 'lookup_client' tool with the provided phone number. *Remember to say you are checking first.*
  3. **Lookup Failure**: If the phone lookup fails, ask the user if they have an email address on file and try looking up by email.
  4. **Returning Guest**: If found, welcome them back by name! Mention their known preferences or favorites (e.g., "Welcome back, Sarah! Shall I book a quiet room for you again?"). Ask if they want to use the email address on file.
  5. **New Guest**: If not found by phone or email, proceed to ask for their Name and Email during the booking process.

- Booking Process:
  1. Availability Check: ALWAYS use 'check_room_availability' first. *Say you are checking availability before calling the tool.*
  2. Confirm & Collect Info: Confirm availability. Get Name, Phone, and Email. (If returning guest, confirm existing email).
  3. Create Booking: Use 'create_booking'. **Ensure you pass the email address**.
  4. Send Confirmation: IMMEDIATELY use 'send_email'.

- **Saving Preferences**:
  - If a guest mentions a specific like, dislike, or allergy (e.g., "I'm allergic to nuts", "I love the view of the lake", "I prefer the ground floor"), IMMEDIATELY use the 'save_client_preference' tool to record this for future visits.

- Communications: 
  - Use 'send_whatsapp_info' for quick updates.
  - Use 'send_email' for confirmations.

- Ending the Call:
  - If user says "Goodbye", use 'end_call'.

- Other Tools:
  - Airport Pickup: Collect details -> 'book_airport_pickup' -> 'send_whatsapp_info'.
  - Room Service: 'show_menu_ui' for visual menu. 'order_room_service' for manual orders.

=== CURRENT DATE ===
${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}
  `;
};

export const generateTools = (config: HotelConfig): FunctionDeclaration[] => {
  return [
    {
      name: 'end_call',
      description: 'Ends the voice call session. Use this when the user says goodbye or indicates they are done.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    },
    {
      name: 'lookup_client',
      description: 'Look up a client by phone number OR email to retrieve their name and preferences. Try phone first.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          phoneNumber: { type: Type.STRING },
          email: { type: Type.STRING }
        },
      }
    },
    {
      name: 'save_client_preference',
      description: 'Save a new preference, favorite, or note about the client for future visits.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          phoneNumber: { type: Type.STRING },
          preference: { type: Type.STRING, description: 'The detail to remember, e.g., "Allergic to shellfish" or "Loves the garden view".' }
        },
        required: ['phoneNumber', 'preference']
      }
    },
    {
      name: 'check_room_availability',
      description: 'Check if a specific room type is available for a date range.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          startDate: { type: Type.STRING, description: 'YYYY-MM-DD format' },
          endDate: { type: Type.STRING, description: 'YYYY-MM-DD format' },
          roomType: { type: Type.STRING, enum: config.roomTypes }
        },
        required: ['startDate', 'endDate', 'roomType']
      }
    },
    {
      name: 'create_booking',
      description: 'Create a new reservation for a guest.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          guestName: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          roomType: { type: Type.STRING, enum: config.roomTypes }
        },
        required: ['guestName', 'phone', 'startDate', 'endDate', 'roomType', 'email']
      }
    },
    {
      name: 'send_whatsapp_info',
      description: 'Send hotel information or confirmation via WhatsApp.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          phoneNumber: { type: Type.STRING },
          messageType: { type: Type.STRING, enum: ['confirmation', 'info', 'location'] }
        },
        required: ['phoneNumber', 'messageType']
      }
    },
    {
      name: 'send_email',
      description: 'Send an email to a guest.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          emailAddress: { type: Type.STRING },
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        },
        required: ['emailAddress', 'subject', 'body']
      }
    },
    {
      name: 'check_kitchen_status',
      description: 'Check if the kitchen is currently open for room service.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    },
    {
      name: 'show_menu_ui',
      description: 'Display the interactive food menu UI to the user. Use this when the user wants to see the menu or place an order.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    },
    {
      name: 'order_room_service',
      description: 'Place a food or drink order for a specific room (manual entry by AI). Use show_menu_ui preferentially if the user is undecided.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          roomNumber: { type: Type.STRING },
          orderItems: { type: Type.STRING, description: 'Details of food/drinks ordered' },
          specialRequests: { type: Type.STRING }
        },
        required: ['roomNumber', 'orderItems']
      }
    },
    {
      name: 'book_airport_pickup',
      description: 'Schedule an airport pickup for a guest.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          guestName: { type: Type.STRING },
          phoneNumber: { type: Type.STRING },
          flightNumber: { type: Type.STRING },
          arrivalTime: { type: Type.STRING },
        },
        required: ['guestName', 'phoneNumber', 'flightNumber', 'arrivalTime']
      }
    },
    {
      name: 'set_reminder',
      description: 'Set a wake-up call or reminder for a guest.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          guestName: { type: Type.STRING },
          roomNumber: { type: Type.STRING },
          time: { type: Type.STRING, description: 'Time of reminder (e.g. 7:00 AM)' },
          message: { type: Type.STRING, description: 'Content of the reminder' }
        },
        required: ['guestName', 'roomNumber', 'time', 'message']
      }
    },
    {
      name: 'set_dnd_status',
      description: 'Enable or disable Do Not Disturb (DND) status for a room.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          roomNumber: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['enable', 'disable'], description: 'Set to enable or disable DND' }
        },
        required: ['roomNumber', 'status']
      }
    }
  ];
};