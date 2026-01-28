import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { Lock, Mail, ChevronRight, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useHotel();
  const [email, setEmail] = useState('faridahkyohirwe@gmail.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate network delay for "Backend Auth"
    setTimeout(() => {
        const success = login(email, password);
        if (!success) {
            setError('Invalid credentials. Try faridahkyohirwe@gmail.com / password');
            setLoading(false);
        }
        // If success, the App component will re-render and show the dashboard
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-800 opacity-50">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          </div>
          <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                <ShieldCheck className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Wacha AI Host</h1>
              <p className="text-blue-200 text-sm mt-2">Hotel Management System</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="name@hotel.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-gray-600">Remember me</span>
                    </label>
                    <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Forgot password?</a>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span>Authenticating...</span>
                    ) : (
                        <>
                            <span>Sign In to Dashboard</span>
                            <ChevronRight size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500">
                Protected by Wacha Security. &copy; {new Date().getFullYear()} Wacha AI.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;