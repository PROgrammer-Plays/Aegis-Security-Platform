// src/components/AlertAIAnalyst.js - WORKING VERSION using Google SDK
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Brain, Send, Loader, X, Minimize2, AlertTriangle } from 'lucide-react';
import './AlertAIAnalyst.css';

const AlertAIAnalyst = ({ alert, onClose, isMinimized, onToggleMinimize }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  const role = localStorage.getItem('role') || 'employee';
  const username = localStorage.getItem('username') || 'User';

  // Use same API key and model as GeneralAIChat
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  const MODEL_NAME = "gemini-2.5-flash";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { 
    scrollToBottom(); 
  }, [messages]);

  // Auto-analyze alert on mount
  useEffect(() => {
    if (alert && messages.length === 0) {
      analyzeAlert();
    }
    // eslint-disable-next-line
  }, [alert]);

  const analyzeAlert = async () => {
    setAnalyzing(true);
    
    // Add analyzing message
    setMessages([{
      role: 'model',
      text: '🔍 Analyzing alert... Please wait.',
      timestamp: new Date()
    }]);

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: getAnalystSystemInstruction()
      });

      // Build analysis prompt
      const analysisPrompt = buildAnalysisPrompt(alert);

      // Generate analysis
      const result = await model.generateContent(analysisPrompt);
      const responseText = result.response.text();

      // Replace analyzing message with actual analysis
      setMessages([{
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        isAnalysis: true
      }]);

    } catch (error) {
      console.error("🚨 Alert Analysis Error:", error);
      setMessages([{
        role: 'model',
        text: `❌ Analysis Error: ${error.message}\n\nPlease check your API key and try again.`,
        timestamp: new Date()
      }]);
    }

    setAnalyzing(false);
  };

  const buildAnalysisPrompt = (alert) => {
    return `You are a Tier 3 Security Analyst. Analyze this security alert and provide:

1. **SUMMARY** (Plain English): What happened?
2. **SEVERITY ASSESSMENT**: How serious is this?
3. **IMMEDIATE ACTIONS**: Step-by-step remediation (numbered list)
4. **THREAT CONTEXT**: Known threats, TTPs, attribution if applicable

Alert Details:
- Type: ${alert.alertType}
- Severity: ${alert.severity}
- Engine: ${alert.engine}
- Time: ${new Date(alert.timestamp).toLocaleString()}
- Details: ${JSON.stringify(alert.details, null, 2)}

Provide a clear, actionable analysis. Use bullet points and bold text for emphasis.`;
  };

  const getAnalystSystemInstruction = () => {
    const context = {
      admin: "You are a Tier 3 Security Analyst expert. Provide deep technical analysis, strategic recommendations, and comprehensive threat intelligence.",
      senior: "You are a Senior SOC Analyst. Focus on tactical response, IOC analysis, MITRE ATT&CK mappings, and detailed remediation steps.",
      employee: "You are a Security Assistant. Explain threats simply, focus on immediate actions, and provide clear guidance without overwhelming technical jargon."
    };
    return context[role] || context.senior;
  };

  const handleSend = async (messageText) => {
    if (!messageText.trim() || loading) return;

    // Add user message
    const userMessage = { 
      role: 'user', 
      text: messageText, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: getAnalystSystemInstruction()
      });

      // Prepare conversation history (skip initial analysis)
      let validHistory = messages.filter(m => !m.isAnalysis);
      if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory.shift();
      }

      const apiHistory = validHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Add alert context to the conversation
      const contextualPrompt = `Context: You're analyzing this security alert:

Alert: ${alert.alertType}
Severity: ${alert.severity}
Engine: ${alert.engine}
Details: ${JSON.stringify(alert.details, null, 2)}

User Question: ${messageText}

Provide a clear, concise answer based on the alert context.`;

      // Start chat session
      const chat = model.startChat({
        history: apiHistory,
      });

      // Send message
      const result = await chat.sendMessage(contextualPrompt);
      const responseText = result.response.text();

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("🚨 Chat Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `❌ Error: ${error.message}`,
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  const quickQuestions = [
    "Is this IP address malicious?",
    "What are the next steps?",
    "What MITRE ATT&CK techniques are involved?",
    "Should I escalate this?",
    "How do I contain this threat?",
    "Has this happened before?"
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
    setTimeout(() => {
      handleSend(question);
    }, 100);
  };

  if (isMinimized) {
    return (
      <div className="alert-ai-minimized" onClick={onToggleMinimize}>
        <Brain size={24} />
        <span>AI Analyst</span>
        <span className="msg-count">💬 {messages.length}</span>
      </div>
    );
  }

  return (
    <div className="alert-ai-panel">
      {/* Header */}
      <div className="alert-ai-header">
        <div className="header-left">
          <Brain size={24} color="#00bcd4" />
          <div>
            <h3>AI Security Analyst</h3>
            <span className="analyst-subtitle">Powered by {MODEL_NAME}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleMinimize}>
            <Minimize2 size={18} />
          </button>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Alert Context Badge */}
      <div className="alert-context-badge">
        <AlertTriangle size={16} />
        <span>Analyzing: {alert.alertType}</span>
        <span className={`severity-pill ${alert.severity?.toLowerCase()}`}>
          {alert.severity}
        </span>
      </div>

      {/* Messages */}
      <div className="alert-ai-messages">
        {messages.length === 0 && !analyzing && (
          <div className="empty-chat">
            <Brain size={48} color="#00bcd4" />
            <p>AI Analyst Ready</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            {msg.role === 'model' && (
              <div className="message-avatar">
                <Brain size={20} />
              </div>
            )}
            <div className="message-content">
              {msg.isAnalysis && (
                <div className="analysis-badge">
                  ✓ AI Analysis Complete
                </div>
              )}
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

        {(loading || analyzing) && (
          <div className="message message-model">
            <div className="message-avatar">
              <Brain size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="loading-text">
                {analyzing ? 'Analyzing alert...' : 'Thinking...'}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length > 0 && !loading && !analyzing && (
        <div className="quick-questions">
          <div className="quick-label">Quick Questions:</div>
          <div className="quick-buttons">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                className="quick-btn"
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form className="alert-ai-input" onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this alert..."
          disabled={loading || analyzing}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading || analyzing}
        >
          {loading ? <Loader size={20} className="spinning" /> : <Send size={20} />}
        </button>
      </form>

      {/* Footer */}
      <div className="alert-ai-footer">
        <span className="ai-info">
          🔒 Alert-specific analysis with full context
        </span>
      </div>
    </div>
  );
};

export default AlertAIAnalyst;
