import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Booking, MessageLog, HotelConfig, Client, User, License } from '../types';
import { backend } from '../services/backend';

interface HotelContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  
  bookings: Booking[];
  logs: MessageLog[];
  config: HotelConfig;
  clients: Client[];
  license: License;
  
  // Wrapped Backend Methods
  createBooking: (data: { guestName: string; phone: string; email?: string; roomType: string; startDate: string; endDate: string; totalUGX: number }) => Promise<Booking>;
  checkAvailability: (start: string, end: string, type: string) => Promise<boolean>;
  lookupClient: (phone?: string, email?: string) => Promise<Client | null>;
  upsertClient: (data: Partial<Client> & { phone: string }) => Promise<Client>;
  sendWhatsApp: (to: string, type: 'confirmation' | 'info' | 'location') => Promise<string>;
  sendEmail: (to: string, subject: string, body: string) => Promise<string>;
  
  // Telephony Simulation
  simulateCallStart: (from: string) => Promise<string>;
  simulateCallTurn: (sid: string, text: string) => Promise<{ twiml: string, text: string }>;
  
  updateConfig: (updates: Partial<HotelConfig>) => void;
  refreshData: () => void; // Manually trigger data refetch
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const HotelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(backend.getUser());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [config, setConfig] = useState<HotelConfig>(backend.getConfig());
  const [license, setLicense] = useState<License>(backend.getLicense());

  // Data Fetching
  const refreshData = useCallback(() => {
    setBookings(backend.getBookings());
    setClients(backend.getClients());
    setLogs(backend.getLogs());
    setConfig(backend.getConfig());
    setLicense(backend.getLicense());
  }, []);

  // Initial Load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auth Wrappers
  const login = async (email: string, pass: string) => {
    const u = await backend.login(email, pass);
    if (u) {
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = () => {
    backend.logout();
    setUser(null);
  };

  // Action Wrappers
  const updateConfig = (updates: Partial<HotelConfig>) => {
    try {
        backend.updateConfig(updates);
        refreshData();
    } catch (e: any) {
        alert(e.message);
    }
  };

  const createBooking = async (data: any) => {
    const booking = await backend.createBooking(data);
    refreshData();
    return booking;
  };

  const upsertClient = async (data: any) => {
    const client = await backend.upsertClient(data);
    refreshData();
    return client;
  };

  const sendWhatsApp = async (to: string, type: any) => {
      // This will throw if license is starter
      const res = await backend.sendWhatsApp(to, type);
      refreshData();
      return res.referenceId;
  };

  const sendEmail = async (to: string, sub: string, body: string) => {
      const res = await backend.sendEmail(to, sub, body);
      refreshData();
      return res.referenceId;
  };
  
  const simulateCallStart = async (from: string) => {
      return await backend.handleIncomingCall(from);
  };

  const simulateCallTurn = async (sid: string, text: string) => {
      return await backend.processVoiceTurn(sid, text);
  };

  // Pass-throughs
  const checkAvailability = backend.checkAvailability.bind(backend);
  const lookupClient = async (phone?: string, email?: string) => backend.lookupClient({ phone, email });

  return (
    <HotelContext.Provider value={{ 
        user, login, logout, 
        bookings, logs, config, clients, license,
        createBooking, updateConfig, checkAvailability, 
        lookupClient, upsertClient, 
        sendWhatsApp, sendEmail,
        simulateCallStart, simulateCallTurn,
        refreshData 
    }}>
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
