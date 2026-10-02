import React from 'react';
import logoImg from '../../public/logo.png'; 

const LazyFallback = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc]/80 backdrop-blur-md transition-all duration-500">
            <div className="relative flex flex-col items-center justify-center">
                
                {/* Outer rotating/pulsing ring */}
                <div className="absolute inset-0 -m-8 rounded-full border-[3px] border-transparent border-t-[#1877F2] border-r-[#1877F2]/30 animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 -m-8 rounded-full border-[3px] border-transparent border-b-[#0F2A4A] border-l-[#0F2A4A]/30 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                
                {/* Glowing backdrop */}
                <div className="absolute inset-0 -m-4 bg-gradient-to-tr from-[#1877F2]/20 to-[#0F2A4A]/20 rounded-full blur-xl animate-pulse" />

                {/* Center Logo */}
                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-900/5">
                    <img 
                        src={logoImg} 
                        alt="SS Residency" 
                        className="h-14 w-auto object-contain animate-pulse"
                    />
                </div>

                {/* Loading Text */}
               

            </div>
        </div>
    );
};

export default LazyFallback;
