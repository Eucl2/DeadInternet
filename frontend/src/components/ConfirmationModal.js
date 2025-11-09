import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Delete', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded transition-colors font-medium ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;