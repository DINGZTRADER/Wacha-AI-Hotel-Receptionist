import React from 'react';
import { useHotel } from '../context/HotelContext';
import { Search, User, Phone, Mail, Clock, CreditCard, Heart } from 'lucide-react';

const Clients: React.FC = () => {
  const { clients, config } = useHotel();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Client Database</h2>
        <div className="text-sm text-gray-500">
            {clients.length} Registered Guests
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          {clients.map(client => (
              <div key={client.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                              <User size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                      <Phone size={14} />
                                      <span>{client.phone}</span>
                                  </div>
                                  {client.email && (
                                    <div className="flex items-center space-x-1">
                                        <Mail size={14} />
                                        <span>{client.email}</span>
                                    </div>
                                  )}
                              </div>
                              {client.preferences && (
                                  <div className="mt-3 flex items-start space-x-2 text-sm text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                                      <Heart size={16} className="mt-0.5 flex-shrink-0" />
                                      <span>{client.preferences}</span>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                          <div className="flex items-center justify-end space-x-2 text-sm text-gray-600">
                              <Clock size={16} />
                              <span>Last Visit: {new Date(client.lastVisit || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-end space-x-2 text-sm font-medium text-gray-900">
                              <CreditCard size={16} className="text-gray-400" />
                              <span>Total Spent: {new Intl.NumberFormat('en-UG', { style: 'currency', currency: config.currency }).format(client.totalSpent)}</span>
                          </div>
                          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                              {client.stayCount} Stays
                          </div>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Clients;