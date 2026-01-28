import React from 'react';
import { useHotel } from '../context/HotelContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, DollarSign, Calendar, Server, MessageCircle, Mail, CheckCircle, Shield, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { bookings, logs, config, license } = useHotel();

  // Simple stats calculation
  const totalRevenue = bookings.reduce((acc, b) => acc + b.totalUGX, 0);
  const activeBookings = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Checked In').length;
  
  // Calculate Simulated Usage Cost (UGX)
  const whatsappCount = logs.filter(l => l.channel === 'whatsapp').length;
  const whatsappCost = whatsappCount * 150; // 150 UGX per msg
  const emailCount = logs.filter(l => l.channel === 'email').length;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: config.currency, maximumFractionDigits: 0 }).format(amount);
  };

  const daysRemaining = Math.ceil((new Date(license.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const chartData = [
    { name: 'Mon', revenue: 400000 },
    { name: 'Tue', revenue: 300000 },
    { name: 'Wed', revenue: 550000 },
    { name: 'Thu', revenue: 450000 },
    { name: 'Fri', revenue: 800000 },
    { name: 'Sat', revenue: 950000 },
    { name: 'Sun', revenue: 700000 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500">Overview of {config.hotelName} performance</p>
        </div>
        <div className="flex items-center space-x-2 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-medium">System Operational</span>
        </div>
      </header>
      
      {/* License Status Bar */}
      <div className={`rounded-xl border p-4 flex justify-between items-center ${
          daysRemaining < 7 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
          <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${daysRemaining < 7 ? 'bg-white/50' : 'bg-white/60'}`}>
                <Shield size={20} />
              </div>
              <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">{license.plan} LICENSE</h3>
                  <p className="text-xs opacity-90">
                      {daysRemaining > 0 ? `Valid for ${daysRemaining} more days.` : 'License Expired.'}
                  </p>
              </div>
          </div>
          <div className="text-right">
              <span className="text-xs font-mono opacity-80 block">ID: {license.id}</span>
              {license.plan === 'starter' && (
                  <span className="text-xs font-bold flex items-center mt-1">
                      <AlertTriangle size={12} className="mr-1" /> Upgrade for WhatsApp
                  </span>
              )}
          </div>
      </div>

      {/* Infrastructure Health & Billing (SaaS Tier) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-md">
              <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center">
                  <Server size={16} className="mr-2" /> INFRASTRUCTURE HEALTH
              </h3>
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm">PostgreSQL DB</span>
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-green-400">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                          <MessageCircle size={14} className={license.plan === 'starter' ? 'text-gray-500' : 'text-green-400'} />
                          <span className="text-sm">WhatsApp Cloud API</span>
                      </div>
                      {license.plan === 'starter' ? (
                          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">Locked</span>
                      ) : (
                          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-green-400">Active</span>
                      )}
                  </div>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-blue-400" />
                          <span className="text-sm">SMTP Relay</span>
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-blue-400">Ready</span>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 text-sm font-medium mb-2">USAGE BILLING (EST.)</h3>
              <div className="flex items-end space-x-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(whatsappCost)}</span>
                  <span className="text-sm text-gray-500 mb-1">/ month</span>
              </div>
              <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                      <span>WhatsApp Conversations</span>
                      <span className="font-medium">{whatsappCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Plan: {license.plan.toUpperCase()} (150 UGX/msg)</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  <Activity size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{logs.length}</h3>
              <p className="text-sm text-gray-500">AI Interactions Today</p>
              <div className="mt-4 flex space-x-2 text-xs">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">98% Success</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">24ms Latency</span>
              </div>
          </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Guests</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{activeBookings}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Emails Sent</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{emailCount}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <Mail size={20} />
            </div>
          </div>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">3</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <Calendar size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Revenue ({config.currency})</h3>
          <div className="h-64 w-full" style={{ minHeight: '250px' }}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f3f4f6'}}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Audit Log</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {logs.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start space-x-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                <div className={`mt-1 rounded-full p-1.5 flex-shrink-0 ${
                  log.channel === 'voice' ? 'bg-blue-100 text-blue-600' : 
                  log.channel === 'whatsapp' ? 'bg-green-100 text-green-600' : 
                  log.channel === 'email' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                    {log.channel === 'whatsapp' ? <MessageCircle size={10} /> : 
                     log.channel === 'email' ? <Mail size={10} /> :
                     log.channel === 'voice' ? <Activity size={10} /> :
                     <CheckCircle size={10} />
                    }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-800 font-medium truncate">{log.content}</p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{log.recipient}</p>
                  {(log.channel === 'whatsapp' || log.channel === 'email') && (
                      <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] bg-green-50 text-green-600 px-1.5 rounded border border-green-100">
                              Status: {log.status}
                          </span>
                          <span className="text-[10px] text-gray-300 font-mono">Ref: {log.referenceId?.slice(0,8)}...</span>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;