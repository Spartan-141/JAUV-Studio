import React from 'react'

export default function ConfirmationModal({ title, message, onConfirm, onCancel, confirmText = 'Eliminar', cancelText = 'Cancelar', type = 'danger' }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface-800/60 p-6 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-center mb-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner ${type === 'danger' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                        {type === 'danger' ? '🗑️' : '⚠️'}
                    </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">{message}</p>

                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40 hover:shadow-red-500/30' : 'bg-brand-600 hover:bg-brand-500 shadow-brand-900/40 hover:shadow-brand-500/30'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

