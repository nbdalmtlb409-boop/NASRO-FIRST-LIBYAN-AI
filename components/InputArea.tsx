import React, { useRef, useState } from 'react';
import { Paperclip, Send, X } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string, image?: string) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value so same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if ((!text.trim() && !attachedImage) || isLoading) return;
    
    onSend(text, attachedImage || undefined);
    setText('');
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-100 pb-6 sm:pb-4">
      {/* Image Preview */}
      {attachedImage && (
        <div className="mb-2 relative inline-block">
          <img 
            src={attachedImage} 
            alt="مرفق" 
            className="h-20 w-20 object-cover rounded-lg border border-gray-200" 
          />
          <button
            onClick={() => setAttachedImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
        >
          <Paperclip size={24} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Text Input */}
        <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              disabled={isLoading}
              rows={1}
              className="w-full bg-transparent border-none p-4 resize-none outline-none max-h-32 focus:ring-0 text-gray-800 placeholder-gray-400"
              style={{ minHeight: '56px' }}
            />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !attachedImage) || isLoading}
          className={`p-3 rounded-full transition-all duration-200 shadow-md ${
            (!text.trim() && !attachedImage) || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95'
          }`}
        >
          <Send size={24} className={isLoading ? "animate-pulse" : ""} />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
