import React from 'react';
import { useHotel } from '../context/HotelContext';
import { Search, Filter, MoreVertical } from 'lucide-react';

const Bookings: React.FC = () => {
  const { bookings, config } = useHotel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: config.currency, minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Reservations</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            New Booking
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search guests..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Filter size={20} />
                <span>Filter</span>
            </button>
        </div>

        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                    <th className="p-4 font-medium">Guest</th>
                    <th className="p-4 font-medium">Room</th>
                    <th className="p-4 font-medium">Check In</th>
                    <th className="p-4 font-medium">Check Out</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Total</th>
                    <th className="p-4 font-medium"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {bookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                            <div className="font-medium text-gray-900">{booking.guestName}</div>
                            <div className="text-xs text-gray-500">ID: {booking.id.slice(0,6)}</div>
                        </td>
                        <td className="p-4 text-gray-700">{booking.roomType}</td>
                        <td className="p-4 text-gray-600">{new Date(booking.checkIn).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-600">{new Date(booking.checkOut).toLocaleDateString()}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'Checked In' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {booking.status}
                            </span>
                        </td>
                        <td className="p-4 text-gray-900 font-medium">{formatCurrency(booking.totalUGX)}</td>
                        <td className="p-4 text-right">
                            <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical size={20} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Bookings;