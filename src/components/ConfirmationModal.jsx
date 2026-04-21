import React from 'react'

export default function ConfirmationModal({ title, message, onConfirm, onCancel, confirmText = 'Eliminar', cancelText = 'Cancelar', type = 'danger' }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal relative w-full max-w-sm text-center animate-slide-in">
                <div className="flex justify-center mb-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner ${
                        type === 'danger' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                        {type === 'danger' ? '🗑️' : '⚠️'}
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fg)' }}>{title}</h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{message}</p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                        style={{ color: 'var(--fg-muted)', backgroundColor: 'var(--surface-700)', border: '1px solid var(--border-strong)' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all shadow-lg ${
                            type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-brand-600 hover:bg-brand-500'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
