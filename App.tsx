import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import InputArea from './components/InputArea';
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage, MessageRole } from './types';
import { Bot, User } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string, image?: string) => {
    // Add user message locally
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: MessageRole.USER,
      text: text,
      image: image,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get the last 5 messages for context
      // Note: `messages` here refers to the state BEFORE the update above is processed 
      // in this closure, which is exactly what we want (previous history).
      // If we wanted to include older messages, we slice the end.
      const history = messages.slice(-5);

      // Call Gemini API with history
      const response = await sendMessageToGemini(text, image, history);

      // Add Model Message
      const modelMessage: ChatMessage = {
        id: uuidv4(),
        role: MessageRole.MODEL,
        text: response.text,
        image: response.generatedImage,
        isGeneratedImage: !!response.generatedImage
      };
      
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: MessageRole.MODEL,
        text: "عذراً، حدث خطأ غير متوقع.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-100 py-4 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 tracking-wide">NASRO GPT</h1>
        <p className="text-xs text-gray-500 mt-1 font-semibold">بواسطة نصرالدين عبد المطلب</p>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pt-24 pb-28 px-4 sm:px-0">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center mt-20 opacity-50">
                <Bot size={64} className="mb-4 text-gray-300" />
                <p>مرحباً بك في NASRO GPT</p>
                <p className="text-sm mt-2">يمكنك الكتابة أو إرفاق صورة أو طلب رسم صورة</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === MessageRole.USER ? 'justify-start' : 'justify-start'
              }`}
            >
              <div className={`flex gap-3 max-w-[95%] sm:max-w-[85%] ${msg.role === MessageRole.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === MessageRole.USER ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {msg.role === MessageRole.USER ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div
                  className={`flex flex-col rounded-2xl p-4 shadow-sm ${
                    msg.role === MessageRole.USER
                      ? 'bg-blue-50 rounded-tr-none border border-blue-100 text-gray-800'
                      : 'bg-white rounded-tl-none border border-gray-100 text-gray-800'
                  }`}
                >
                  {/* User Uploaded Image */}
                  {msg.image && !msg.isGeneratedImage && (
                    <img
                      src={msg.image}
                      alt="User uploaded"
                      className="rounded-lg mb-3 max-h-64 object-cover w-full border border-gray-200"
                    />
                  )}

                  {/* AI Generated Image */}
                  {msg.image && msg.isGeneratedImage && (
                     <div className="mb-3">
                        <img
                          src={msg.image}
                          alt="AI Generated"
                          className="rounded-lg max-h-80 w-auto border border-gray-200 shadow-md"
                        />
                     </div>
                  )}

                  {/* Text Content */}
                  <div className="prose prose-sm max-w-none prose-p:text-gray-800 prose-headings:text-gray-900 leading-relaxed font-normal" dir="rtl">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
               <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
               </div>
               <div className="bg-white rounded-2xl rounded-tl-none border border-gray-100 p-4 flex items-center gap-2">
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <InputArea onSend={handleSend} isLoading={isLoading} />
    </div>
  );
};

export default App;