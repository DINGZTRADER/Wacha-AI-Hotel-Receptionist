import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { Save, Info, Utensils, BedDouble, Shield, Sparkles, Award, Palette, CreditCard, Phone, Server } from 'lucide-react';
import { HotelConfig } from '../types';

const Settings: React.FC = () => {
  const { config, updateConfig, license, user } = useHotel();
  const [activeTab, setActiveTab] = useState<'general' | 'telephony' | 'rooms' | 'dining' | 'services' | 'policies' | 'loyalty' | 'ai' | 'billing'>('general');
  const [formData, setFormData] = useState<HotelConfig>(config);

  const isAdmin = user?.role === 'owner' || user?.role === 'manager';

  const handleChange = (field: keyof HotelConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleBrandingChange = (field: 'logoUrl' | 'primaryColor', value: string) => {
    setFormData(prev => ({
        ...prev,
        branding: {
            ...prev.branding,
            [field]: value
        }
    }));
  };

  const handleTelephonyChange = (field: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        telephony: {
            ...prev.telephony,
            [field]: value
        }
    }));
  };

  const handleSave = () => {
    updateConfig(formData);
    alert('Knowledge Base updated successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General Info', icon: Info },
    { id: 'telephony', label: 'Telephony (VoIP)', icon: Phone },
    { id: 'billing', label: 'Billing & License', icon: CreditCard },
    { id: 'rooms', label: 'Rooms & Rates', icon: BedDouble },
    { id: 'dining', label: 'Dining & Menu', icon: Utensils },
    { id: 'services', label: 'Services', icon: Sparkles },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'loyalty', label: 'Loyalty Program', icon: Award },
    { id: 'ai', label: 'AI Custom Instructions', icon: Sparkles },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Hotel Knowledge Base</h2>
            <p className="text-gray-500">Configure the AI's brain with your hotel's specific details.</p>
        </div>
        {isAdmin && (
            <button 
                onClick={handleSave}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Save size={18} />
                <span>Save Changes</span>
            </button>
        )}
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex min-h-[600px]">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-gray-50 border-r border-gray-100">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-6 py-4 text-left transition-colors border-l-4 ${
                        activeTab === tab.id 
                            ? 'bg-white border-blue-600 text-blue-700 font-medium' 
                            : 'border-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    <tab.icon size={18} />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
            
            {!isAdmin && activeTab !== 'general' ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Shield size={48} className="mb-4" />
                    <h3 className="text-lg font-semibold">Access Restricted</h3>
                    <p>Only Owners and Managers can edit these settings.</p>
                </div>
            ) : (
                <>
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">General Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                                <input 
                                    type="text" 
                                    value={formData.hotelName}
                                    onChange={(e) => handleChange('hotelName', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <input 
                                    type="text" 
                                    value={formData.currency}
                                    onChange={(e) => handleChange('currency', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input 
                                    type="text" 
                                    value={formData.contactPhone}
                                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="text" 
                                    value={formData.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100 my-6" />
                        
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Palette size={18} className="mr-2 text-blue-600" /> Branding (White Label)
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color (Hex)</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="color" 
                                        value={formData.branding.primaryColor}
                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                                        className="h-10 w-10 p-0 border-none rounded cursor-pointer"
                                    />
                                    <input 
                                        type="text"
                                        value={formData.branding.primaryColor}
                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                                        className="flex-1 p-2 border border-gray-200 rounded-lg uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                <input 
                                    type="text" 
                                    value={formData.branding.logoUrl || ''}
                                    onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                                    placeholder="https://yourhotel.com/logo.png"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'telephony' && (
                    <div className="space-y-6">
                         <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-lg">
                             <Server className="text-blue-600 mt-1" size={24} />
                             <div>
                                 <h4 className="font-semibold text-blue-900">Production Telephony Mode</h4>
                                 <p className="text-sm text-blue-800 mt-1">
                                     Configure your VoIP provider here. This replaces the browser-based voice demo with a real phone number that customers can call.
                                 </p>
                             </div>
                         </div>
                         
                         <h3 className="text-lg font-semibold text-gray-800 mt-6">Provider Settings</h3>
                         <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                <select 
                                    value={formData.telephony.provider}
                                    onChange={(e) => handleTelephonyChange('provider', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="twilio">Twilio (Global Standard)</option>
                                    <option value="africastalking">Africa's Talking (East Africa)</option>
                                    <option value="telnyx">Telnyx (SIP)</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input 
                                    type="text" 
                                    value={formData.telephony.phoneNumber}
                                    onChange={(e) => handleTelephonyChange('phoneNumber', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formData.telephony.provider === 'africastalking' ? 'Username' : 'Account SID'}
                                </label>
                                <input 
                                    type={formData.telephony.provider === 'africastalking' ? 'text' : 'password'}
                                    value={formData.telephony.accountSid}
                                    onChange={(e) => handleTelephonyChange('accountSid', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formData.telephony.provider === 'africastalking' ? 'API Key' : 'Auth Token'}
                                </label>
                                <input 
                                    type="password" 
                                    value={formData.telephony.authToken}
                                    onChange={(e) => handleTelephonyChange('authToken', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                             </div>
                             {formData.telephony.provider === 'twilio' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">TTS Voice ID</label>
                                    <input 
                                        type="text" 
                                        value={formData.telephony.voiceId}
                                        onChange={(e) => handleTelephonyChange('voiceId', e.target.value)}
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="e.g. Polly.Joanna"
                                    />
                                </div>
                             )}
                         </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-6">
                         <h3 className="text-lg font-semibold text-gray-800">License & Billing</h3>
                         <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h4 className="font-bold text-gray-900 text-lg uppercase tracking-wider">{license.plan} PLAN</h4>
                                     <p className="text-sm text-gray-600 mt-1">
                                         Active until: <span className="font-medium text-gray-900">{new Date(license.validUntil).toLocaleDateString()}</span>
                                     </p>
                                 </div>
                                 <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${license.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                     {license.isActive ? 'Active' : 'Inactive'}
                                 </div>
                             </div>
                             
                             <div className="mt-6 space-y-2">
                                 <h5 className="text-sm font-medium text-gray-700">Included Features:</h5>
                                 <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                     <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> AI Receptionist</li>
                                     <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Email Notifications</li>
                                     <li className="flex items-center">
                                         {license.plan !== 'starter' ? <span className="text-green-500 mr-2">✓</span> : <span className="text-red-300 mr-2">✕</span>}
                                         WhatsApp Integration
                                     </li>
                                     <li className="flex items-center">
                                         {license.plan === 'enterprise' ? <span className="text-green-500 mr-2">✓</span> : <span className="text-red-300 mr-2">✕</span>}
                                         Multi-Agent Support
                                     </li>
                                 </ul>
                             </div>

                             <div className="mt-8 flex space-x-3">
                                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Upgrade Plan</button>
                                 <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">View Invoices</button>
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Room Configuration</h3>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Types (Comma separated)</label>
                            <p className="text-xs text-gray-500 mb-2">These are used by the AI to filter availability. Make sure they match the descriptions.</p>
                            <input 
                                type="text" 
                                value={formData.roomTypes.join(', ')}
                                onChange={(e) => handleChange('roomTypes', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descriptions & Rates</label>
                            <textarea 
                                value={formData.roomInfo}
                                onChange={(e) => handleChange('roomInfo', e.target.value)}
                                className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'dining' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">Restaurant & Menu</h3>
                        <p className="text-sm text-gray-500">Provide menu items, prices in UGX, and operating hours.</p>
                        <textarea 
                            value={formData.diningInfo}
                            onChange={(e) => handleChange('diningInfo', e.target.value)}
                            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        />
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">Services & Amenities</h3>
                        <p className="text-sm text-gray-500">List airport pickup fees, pool hours, laundry rates, etc.</p>
                        <textarea 
                            value={formData.servicesInfo}
                            onChange={(e) => handleChange('servicesInfo', e.target.value)}
                            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        />
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">Hotel Policies</h3>
                        <p className="text-sm text-gray-500">Check-in/out times, payment methods, cancellation rules.</p>
                        <textarea 
                            value={formData.policyInfo}
                            onChange={(e) => handleChange('policyInfo', e.target.value)}
                            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        />
                    </div>
                )}

                {activeTab === 'loyalty' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">Loyalty Program</h3>
                        <p className="text-sm text-gray-500">Define tiers, rewards, and how guests can join.</p>
                        <textarea 
                            value={formData.loyaltyProgramInfo || ''}
                            onChange={(e) => handleChange('loyaltyProgramInfo', e.target.value)}
                            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                            placeholder="e.g. Silver Tier: Free WiFi..."
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">AI Personality & Overrides</h3>
                        <p className="text-sm text-gray-500">Specific instructions for how the AI should behave and speak.</p>
                        <textarea 
                            value={formData.customInstructions}
                            onChange={(e) => handleChange('customInstructions', e.target.value)}
                            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        />
                    </div>
                )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;