import React from 'react';
import Spinner from './Spinner';
import lazyLoadingImg from '../assets/lazyLoading.webp';

const LazyFallback = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px] transition-opacity duration-300">
            <div className="relative flex flex-col items-center p-6 max-w-xs text-center">
                {/* Lazy loading preview image */}
                <div className="relative mb-4 w-48 h-48 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img 
                        src={lazyLoadingImg} 
                        alt="SS Residency Loading" 
                        className="w-full h-full object-cover opacity-80"
                    />
                </div>
                
                {/* Loader animation and text */}
                <div className="flex items-center gap-2.5 text-[var(--teal-dark,#065b62)] font-semibold text-sm">
                    <Spinner />
                    <span>Loading…</span>
                </div>
            </div>
        </div>
    );
};

export default LazyFallback;
