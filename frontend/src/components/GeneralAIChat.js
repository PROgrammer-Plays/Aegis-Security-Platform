// src/components/GeneralAIChat.js
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { Brain, Send, Loader, X, Minimize2, Sparkles } from 'lucide-react';
import './GeneralAIChat.css';

const GeneralAIChat = ({ onClose, isMinimized, onToggleMinimize }) => {
  const[messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const[loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const role = localStorage.getItem('role') || 'employee';
  const username = localStorage.getItem('username') || 'User';

  // --- 1. INITIALIZE GEMINI CLIENT ---
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

  // We recommend 1.5-flash for max stability right now, 
  // but you can change it to gemini-2.5-flash if enabled on your Google Cloud project.
  const MODEL_NAME = "gemini-2.5-flash";  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { 
    scrollToBottom(); 
  }, [messages]);

  // Initial Welcome Message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'model', 
        text: getWelcomeMessage(),
        timestamp: new Date()
      }]);
    }
    // eslint-disable-next-line
  },[]);

  const getWelcomeMessage = () => {
    const roleMessages = {
      admin: `👋 Hello **${username}**! I'm your Admin Security Assistant.\nI can analyze complex threats, system logs, and user policies.`,
      senior: `👋 Hello **${username}**! I'm your SOC Analyst Assistant.\nI can help with threat hunting, IOC analysis, and incident response.`,
      employee: `👋 Hello **${username}**! I'm your Security Helper.\nAsk me about password safety, phishing, or suspicious files.`
    };
    return roleMessages[role] || roleMessages.employee;
  };

  // --- SYSTEM PERSONA INSTRUCTIONS ---
  const getSystemInstruction = () => {
    const context = {
      admin: "You are a Tier 3 Security expert for Aegis Platform. Be concise, technical, and strategic.",
      senior: "You are a Senior SOC Analyst. Focus on IOCs, kill-chains, and tactical remediation.",
      employee: "You are a helpful IT Security Guide. Explain simply. Focus on phishing prevention and safety."
    };
    return context[role] || context.employee;
  };

  // --- CORE SEND FUNCTION ---
  const handleSend = async (messageText) => {
    if (!messageText.trim() || loading) return;

    if (!API_KEY) {
      setMessages(prev =>[...prev, { 
        role: 'model', 
        text: "❌ Critical Error: Missing REACT_APP_GEMINI_API_KEY in frontend/.env", 
        timestamp: new Date() 
      }]);
      return;
    }

    // 1. Add User Message to UI
    const userMessage = { role: 'user', text: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input box immediately
    setLoading(true);

    try {
      // 2. Initialize Model
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: getSystemInstruction() 
      });

      // 3. Prepare STRICT History for API 
      // We skip the FIRST message (Welcome) because Gemini requires history to start with a User.
      const apiHistory = messages
        .filter((msg, index) => index > 0) 
        .map(m => ({
          role: m.role,
          parts:[{ text: m.text }]
        }));

      // 4. Start Chat Session
      const chat = model.startChat({
        history: apiHistory,
      });

      // 5. Send Message to Google
      const result = await chat.sendMessage(messageText);
      const responseText = result.response.text();

      // 6. Render AI Response to UI
      setMessages(prev =>[...prev, {
        role: 'model',
        text: responseText,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("🚨 GEMINI ERROR:", error); 
      setMessages(prev =>[...prev, {
        role: 'model',
        text: `❌ API Error: ${error.message}`, 
        timestamp: new Date()
      }]);
    }
    
    setLoading(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  // UI Setup 
  const quickQuestions = {
    admin:["How do I handle ransomware?", "Explain Zero Trust principles"],
    senior: ["Analyze typical phishing techniques", "What are common IOCs for Emotet?"],
    employee:["Is my password strong enough?", "How to spot fake emails"]
  };

  // === RENDER METHODS ===

  if (isMinimized) {
    return (
      <div className="general-ai-minimized" onClick={onToggleMinimize}>
        <Sparkles size={20} />
        <span>AI Assistant</span>
        {messages.length > 1 && <span className="minimized-indicator">{messages.length - 1}</span>}
      </div>
    );
  }

  return (
    <div className="general-ai-panel">
      
      {/* Header */}
      <div className="general-ai-header">
        <div className="header-left">
          <div className="ai-avatar">
            <Sparkles size={24} />
          </div>
          <div>
            <h3>AEGIS Intelligence</h3>
            <span className="assistant-subtitle">Powered by AEGES AI</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleMinimize} title="Minimize">
            <Minimize2 size={16} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* User Context Badge (Applying your CSS specifically for this) */}
      <div className="user-context-badge">
        <span className={`role-pill ${role}`}>
          {role === 'admin' ? '👑 Admin' : role === 'senior' ? '🎯 Analyst' : '👤 User'}
        </span>
        <span className="username">ID: {username}</span>
      </div>

      {/* Messages */}
      <div className="general-ai-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role === 'model' ? 'message-assistant' : 'message-user'}`}>
            {msg.role === 'model' && (
               <div className="message-avatar">
                 <Brain size={18} />
               </div>
            )}
            <div className="message-content">
              <div className="message-text">
                {msg.text.split('\n').map((line, i) => (
                  <div key={i}>
                      {line.split('**').map((part, j) => 
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                  </div>
                ))}
              </div>
              <div className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="chat-message message-assistant">
             <div className="message-avatar">
               <Loader size={18} className="spinning" />
             </div>
             <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <div className="loading-text">Analyzing securely...</div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions Menu */}
      {messages.length === 1 && !loading && (
        <div className="quick-questions">
          <div className="quick-label">Suggested Queries</div>
          <div className="quick-buttons">
            {(quickQuestions[role] || quickQuestions.employee).map((q, idx) => (
              <button 
                key={idx} 
                className="quick-btn" 
                onClick={() => handleSend(q)} /* FIX: React direct calling! No DOM events */
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form className="general-ai-chat-form" onSubmit={handleFormSubmit}>
        <input 
          type="text" 
          placeholder={`Message AEGIS AI as ${username}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={!input.trim() || loading} className="send-btn">
          <Send size={18} />
        </button>
      </form>
      
      {/* Footer Info */}
      <div className="general-ai-footer">
        <span className="ai-info">
          🔒 Secure End-to-End Interaction
        </span>
      </div>

    </div>
  );
};

export default GeneralAIChat;