import { v4 as uuidv4 } from 'uuid';
import { Booking, Client, HotelConfig, MessageLog, User, SendWhatsAppDto, SendEmailDto, License } from '../types';
import { INITIAL_BOOKINGS, INITIAL_CLIENTS, INITIAL_CONFIG, INITIAL_LOGS, INITIAL_LICENSE, GEMINI_TEXT_MODEL } from '../constants';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { generateSystemInstruction, generateTools } from './promptFactory';

/**
 * WACHA BACKEND SIMULATION
 * 
 * This service mimics the architecture of the proposed NestJS + Prisma backend.
 * In production, these methods would be async fetch() calls to the REST API.
 * Currently, it persists to localStorage to maintain state across reloads.
 */

const STORAGE_KEYS = {
  CLIENTS: 'wacha_db_clients',
  BOOKINGS: 'wacha_db_bookings',
  LOGS: 'wacha_db_logs',
  CONFIG: 'wacha_db_config',
  USER: 'wacha_auth_user',
  LICENSE: 'wacha_db_license'
};

// In-memory session store for phone calls (since calls are transient)
interface PhoneSession {
  history: { role: 'user' | 'model', parts: any[] }[];
  chatSession: any;
}

class BackendService {
  private hotelId = 'h1'; // Hardcoded tenant for simulation
  private phoneSessions: Map<string, PhoneSession> = new Map();

  constructor() {
    this.initializeDB();
  }

