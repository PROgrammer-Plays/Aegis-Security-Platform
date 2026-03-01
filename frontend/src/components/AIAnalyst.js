// src/components/AIAnalyst.js - Gemini-Powered Tier 3 Security Analyst
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Brain, Send, Loader, AlertTriangle, CheckCircle, X, Minimize2, Sparkles } from 'lucide-react';
import './AIAnalyst.css';

const AIAnalyst = ({ alert, onClose, isMinimized, onToggleMinimize }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const[analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Configuration ---
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  const MODEL_NAME = "gemini-2.5-flash"; // Extremely fast and capable for this

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-analyze alert on mount
  useEffect(() => {
    if (alert && messages.length === 0) {
      runInitialAnalysis();
    }
    // eslint-disable-next-line
  }, [alert]);

  // 1. Initial Analysis Logic
  const runInitialAnalysis = async () => {
    setAnalyzing(true);

    if (!API_KEY) {
      setMessages([{ role: 'model', content: "❌ Critical: Missing REACT_APP_GEMINI_API_KEY in .env", timestamp: new Date() }]);
      setAnalyzing(false);
      return;
    }

    // Set a temporary loading system message
    setMessages([{ role: 'system', content: '🔍 Analyzing alert... Please wait.', timestamp: new Date() }]);

    const analysisPrompt = `You are a Tier 3 Security Analyst. Analyze this security alert and provide:

1. **SUMMARY (Plain English):** What happened?
2. **SEVERITY ASSESSMENT:** How serious is this?
3. **IMMEDIATE ACTIONS:** Step-by-step remediation.
4. **THREAT CONTEXT:** Known threats, TTPs, or explanations applicable to this finding.

Alert Details:
- Type: ${alert.alertType}
- Severity: ${alert.severity}
- Engine: ${alert.engine}
- Details: ${JSON.stringify(alert.details, null, 2)}

Provide a clear, actionable analysis that a junior analyst can follow. Make it readable with Markdown.`;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      const result = await model.generateContent(analysisPrompt);
      const aiResponse = result.response.text();

      // THE FIX: We record the prompt as a "User" message, but mark it hidden from the UI.
      // This makes the history mathematically correct for Gemini without ruining our design.
      setMessages([
        { role: 'user', content: analysisPrompt, timestamp: new Date(), isHidden: true },
        { role: 'model', content: aiResponse, timestamp: new Date(), type: 'analysis' }
      ]);
      
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      setMessages([
        { role: 'model', content: `❌ Analysis failed: ${error.message}. Please try asking a specific question.`, timestamp: new Date() }
      ]);
    }

    setAnalyzing(false);
  };

  // 2. Chat Conversation Logic
  const handleSend = async (messageText) => {
    if (!messageText.trim() || loading || analyzing) return;

    // Add user message to UI
    const userMessage = { role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const systemContext = `Act as a fast-paced Tier 3 SOC Analyst. Review this alert and give a strictly formatted, ultra-short analysis. No intro or filler words. 

Limit response to these 4 brief bullet points ONLY:
**1. Summary:** [1 sentence explaining the attack]
**2. Assessment:**[Criticality level and 5-word reason]
**3. Actions:**[Top 1 or 2 quick commands/remediations to run]
**4. Context:** [1 short sentence on known TTPs/Botnets related to this, if any]

Alert Details:
- Type: ${alert.alertType}
- Severity: ${alert.severity}
- Engine: ${alert.engine}
- Details: ${JSON.stringify(alert.details)}`;

      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: { parts: [{ text: systemContext }] }
      });

      // Filter out only visible/hidden valid messages. Do NOT include generic 'system' roles in API history
      const validHistory = messages
        .filter(m => m.role === 'user' || m.role === 'model')
        .map(m => ({
          role: m.role,
          parts:[{ text: m.content }]
        }));

      // Start chat utilizing perfectly aligned history
      const chat = model.startChat({ history: validHistory });

      // Transmit user input
      const result = await chat.sendMessage(messageText);
      const responseText = result.response.text();

      setMessages(prev =>[...prev, {
        role: 'model',
        content: responseText,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>[...prev, {
        role: 'model',
        content: `❌ Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  const quickQuestions =[
    "Is this IP address malicious?",
    "What are the exact next steps?",
    "Explain what this engine actually detected.",
    "What MITRE ATT&CK techniques apply here?",
    "Should I isolate this machine immediately?",
  ];

  if (isMinimized) {
    return (
      <div className="ai-analyst-minimized" onClick={onToggleMinimize}>
        <Brain size={24} />
        <span>AI Analyst</span>
        <span className="minimized-indicator">💬 {messages.filter(m=>!m.isHidden && m.role!=='system').length}</span>
      </div>
    );
  }

  return (
    <div className="ai-analyst-panel">
      {/* Header */}
      <div className="ai-analyst-header">
        <div className="header-left">
          <Sparkles size={24} color="#00bcd4" />
          <div>
            <h3>AI Security Analyst</h3>
            <span className="analyst-subtitle">Powered by Dual AI Pipeline</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleMinimize} title="Minimize">
            <Minimize2 size={18} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
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

      {/* Messages Feed */}
      <div className="ai-messages">
        {messages.map((msg, idx) => {
          // IMPORTANT UI CHANGE: Do not render hidden prompts.
          if (msg.isHidden) return null;

          return (
            <div key={idx} className={`message ${msg.role === 'model' || msg.role === 'system' ? 'message-assistant' : 'message-user'}`}>
              {(msg.role === 'model' || msg.role === 'system') && (
                <div className="message-avatar">
                  {msg.type === 'analysis' ? <CheckCircle size={20} /> : <Brain size={20} />}
                </div>
              )}
              <div className="message-content">
                {msg.type === 'analysis' && (
                  <div className="analysis-badge">
                    <CheckCircle size={14} /> AI Context Complete
                  </div>
                )}
                <div className="message-text">
                  {/* Parse out bolding / Markdown basics */}
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i}>
                      {line.split('**').map((part, j) => 
                        j % 2 === 1 ? <strong key={j} style={{color:'#66fcf1'}}>{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>
                <div className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loaders */}
        {(loading || analyzing) && (
          <div className="message message-assistant">
            <div className="message-avatar">
              <Sparkles size={20} color="#00bcd4"/>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div className="loading-text">
                {analyzing ? 'Crunching IOCs and Threat Logs...' : 'Generating response...'}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions Menu */}
      {messages.length > 0 && !loading && !analyzing && (
        <div className="quick-questions">
          <div className="quick-label">Suggested Queries:</div>
          <div className="quick-buttons">
            {quickQuestions.map((q, idx) => (
              <button key={idx} className="quick-btn" onClick={() => handleSend(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Input */}
      <form className="ai-chat-form" onSubmit={handleFormSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me how to resolve this incident..."
          disabled={loading || analyzing}
        />
        <button type="submit" disabled={!input.trim() || loading || analyzing} className="send-btn">
          {loading ? <Loader size={20} className="spinning" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default AIAnalyst;