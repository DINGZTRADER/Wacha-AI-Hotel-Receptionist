import React from 'react';
import { useHotel } from '../context/HotelContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  className?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ className = '' }) => {
  const { bookings, config } = useHotel();
  
  // Simplified calendar logic - showing 7 days from today
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const getBookingsForRoomDate = (room: string, date: Date) => {
    return bookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        checkIn.setHours(0,0,0,0);
        
        const checkOut = new Date(b.checkOut);
        checkOut.setHours(0,0,0,0);
        
        const current = new Date(date);
        current.setHours(0,0,0,0);
        
        // Strict string matching for roomType, allowing overlapping bookings for the same category
        return b.roomType === room && current.getTime() >= checkIn.getTime() && current.getTime() < checkOut.getTime();
    });
  };

  return (
    <div className={`h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
        <h2 className="text-lg font-bold text-gray-800">Booking Availability</h2>
        <div className="flex space-x-2 items-center">
            <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
            <span className="text-sm font-medium text-gray-700">{today.toLocaleDateString()} - {dates[6].toLocaleDateString()}</span>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
            <div className="p-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Room Type</div>
            {dates.map((date, i) => (
              <div key={i} className="p-3 text-center border-l border-gray-100">
                <div className="font-semibold text-gray-800 text-sm">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-xs text-gray-500">{date.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {config.roomTypes.map(room => (
            <div key={room} className="grid grid-cols-8 border-b border-gray-100 min-h-[100px]">
               <div className="p-3 font-medium text-gray-700 flex items-center bg-gray-50/30 text-sm">{room}</div>
               {dates.map((date, i) => {
                 const dayBookings = getBookingsForRoomDate(room, date);
                 return (
                   <div key={i} className="border-l border-gray-100 p-1 relative flex flex-col gap-1 overflow-y-auto max-h-[120px]">
                     {dayBookings.map((booking) => (
                       <div 
                        key={booking.id}
                        className={`w-full rounded-md p-1.5 text-xs font-medium text-white shadow-sm flex flex-col justify-center cursor-pointer transition-transform hover:scale-105 ${
                           booking.status === 'Confirmed' ? 'bg-blue-500' : 
                           booking.status === 'Checked In' ? 'bg-green-500' :
                           booking.status === 'Checked Out' ? 'bg-gray-400' :
                           'bg-orange-400'
                       }`}>
                         <span className="truncate font-bold">{booking.guestName}</span>
                         <span className="text-[10px] opacity-90 truncate">ID: {booking.id.slice(0,4)}</span>
                       </div>
                     ))}
                   </div>
                 );
               })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;