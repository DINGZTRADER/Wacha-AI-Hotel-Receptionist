import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useHotel } from '../context/HotelContext';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { generateSystemInstruction, generateTools } from '../services/promptFactory';
import { Mic, MicOff, Phone, PhoneOff, Video, Activity, Globe, Star, X, Utensils, Plus, Minus, ShoppingCart, Calendar as CalendarIcon, CheckCircle, Mail, ExternalLink, LogOut, Code, Server } from 'lucide-react';
import { GEMINI_MODEL } from '../constants';
import CalendarView from '../components/CalendarView';

// Helper to parse price from the text configuration
const getPricePerNight = (roomType: string, roomInfo: string): number => {
  try {
    const safeType = roomType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${safeType}.*?([\\d,]+)\\s*UGX`, 'i');
    const match = roomInfo.match(regex);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  } catch (e) {
    console.error("Error parsing price", e);
  }
  return 150000; // Fallback default
};

const LiveReceptionist: React.FC = () => {
  const { config, createBooking, checkAvailability, lookupClient, upsertClient, sendWhatsApp, sendEmail, simulateCallStart, simulateCallTurn, refreshData } = useHotel();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [logs, setLogs] = useState<{role: 'user' | 'model' | 'system', text: string, isComplete?: boolean}[]>([]);
  const [volume, setVolume] = useState(0);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Mode Toggle: 'browser' (Gemini Live) vs 'phone' (Twilio Sim)
  const [mode, setMode] = useState<'browser' | 'phone'>('browser');
  
  // Phone Simulator State
  const [phoneState, setPhoneState] = useState<{ sid: string | null, active: boolean, history: any[] }>({ sid: null, active: false, history: [] });
  const [simulatedSpeech, setSimulatedSpeech] = useState('');

  // Email Preview State (Visual only, real email happens in backend)
  const [sentEmail, setSentEmail] = useState<{to: string, subject: string, body: string} | null>(null);

  // Feedback State
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackRoom, setFeedbackRoom] = useState('');

  // Menu / Order State
  const [showMenu, setShowMenu] = useState(false);
  const [pendingToolCallId, setPendingToolCallId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<{name: string, price: number}[]>([]);
  const [cart, setCart] = useState<{[key: string]: number}>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null); // To store the active session
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Timeout & Activity Tracking
  const lastInteractionTimeRef = useRef<number>(0);
  const isBusyRef = useRef(false); // New: Tracks if backend/tool is running to prevent timeout

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Parse Menu Items from Config
  useEffect(() => {
    const lines = config.diningInfo.split('\n');
    const items: {name: string, price: number}[] = [];
    for (const line of lines) {
        // Matches "Item Name: 12,345 UGX" or similar
        const match = line.match(/- (.*?):\s*([\d,]+)\s*UGX/i);
        if (match) {
            items.push({
                name: match[1].trim(),
                price: parseInt(match[2].replace(/,/g, ''), 10)
            });
        }
    }
    // Fallback if parsing fails or config is different
    if (items.length === 0) {
        items.push({ name: 'Club Sandwich', price: 30000 });
        items.push({ name: 'Tilapia Fish & Chips', price: 45000 });
        items.push({ name: 'Fresh Juice', price: 15000 });
    }
    setMenuItems(items);
  }, [config.diningInfo]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    sessionRef.current = null;
    isBusyRef.current = false;
  }, []);

  const disconnect = useCallback(async (reason?: string) => {
    // 1. Check for pending audio to allow polite sign-off to be heard
    let waitTime = 0;
    if (audioContextRef.current && nextStartTimeRef.current > audioContextRef.current.currentTime) {
        // Calculate remaining time in ms + small buffer
        waitTime = (nextStartTimeRef.current - audioContextRef.current.currentTime) * 1000 + 500;
    }
    
    // Cap wait time to max 4 seconds to avoid hanging if something is wrong
    waitTime = Math.min(waitTime, 4000);

    if (waitTime > 0 && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        if (processorRef.current) {
             processorRef.current.disconnect();
        }
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    cleanup();
    setStatus('disconnected');
    setIsActive(false);

    const message = reason || "Thank you for calling. Have a wonderful day! 👋";
    setNotification({ message, type: "success" });

    setTimeout(() => {
        setShowFeedback(true);
    }, 2500);
  }, [cleanup]);

  const handleToolCall = async (fc: any) => {
    console.log('Tool Call:', fc.name, fc.args);
    setLogs(prev => [...prev, { role: 'system', text: `Executing Backend Action: ${fc.name}` }]);
    
    // Mark as busy so we don't timeout while waiting for DB/API
    isBusyRef.current = true;
    lastInteractionTimeRef.current = Date.now();

    // UI Tools
    if (fc.name === 'show_menu_ui') {
        setCart({}); 
        setPendingToolCallId(fc.id);
        setShowMenu(true);
        // Note: isBusyRef remains true here to prevent timeout while user is in menu
        return; 
    }

    let result = {};

    if (fc.name === 'end_call') {
        disconnect("Call ended. Thank you for calling Wacha Hotel!");
        isBusyRef.current = false;
        return; 
    } else if (fc.name === 'lookup_client') {
        const client = await lookupClient(fc.args.phoneNumber, fc.args.email);
        if (client) {
            result = { 
                found: true, 
                name: client.name, 
                email: client.email,
                phone: client.phone, 
                preferences: client.preferences,
                message: `Client found: ${client.name}. Favorites/Notes: ${client.preferences || 'None'}.`
            };
        } else {
            result = { found: false, message: "Client not found in database. Please ask for their name and email to create a profile." };
        }
    } else if (fc.name === 'save_client_preference') {
        await upsertClient({
            phone: fc.args.phoneNumber,
            preferences: fc.args.preference
        });
        result = { success: true, message: "Preference saved to client profile." };
        setNotification({ message: "📝 Client preference saved", type: "success" });
    } else if (fc.name === 'check_room_availability') {
      const available = await checkAvailability(fc.args.startDate, fc.args.endDate, fc.args.roomType);
      result = { available, message: available ? 'Room is available.' : 'Room is not available.' };
    } else if (fc.name === 'create_booking') {
      // 1. Lookup Price (Frontend Helper)
      const pricePerNight = getPricePerNight(fc.args.roomType, config.roomInfo);
      const start = new Date(fc.args.startDate).getTime();
      const end = new Date(fc.args.endDate).getTime();
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const nights = Math.max(1, diffDays);
      const totalPrice = nights * pricePerNight;
      
      const format = (num: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: config.currency }).format(num);
      const formattedTotal = format(totalPrice);
      const formattedRate = format(pricePerNight);

      // 2. Call Backend
      // The backend will AUTOMATICALLY trigger WhatsApp and Email Confirmations
      const booking = await createBooking({
        guestName: fc.args.guestName,
        phone: fc.args.phone,
        email: fc.args.email,
        startDate: new Date(fc.args.startDate).toISOString(),
        endDate: new Date(fc.args.endDate).toISOString(),
        roomType: fc.args.roomType,
        totalUGX: totalPrice
      });

      // Construct status message for AI
      let msg = `Booking confirmed (ID: ${booking.id.slice(0,6)}).`;
      if (booking.guestPhone) msg += ` WhatsApp confirmation sent automatically to ${booking.guestPhone}.`;
      if (fc.args.email) msg += ` Email confirmation sent automatically to ${fc.args.email}.`;

      result = { 
        success: true, 
        bookingId: booking.id, 
        details: { nights, ratePerNight: formattedRate, totalPrice: formattedTotal },
        message: msg
      };
      setNotification({ message: `✅ Booking Confirmed & Notifications Sent`, type: 'success' });

    } else if (fc.name === 'send_whatsapp_info') {
      const refId = await sendWhatsApp(fc.args.phoneNumber, fc.args.messageType);
      setNotification({ message: `📱 WhatsApp sent. Ref: ${refId.slice(0,8)}...`, type: 'success' });
      result = { sent: true, referenceId: refId };

    } else if (fc.name === 'send_email') {
      // Ad-hoc email tool usage (e.g. sending info or menu)
      const refId = await sendEmail(fc.args.emailAddress, fc.args.subject, fc.args.body);
      setNotification({ message: `📧 Email sent. Ref: ${refId.slice(0,8)}...`, type: 'success' });
      
      // UI Preview (Client-side visual only, backend handles log)
      setSentEmail({ to: fc.args.emailAddress, subject: fc.args.subject, body: fc.args.body });

      result = { sent: true, referenceId: refId };

    } else if (fc.name === 'check_kitchen_status') {
      const hour = new Date().getHours();
      const isOpen = hour >= 7 && hour < 22;
      result = { 
          isOpen, 
          status: isOpen ? 'Open' : 'Closed',
          message: isOpen ? 'The kitchen is open.' : 'The kitchen is closed. Operating hours are 7 AM to 10 PM.' 
      };
    } else if (fc.name === 'order_room_service') {
      result = { success: true, message: 'Order sent to kitchen. Estimated time: 30-45 mins.' };
    } else if (fc.name === 'book_airport_pickup') {
      result = { success: true, message: 'Pickup scheduled. Please send a WhatsApp confirmation with the details now.' };
    } else if (fc.name === 'set_reminder') {
      result = { success: true, message: 'Reminder set successfully.' };
    } else if (fc.name === 'set_dnd_status') {
      result = { success: true, message: `DND mode ${fc.args.status}d for Room ${fc.args.roomNumber}.` };
    }

    if (sessionRef.current) {
        sessionRef.current.sendToolResponse({
            functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result }
            }
        });
    }

    // Unset busy state so timer can resume
    isBusyRef.current = false;
    lastInteractionTimeRef.current = Date.now();
  };

  const handleMenuSubmit = () => {
    // Calculate total and items
    const entries = Object.entries(cart) as [string, number][];
    const selectedItems = entries.filter(([_, qty]) => qty > 0);
    const orderSummary = selectedItems.map(([name, qty]) => `${qty}x ${name}`).join(', ');
    
    let totalCost = 0;
    selectedItems.forEach(([name, qty]) => {
        const item = menuItems.find(i => i.name === name);
        if (item) totalCost += item.price * qty;
    });

    const formattedTotal = new Intl.NumberFormat('en-UG', { style: 'currency', currency: config.currency }).format(totalCost);
    lastInteractionTimeRef.current = Date.now();

    // Send response back to Gemini
    if (sessionRef.current && pendingToolCallId) {
         sessionRef.current.sendToolResponse({
            functionResponses: {
                id: pendingToolCallId,
                name: 'show_menu_ui',
                response: { 
                    result: { 
                        success: true, 
                        itemsOrdered: orderSummary || "No items selected",
                        totalCost: formattedTotal,
                        message: selectedItems.length > 0 
                            ? `Order placed for ${orderSummary}. Total is ${formattedTotal}.` 
                            : "User closed the menu without ordering."
                    } 
                }
            }
        });
    }

    setShowMenu(false);
    setPendingToolCallId(null);
    setCart({});
    
    // Resume inactivity timer
    isBusyRef.current = false;
    lastInteractionTimeRef.current = Date.now();
  };

  const handleMenuCancel = () => {
      if (sessionRef.current && pendingToolCallId) {
         sessionRef.current.sendToolResponse({
            functionResponses: {
                id: pendingToolCallId,
                name: 'show_menu_ui',
                response: { result: { success: false, message: "User closed the menu." } }
            }
        });
    }
    lastInteractionTimeRef.current = Date.now();
    setShowMenu(false);
    setPendingToolCallId(null);
    setCart({});

    // Resume inactivity timer
    isBusyRef.current = false;
    lastInteractionTimeRef.current = Date.now();
  };

  const updateCart = (itemName: string, delta: number) => {
      setCart(prev => {
          const current = prev[itemName] || 0;
          const newVal = Math.max(0, current + delta);
          return { ...prev, [itemName]: newVal };
      });
  };

  const connect = async () => {
    if (!process.env.API_KEY) {
      alert('API Key is missing in environment variables.');
      return;
    }

    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        callbacks: {
            onopen: async () => {
                setStatus('connected');
                setIsActive(true);
                lastInteractionTimeRef.current = Date.now();
                setLogs(prev => [...prev, { role: 'system', text: 'Connection Established. AI Receptionist Ready.' }]);
                setNotification({ message: 'Call Connected - Say Hello!', type: 'success' });

                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = inputContext.createMediaStreamSource(streamRef.current);
                sourceRef.current = source;
                
                const processor = inputContext.createScriptProcessor(2048, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (isMuted) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                    const rms = Math.sqrt(sum / inputData.length);
                    
                    if (rms > 0.008) {
                        lastInteractionTimeRef.current = Date.now();
                    }

                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };

                source.connect(processor);
                processor.connect(inputContext.destination);

                sessionPromise.then(session => {
                    if ((session as any).send) {
                         (session as any).send({
                            clientContent: {
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: "The user has connected. Greet them immediately." }]
                                }],
                                turnComplete: true
                            }
                        });
                    }
                });
            },
            onmessage: async (message: LiveServerMessage) => {
                const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audioData) {
                    if (audioContextRef.current) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                        const buffer = await decodeAudioData(base64ToUint8Array(audioData), audioContextRef.current);
                        const source = audioContextRef.current.createBufferSource();
                        source.buffer = buffer;
                        if (analyserRef.current) source.connect(analyserRef.current);
                        source.connect(audioContextRef.current.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;
                    }
                }

                const userTrans = message.serverContent?.inputTranscription?.text;
                if (userTrans) {
                     setLogs(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'user' && !last.isComplete) {
                             return [...prev.slice(0, -1), { ...last, text: last.text + userTrans }];
                        } else {
                             return [...prev, { role: 'user', text: userTrans, isComplete: false }];
                        }
                     });
                }
                
                if (message.serverContent?.turnComplete) {
                    setLogs(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'user') {
                            return [...prev.slice(0, -1), { ...last, isComplete: true }];
                        }
                        return prev;
                    });
                }

                const modelTrans = message.serverContent?.modelTurn?.parts[0]?.text;
                if(modelTrans) {
                     setLogs(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'model' && !last.isComplete) {
                            return [...prev.slice(0, -1), { ...last, text: last.text + modelTrans }];
                        } else {
                            return [...prev, { role: 'model', text: modelTrans, isComplete: false }];
                        }
                     });
                }
                
                if (message.toolCall) {
                    setLogs(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'model') {
                            return [...prev.slice(0, -1), { ...last, isComplete: true }];
                        }
                        return prev;
                    });
                    for (const fc of message.toolCall.functionCalls) {
                        handleToolCall(fc);
                    }
                }
            },
            onclose: () => {
                setStatus('disconnected');
                setIsActive(false);
            },
            onerror: (err) => {
                console.error(err);
                setStatus('disconnected');
                setIsActive(false);
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            thinkingConfig: { thinkingBudget: 0 },
            systemInstruction: generateSystemInstruction(config),
            tools: [{ functionDeclarations: generateTools(config) }],
            inputAudioTranscription: { model: GEMINI_MODEL }
        }
      });

      sessionPromise.then(s => {
          sessionRef.current = s;
      });

    } catch (e) {
      console.error("Connection failed", e);
      setStatus('disconnected');
    }
  };

  const handleFeedbackSubmit = () => {
    setShowFeedback(false);
    setRating(0);
    setComment('');
    setFeedbackName('');
    setFeedbackRoom('');
    setLogs([]); 
  };

  // Phone Simulation Methods
  const handlePhoneDial = async () => {
    setPhoneState({ ...phoneState, active: true });
    setLogs([]);
    try {
        const sid = await simulateCallStart('+256700123456');
        setPhoneState(prev => ({ ...prev, sid, active: true, history: [{ role: 'system', text: "Call Connected. Waiting for greeting..."}] }));
        
        // Auto-greet delay
        setTimeout(() => {
             setLogs(prev => [...prev, { role: 'model', text: "Welcome to Source Garden Hotel. How may I help you today?" }]);
             setPhoneState(prev => ({ ...prev, history: [...prev.history, { role: 'model', text: "Welcome to Source Garden Hotel. How may I help you today?" }] }));
        }, 1000);

    } catch (e) {
        alert("Simulated Call Failed: " + e.message);
        setPhoneState(prev => ({ ...prev, active: false }));
    }
  };

  const handlePhoneHangup = () => {
      setPhoneState({ sid: null, active: false, history: [] });
      setLogs(prev => [...prev, { role: 'system', text: "Call Ended (PSTN Disconnect)" }]);
      setSimulatedSpeech('');
  };

  const handlePhoneSpeechSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!simulatedSpeech.trim() || !phoneState.sid) return;

      const text = simulatedSpeech;
      setSimulatedSpeech('');
      setLogs(prev => [...prev, { role: 'user', text: text }]);
      setPhoneState(prev => ({ ...prev, history: [...prev.history, { role: 'user', text: text }] }));

      try {
          const res = await simulateCallTurn(phoneState.sid, text);
          setLogs(prev => [...prev, { role: 'model', text: res.text }]);
          setPhoneState(prev => ({ 
              ...prev, 
              history: [...prev.history, { role: 'model', text: res.text, xml: res.twiml }] 
          }));
          
          // Refresh data if tool used
          refreshData();

      } catch (e) {
          console.error(e);
          setLogs(prev => [...prev, { role: 'system', text: "Error connecting to AI Backend." }]);
      }
  };

  useEffect(() => {
      let animId: number;
      const updateVolume = () => {
          if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setVolume(avg);
          }
          animId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
      return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => {
        const now = Date.now();

        // AUDIT FIX: Check for suspended AudioContext (common on mobile browsers) and resume if needed
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const isAiSpeaking = audioContextRef.current && nextStartTimeRef.current > audioContextRef.current.currentTime;
        
        // AUDIT FIX: Only count inactivity if AI is not speaking AND we are not busy executing tools/waiting for DB
        if (isAiSpeaking || isBusyRef.current) {
             lastInteractionTimeRef.current = now;
        } else {
             // AUDIT FIX: Increased timeout to 90s to handle silence gaps better
             if (now - lastInteractionTimeRef.current > 90000) {
                 disconnect("Call ended due to inactivity (90s).");
             }
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, disconnect]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // RENDER: Phone Simulator Mode
  if (mode === 'phone') {
      return (
        <div className="h-[calc(100vh-2rem)] flex flex-col relative bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
             <header className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Server className="mr-2 text-purple-600" /> Phone Network Simulator ({config.telephony.provider === 'africastalking' ? "Africa's Talking" : "Twilio"})
                  </h2>
                  <p className="text-sm text-gray-500">Test production logic without browser audio constraints.</p>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setMode('browser')}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                        Switch to Browser Demo
                    </button>
                    <div className="flex items-center space-x-2 text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        <span className="font-medium">Backend Ready</span>
                    </div>
                </div>
             </header>

             <div className="flex-1 flex overflow-hidden">
                 {/* Simulated Phone Screen */}
                 <div className="w-1/3 border-r border-gray-100 bg-gray-50 flex flex-col justify-center items-center p-8">
                      <div className="w-[300px] h-[600px] bg-black rounded-[40px] shadow-2xl p-4 relative border-8 border-gray-800 flex flex-col">
                          {/* Notch */}
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl"></div>
                          
                          {/* Screen Content */}
                          <div className="flex-1 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[30px] overflow-hidden flex flex-col relative">
                              {!phoneState.active ? (
                                  <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                                      <div className="text-white text-6xl font-thin tracking-tighter">12:45</div>
                                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse cursor-pointer hover:bg-green-400 transition-colors" onClick={handlePhoneDial}>
                                          <Phone size={36} className="text-white" />
                                      </div>
                                      <p className="text-white/60 text-sm">Tap to Dial Hotel</p>
                                  </div>
                              ) : (
                                  <div className="flex-1 flex flex-col pt-12">
                                      <div className="flex-1 flex flex-col items-center space-y-4">
                                          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-400">
                                              SG
                                          </div>
                                          <div className="text-center">
                                              <h3 className="text-white text-xl font-semibold">Source Garden Hotel</h3>
                                              <p className="text-white/70 text-sm">00:15</p>
                                          </div>
                                          <div className="w-full px-6 mt-8">
                                              <div className="flex space-x-4 justify-center">
                                                  {[1,2,3,4].map(i => (
                                                      <div key={i} className="h-2 w-2 bg-white/30 rounded-full animate-bounce" style={{animationDelay: `${i*100}ms`}}></div>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="p-8 pb-12 flex justify-center">
                                          <div 
                                              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors shadow-lg"
                                              onClick={handlePhoneHangup}
                                          >
                                              <PhoneOff size={32} className="text-white" />
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                 </div>

                 {/* Server Logs & XML Visualizer */}
                 <div className="flex-1 flex flex-col bg-white">
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {phoneState.history.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                  <Server size={48} />
                                  <p>Server Logs Waiting for Call...</p>
                              </div>
                          )}
                          {phoneState.history.map((item, idx) => (
                              <div key={idx} className="space-y-2 animate-fadeIn">
                                  <div className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                          item.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'
                                      }`}>
                                          <span className="font-bold text-xs uppercase mb-1 block opacity-50">{item.role === 'user' ? 'Caller (STT)' : 'AI Response'}</span>
                                          {item.text}
                                      </div>
                                  </div>
                                  {item.xml && (
                                      <div className="ml-4 max-w-[90%] bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 shadow-inner overflow-x-auto">
                                          <div className="flex items-center space-x-2 text-gray-500 mb-2 border-b border-gray-800 pb-1">
                                              <Code size={12} />
                                              <span>Response XML ({config.telephony.provider === 'africastalking' ? 'AT Voice' : 'TwiML'})</span>
                                          </div>
                                          <pre>{item.xml}</pre>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>

                      {/* Simulator Input */}
                      {phoneState.active && (
                          <div className="p-4 border-t border-gray-100 bg-gray-50">
                              <form onSubmit={handlePhoneSpeechSubmit} className="flex space-x-3">
                                  <input 
                                    type="text" 
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Simulate caller speech (e.g. 'I want to book a room')..."
                                    value={simulatedSpeech}
                                    onChange={(e) => setSimulatedSpeech(e.target.value)}
                                    autoFocus
                                  />
                                  <button 
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors"
                                  >
                                      Speak
                                  </button>
                              </form>
                          </div>
                      )}
                 </div>
             </div>
        </div>
      );
  }

  // RENDER: Default Browser Mode (Original UI)
  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI Receptionist (Live)</h2>
          <p className="text-gray-500">Browser-based voice demo.</p>
        </div>
        <div className="flex items-center space-x-4">
             <button 
                onClick={() => setMode('phone')}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center"
             >
                 <Server size={16} className="mr-2" />
                 Switch to Production Sim
             </button>
            <div className="flex items-center space-x-2">
                <span className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
            </div>
        </div>
      </header>
      
      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-3">
             <CheckCircle className="text-green-400" size={20} />
             <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col lg:flex-row relative bg-white">
        
        {/* Left Column: Visualizer & Logs (40%) */}
        <div className="w-full lg:w-5/12 flex flex-col border-r border-gray-100">
            {/* Visualizer Top Half */}
            <div className="h-1/2 min-h-[300px] flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 relative p-6">
                <div 
                    className="w-40 h-40 rounded-full border-4 border-blue-400/30 flex items-center justify-center transition-all duration-75 relative"
                    style={{ transform: `scale(${1 + volume / 100})` }}
                >
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <Globe className="text-white w-16 h-16 relative z-10" />
                </div>
                <div className="mt-6 text-center text-white">
                    {status === 'connected' ? (
                        <p className="text-lg font-light animate-pulse">Listening & Processing...</p>
                    ) : (
                        <p className="text-lg font-light text-gray-300">Ready to connect</p>
                    )}
                </div>
                <div className="mt-8 flex space-x-4">
                    {status === 'disconnected' ? (
                        <button 
                            onClick={connect}
                            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 transition-transform hover:scale-110 shadow-lg"
                        >
                            <Phone size={28} />
                        </button>
                    ) : (
                        <button 
                            onClick={() => disconnect("Call ended by user.")}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-transform hover:scale-110 shadow-lg"
                        >
                            <PhoneOff size={28} />
                        </button>
                    )}
                    {status === 'connected' && (
                        <>
                            <button 
                                onClick={() => setIsMuted(!isMuted)}
                                className={`rounded-full p-4 transition-colors shadow-lg ${isMuted ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'}`}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>
                            
                            <button
                                onClick={() => handleToolCall({ name: 'end_call', args: {}, id: 'manual' })}
                                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 transition-transform hover:scale-110 shadow-lg"
                                title="Simulate 'end_call' Tool"
                            >
                                <LogOut size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Logs Bottom Half */}
            <div className="flex-1 bg-gray-50 flex flex-col min-h-[300px]">
                <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 flex items-center text-sm">
                        <Activity size={16} className="mr-2" />
                        Live Transcript
                    </h3>
                    <span className="text-xs text-gray-400">{logs.length} events</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
                    {logs.length === 0 && <p className="text-gray-400 text-center italic mt-10">Waiting for conversation...</p>}
                    {logs.map((log, i) => (
                        <div key={i} className={`flex ${log.role === 'model' ? 'justify-start' : log.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                            <div className={`max-w-[90%] p-2.5 rounded-lg ${
                                log.role === 'model' ? 'bg-white border border-gray-200 text-gray-800' :
                                log.role === 'user' ? 'bg-blue-100 text-blue-900' :
                                'bg-yellow-50 text-xs text-yellow-700 border border-yellow-100 uppercase tracking-wider'
                            }`}>
                                {log.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: Calendar (60%) */}
        <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
                 <CalendarIcon className="text-blue-600" size={20} />
                 <h3 className="font-bold text-gray-800">Real-time Availability</h3>
                 <span className="text-xs text-gray-400 font-normal ml-2">(AI can see this data)</span>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <CalendarView className="h-full shadow-none border-0" />
            </div>
        </div>

        {/* Email Preview Modal (For Simulation) */}
        {sentEmail && (
            <div 
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setSentEmail(null)}
            >
                <div 
                    className="bg-white rounded-2xl w-[600px] max-h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-fadeIn m-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center space-x-2">
                            <Mail className="text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-800">✉️ Email Successfully Generated</h3>
                        </div>