  private initializeDB() {
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LICENSE)) {
      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(INITIAL_LICENSE));
    }
  }

  // === HELPERS ===
  private get<T>(key: string): T {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9+]/g, '');
  }

  // === AUTHENTICATION & LICENSE ===

  async login(email: string, pass: string): Promise<User | null> {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 500));
    
    // Hardcoded owner credential
    if (email.toLowerCase() === 'faridahkyohirwe@gmail.com' && pass === 'password') {
      const user: User = { 
        id: 'u_1', 
        hotelId: this.hotelId, 
        email, 
        name: 'Faridah Kyohirwe', 
        role: 'owner' // OWNER role has full access
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  getUser(): User | null {
    const u = localStorage.getItem(STORAGE_KEYS.USER);
    return u ? JSON.parse(u) : null;
  }

  getLicense(hotelId: string = this.hotelId): License {
    const l = localStorage.getItem(STORAGE_KEYS.LICENSE);
    return l ? JSON.parse(l) : INITIAL_LICENSE;
  }

  private validateLicense() {
    const license = this.getLicense();
    const now = new Date();
    const expiry = new Date(license.validUntil);

    if (!license.isActive || now > expiry) {
      throw new Error(`License Expired or Inactive. Please contact support. Status: ${license.isActive ? 'Active' : 'Disabled'}, Expires: ${expiry.toLocaleDateString()}`);
    }
    return license;
  }

  // === CLIENTS (CRM) ===
  
  // POST /clients/lookup
  async lookupClient(criteria: { phone?: string; email?: string }): Promise<Client | null> {
    this.validateLicense(); // Gate CRM access

    const clients = this.get<Client[]>(STORAGE_KEYS.CLIENTS);
    let found: Client | undefined;

    if (criteria.phone) {
      const target = this.normalizePhone(criteria.phone);
      found = clients.find(c => this.normalizePhone(c.phone).includes(target) || target.includes(this.normalizePhone(c.phone)));
    }

    if (!found && criteria.email) {
      found = clients.find(c => c.email?.toLowerCase() === criteria.email?.toLowerCase());
    }

    if (found) {
        console.log(`[Backend] Client Found: ${found.id} (${found.name})`);
    } else {
        console.log(`[Backend] Client Lookup Failed: ${JSON.stringify(criteria)}`);
    }

    return found || null;
  }

  // POST /clients/upsert
  async upsertClient(data: Partial<Client> & { phone: string }): Promise<Client> {
    this.validateLicense();

    const clients = this.get<Client[]>(STORAGE_KEYS.CLIENTS);
    const existing = await this.lookupClient({ phone: data.phone, email: data.email });

    let result: Client;

    if (existing) {
      // Update
      const updated = {
        ...existing,
        ...data,
        preferences: data.preferences 
          ? (existing.preferences ? `${existing.preferences}. ${data.preferences}` : data.preferences)
          : existing.preferences,
        lastVisit: new Date().toISOString()
      };
      
      const newIndex = clients.findIndex(c => c.id === existing.id);
      clients[newIndex] = updated;
      result = updated;
    } else {
      // Create
      result = {
        id: uuidv4(),
        hotelId: this.hotelId,
        name: data.name || 'Guest',
        phone: data.phone,
        email: data.email || '',
        preferences: data.preferences || '',
        stayCount: 0,
        totalSpent: 0,
        lastVisit: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      clients.push(result);
    }

    this.save(STORAGE_KEYS.CLIENTS, clients);
    return result;
  }

  // === BOOKINGS ===

  // POST /bookings/check
  async checkAvailability(start: string, end: string, roomType: string): Promise<boolean> {
    this.validateLicense();
    const bookings = this.get<Booking[]>(STORAGE_KEYS.BOOKINGS);
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();

    const overlaps = bookings.filter(b => {
      if (b.roomType !== roomType || b.status === 'Cancelled') return false;
      const bStart = new Date(b.checkIn).getTime();
      const bEnd = new Date(b.checkOut).getTime();
      return startDate < bEnd && endDate > bStart;
    });

    return overlaps.length < 5; // Hardcoded capacity
  }

  // POST /bookings/create
  async createBooking(data: { guestName: string; phone: string; email?: string; roomType: string; startDate: string; endDate: string; totalUGX: number }): Promise<Booking> {
    this.validateLicense();

    // 1. Ensure Client Exists
    const client = await this.upsertClient({
      name: data.guestName,
      phone: data.phone,
      email: data.email
    });

    // 2. Create Booking Record
    const booking: Booking = {
      id: uuidv4(),
      hotelId: this.hotelId,
      clientId: client.id,
      guestName: client.name, 
      guestPhone: client.phone,
      roomType: data.roomType,
      checkIn: data.startDate,
      checkOut: data.endDate,
      totalUGX: data.totalUGX,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    const bookings = this.get<Booking[]>(STORAGE_KEYS.BOOKINGS);
    bookings.push(booking);
    this.save(STORAGE_KEYS.BOOKINGS, bookings);

    // 3. Update Client Stats
    client.stayCount += 1;
    client.totalSpent += data.totalUGX;
    await this.upsertClient(client); 

    this.logSystemAction(`New Booking: ${booking.id} for ${client.name}`, `Value: ${data.totalUGX} UGX`);

    // 4. AUTO-TRIGGER WHATSAPP (With License Check)
    if (client.phone) {
        try {
            await this.sendWhatsAppTemplate({
                hotelId: this.hotelId,
                to: client.phone,
                template: 'booking_confirmation',
                parameters: [
                    client.name,
                    booking.roomType,
                    new Date(booking.checkIn).toLocaleDateString(),
                    new Date(booking.checkOut).toLocaleDateString(),
                    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(booking.totalUGX)
                ]
            });
        } catch (e) {
            console.warn(`[Backend] Auto-WhatsApp skipped: ${e}`);
        }
    }

    // 5. AUTO-TRIGGER EMAIL (Always allowed in all plans)
    if (client.email) {
        const config = this.getConfig();
        await this.sendEmailTemplate({
            hotelId: this.hotelId,
            to: client.email,
            subject: 'Booking Confirmation - Source Garden Hotel',
            template: 'booking-confirmation',
            variables: {
                name: client.name,
                hotel: config.hotelName,
                room: booking.roomType,
                checkIn: new Date(booking.checkIn).toLocaleDateString(),
                checkOut: new Date(booking.checkOut).toLocaleDateString(),
                total: new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }).format(booking.totalUGX),
                policies: config.policyInfo.slice(0, 200) + '...'
            }
        });
    }

    return booking;
  }

  // === MESSAGING (WhatsApp Cloud API) ===

  async sendWhatsAppTemplate(dto: SendWhatsAppDto): Promise<{ success: boolean; messageId: string }> {
    // 1. LICENSE ENFORCEMENT
    const license = this.validateLicense();
    if (license.plan === 'starter') {
      throw new Error("WhatsApp Integration requires PRO or ENTERPRISE plan. Please upgrade license.");
    }

    // 2. Simulate Network Latency
    await new Promise(r => setTimeout(r, 600));

    // 3. Construct Payload
    const payload = {
      messaging_product: "whatsapp",
      to: dto.to,
      type: "template",
      template: {
        name: dto.template,
        language: { code: dto.language ?? "en_US" },
        components: [
          {
            type: "body",
            parameters: dto.parameters.map(text => ({
              type: "text",
              text
            }))
          }
        ]
      }
    };

    const messageId = `wamid.${uuidv4().replace(/-/g, '')}`;

    // 4. Log to Database
    const log: MessageLog = {
        id: uuidv4(),
        hotelId: dto.hotelId,
        channel: 'whatsapp',
        recipient: dto.to,
        content: `Template: ${dto.template} | Params: ${JSON.stringify(dto.parameters)}`,
        status: 'sent',
        referenceId: messageId,
        createdAt: new Date().toISOString()
    };
    this.addLog(log);

    console.log(`[Backend][WhatsApp] POST /messages - Payload:`, JSON.stringify(payload));
    return { success: true, messageId };
  }

  // Legacy wrapper
  async sendWhatsApp(to: string, type: 'confirmation' | 'info' | 'location'): Promise<{ success: true, referenceId: string }> {
    let template = 'general_info';
    let params = ['Here is the information you requested.'];

    if (type === 'location') {
        template = 'location_map';
        params = ['Source Garden Hotel Jinja'];
    }

    const res = await this.sendWhatsAppTemplate({
        hotelId: this.hotelId,
        to,
        template,
        parameters: params
    });

    return { success: true, referenceId: res.messageId };
  }


  // === MESSAGING (Email Service) ===

  async sendEmailTemplate(dto: SendEmailDto): Promise<{ success: boolean; messageId: string }> {
      // 1. Validate License (Email allowed on all plans)
      this.validateLicense();

      // 2. Simulate SMTP Latency
      await new Promise(r => setTimeout(r, 1200));

      // 3. Template Rendering
      let htmlBody = '';
      if (dto.template === 'booking-confirmation') {
          htmlBody = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Booking Confirmation</h2>
                <p>Hello ${dto.variables.name},</p>
                <p>Your booking at <strong>${dto.variables.hotel}</strong> is confirmed.</p>
                <table>
                <tr><td>Room:</td><td>${dto.variables.room}</td></tr>
                <tr><td>Check-in:</td><td>${dto.variables.checkIn}</td></tr>
                <tr><td>Check-out:</td><td>${dto.variables.checkOut}</td></tr>
                <tr><td>Total:</td><td><strong>${dto.variables.total}</strong></td></tr>
                </table>
                <p>${dto.variables.policies || ''}</p>
                <p>We look forward to hosting you.</p>
            </body>
            </html>
          `;
      } else {
          // General Message
          htmlBody = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif;">
                <p>${dto.variables.body}</p>
                <hr />
                <p><small>${this.getConfig().hotelName}</small></p>
            </body>
            </html>
          `;
      }

      const messageId = `<${uuidv4()}@mailer.wachahotel.com>`;

      // 4. Log to Database
      const log: MessageLog = {
          id: uuidv4(),
          hotelId: dto.hotelId,
          channel: 'email',
          recipient: dto.to,
          content: htmlBody, // Logs full HTML
          status: 'sent',
          referenceId: messageId,
          createdAt: new Date().toISOString()
      };
      this.addLog(log);

      console.log(`[Backend][Email] SMTP Send to ${dto.to} | Subject: ${dto.subject} | ID: ${messageId}`);
      return { success: true, messageId };
  }

  // Wrapper for Ad-Hoc Email Tools
  async sendEmail(to: string, subject: string, body: string): Promise<{ success: true, referenceId: string }> {
      const res = await this.sendEmailTemplate({
          hotelId: this.hotelId,
          to,
          subject,
          template: 'general-message',
          variables: { body }
      });
      return { success: true, referenceId: res.messageId };
  }

  // === TELEPHONY SIMULATION (Twilio & Africa's Talking) ===

  /**
   * Simulates the behavior of the /voice/incoming webhook
   */
  async handleIncomingCall(from: string): Promise<string> {
    const callSid = `CA${uuidv4().replace(/-/g,'').slice(0, 30)}`;
    const config = this.getConfig();
    
    // Initialize Session in memory (Simulating Server State)
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
        model: GEMINI_TEXT_MODEL,
        config: {
            systemInstruction: generateSystemInstruction(config),
            tools: [{ functionDeclarations: generateTools(config) }]
        }
    });

    this.phoneSessions.set(callSid, {
        history: [],
        chatSession: chat
    });

    // Log the incoming call
    this.addLog({
        id: uuidv4(),
        hotelId: this.hotelId,
        channel: 'voice',
        recipient: 'AI',
        content: `Incoming Call from ${from} (SID: ${callSid}) [Provider: ${config.telephony.provider}]`,
        status: 'delivered',
        createdAt: new Date().toISOString(),
        referenceId: callSid
    });

    return callSid; // Return ID for the frontend simulator to track
  }

  /**
   * Simulates the /voice/process webhook (Speech -> Text -> AI -> Text -> XML)
   */
  async processVoiceTurn(callSid: string, userSpeech: string): Promise<{ twiml: string, text: string }> {
    const session = this.phoneSessions.get(callSid);
    if (!session) throw new Error("Call Session Not Found");

    // 1. Send text to Gemini (Simulating the Server Logic)
    let responseText = "";
    
    try {
        let result = await session.chatSession.sendMessage({ message: userSpeech });
        
        // Handle Function Calls Loop
        while (result.functionCalls && result.functionCalls.length > 0) {
            const toolResults = [];
            
            for (const fc of result.functionCalls) {
                console.log(`[Backend][Voice] Executing Tool: ${fc.name}`);
                
                // Execute logic locally
                const output = await this.executeToolLocal(fc);
                
                toolResults.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: output }
                });
            }
            
            // Send tool results back to model
            result = await session.chatSession.sendMessage(toolResults);
        }

        responseText = result.text || "...";
    
    } catch (e) {
        console.error("AI Error:", e);
        responseText = "I'm sorry, I am having trouble connecting to the system. Please try again later.";
    }

    // 2. Generate Voice XML based on Provider
    const config = this.getConfig();
    let xmlOutput = '';

    if (config.telephony.provider === 'africastalking') {
        // Africa's Talking XML Format
        xmlOutput = `
<Response>
  <Say>${responseText}</Say>
  <Record 
    callbackUrl="/voice/at/process"
    maxLength="20"
    finishOnKey="#"
    playBeep="true"
  />
</Response>
        `.trim();
    } else {
        // Twilio XML (TwiML) Format - Default
        xmlOutput = `
<Response>
  <Say voice="${config.telephony.voiceId}">${responseText}</Say>
  <Gather input="speech" timeout="5" action="/voice/process" />
</Response>
        `.trim();
    }

    return { twiml: xmlOutput, text: responseText };
  }

  // Helper to execute tools within the Backend Service context
  private async executeToolLocal(fc: any): Promise<any> {
     // Reuse existing methods
     if (fc.name === 'lookup_client') {
         const c = await this.lookupClient({ phone: fc.args.phoneNumber, email: fc.args.email });
         return c ? { found: true, name: c.name, preferences: c.preferences } : { found: false };
     } 
     else if (fc.name === 'check_room_availability') {
         const avail = await this.checkAvailability(fc.args.startDate, fc.args.endDate, fc.args.roomType);
         return { available: avail };
     }
     else if (fc.name === 'create_booking') {
         // Need price calculation logic here or simplified
         const price = 150000; // Simplified for sim
         const b = await this.createBooking({ ...fc.args, totalUGX: price });
         return { success: true, bookingId: b.id };
     }
     else if (fc.name === 'send_whatsapp_info') {
         await this.sendWhatsApp(fc.args.phoneNumber, fc.args.messageType);
         return { sent: true };
     }
     else if (fc.name === 'send_email') {
         await this.sendEmail(fc.args.emailAddress, fc.args.subject, fc.args.body);
         return { sent: true };
     }
     else if (fc.name === 'end_call') {
         // Special handling for hangup
         return { success: true };
     }
     // Default fallback
     return { success: true, message: "Action executed successfully on backend." };
  }


  // === LOGGING & CONFIG ===

  private addLog(log: MessageLog) {
    const logs = this.get<MessageLog[]>(STORAGE_KEYS.LOGS);
    logs.unshift(log); // Newest first
    this.save(STORAGE_KEYS.LOGS, logs);
  }

  logSystemAction(summary: string, action: string) {
    this.addLog({
      id: uuidv4(),
      hotelId: this.hotelId,
      channel: 'system',
      recipient: 'Admin',
      content: `${summary} - ${action}`,
      status: 'delivered',
      createdAt: new Date().toISOString()
    });
  }

  getLogs(): MessageLog[] {
    return this.get<MessageLog[]>(STORAGE_KEYS.LOGS);
  }

  getBookings(): Booking[] {
    return this.get<Booking[]>(STORAGE_KEYS.BOOKINGS);
  }

  getClients(): Client[] {
    return this.get<Client[]>(STORAGE_KEYS.CLIENTS);
  }

  getConfig(): HotelConfig {
    const c = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return c ? JSON.parse(c) : INITIAL_CONFIG;
  }

  updateConfig(updates: Partial<HotelConfig>) {
    this.validateLicense();
    const current = this.getConfig();
    const updated = { ...current, ...updates };
    this.save(STORAGE_KEYS.CONFIG, updated);
  }
}

// Singleton Export
export const backend = new BackendService();
