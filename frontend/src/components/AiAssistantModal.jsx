import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import './AiAssistantModal.css'

const AiAssistantModal = ({ file, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'qa'
  const [summaryData, setSummaryData] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState('')

  // Q&A State
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    if (file) {
      loadSummary()
    }
  }, [file])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSummary = async () => {
    try {
      setLoadingSummary(true)
      setSummaryError('')
      const res = await api.get(`/ai/${file.id}/summary`)
      setSummaryData(res.data)
      
      // Seed welcome message in Q&A
      setMessages([
        {
          sender: 'ai',
          text: `Hello! I have indexed "${file.original_name}". You can ask me any specific question about this document's contents, definitions, objectives, or dates.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } catch (err) {
      setSummaryError(err.response?.data?.message || 'Failed to generate AI document analysis')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleAskQuestion = async (customQ) => {
    const q = (customQ || question).trim()
    if (!q || asking) return

    const userMsg = {
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setAsking(true)

    try {
      const res = await api.post(`/ai/${file.id}/ask`, { question: q })
      const aiMsg = {
        sender: 'ai',
        text: res.data.answer,
        contextQuote: res.data.contextQuote,
        confidence: res.data.confidence,
        mode: res.data.mode,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Sorry, I could not process your query: ${err.response?.data?.message || 'Server error'}`,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setAsking(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-header-info">
            <div className="ai-badge-row">
              <span className="badge badge-ai">✨ SecureShare AI Assistant</span>
              {summaryData?.mode === 'gemini_ai' ? (
                <span className="badge badge-success">Gemini 1.5 Flash</span>
              ) : (
                <span className="badge badge-brand">Smart Semantic NLP</span>
              )}
            </div>
            <h2 className="ai-file-title">📄 {file.original_name}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="ai-tabs">
          <button
            className={`ai-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📋 Summary & Insights
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            💬 Ask Document (Q&A)
          </button>
        </div>

        {/* Tab 1: Summary & Insights */}
        {activeTab === 'summary' && (
          <div className="ai-tab-content">
            {loadingSummary ? (
              <div className="ai-loading-state">
                <div className="ai-glow-spinner"></div>
                <p>Analyzing document syntax, extracting key takeaways and entities...</p>
              </div>
            ) : summaryError ? (
              <div className="ai-error-box">
                <p>⚠️ {summaryError}</p>
                <button onClick={loadSummary} className="btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                  Try Again
                </button>
              </div>
            ) : (
              <div className="summary-scroll-area">
                {/* Executive Summary */}
                <div className="summary-section">
                  <div className="section-title-row">
                    <h4 className="summary-heading">📌 Executive Summary</h4>
                    <button
                      onClick={() => copyToClipboard(summaryData.summary)}
                      className="copy-btn"
                      title="Copy Summary"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="summary-card">
                    <p className="summary-text">{summaryData.summary}</p>
                  </div>
                </div>

                {/* Key Points */}
                {summaryData.keyPoints?.length > 0 && (
                  <div className="summary-section">
                    <h4 className="summary-heading">🎯 Key Takeaways & Highlights</h4>
                    <ul className="key-points-list">
                      {summaryData.keyPoints.map((point, i) => (
                        <li key={i} className="key-point-item">
                          <span className="bullet-indicator">▸</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Dates / Milestones */}
                {summaryData.importantDates?.length > 0 && (
                  <div className="summary-section">
                    <h4 className="summary-heading">📅 Key Dates & Milestones</h4>
                    <div className="tags-flex">
                      {summaryData.importantDates.map((date, i) => (
                        <span key={i} className="date-pill">
                          ⏱️ {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Categorical Tags */}
                {summaryData.suggestedTags?.length > 0 && (
                  <div className="summary-section">
                    <h4 className="summary-heading">🏷️ Suggested Categories & Tags</h4>
                    <div className="tags-flex">
                      {summaryData.suggestedTags.map((tag, i) => (
                        <span key={i} className="tag-pill">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="ai-footer-meta">
                  <span>Pages: {summaryData.page_count || 1}</span>
                  <span>•</span>
                  <span>Word count: ~{summaryData.word_count || 0}</span>
                  {summaryData.truncated && (
                    <span className="truncated-notice">(Parsed first 25k words for performance)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Document Q&A */}
        {activeTab === 'qa' && (
          <div className="ai-tab-content qa-tab-container">
            {/* Quick Prompts */}
            <div className="quick-prompts-bar">
              <span className="quick-prompt-label">Suggestions:</span>
              <button
                type="button"
                className="quick-prompt-pill"
                onClick={() => handleAskQuestion('What are the main objectives described in this document?')}
              >
                Main objectives?
              </button>
              <button
                type="button"
                className="quick-prompt-pill"
                onClick={() => handleAskQuestion('What are the key deadlines or important dates?')}
              >
                Key deadlines?
              </button>
              <button
                type="button"
                className="quick-prompt-pill"
                onClick={() => handleAskQuestion('Summarize the conclusions or action items.')}
              >
                Action items?
              </button>
            </div>

            {/* Chat Messages */}
            <div className="qa-chat-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-bubble-wrapper ${m.sender}`}>
                  <div className={`chat-bubble ${m.sender} ${m.isError ? 'error-bubble' : ''}`}>
                    <p className="bubble-text">{m.text}</p>
                    {m.contextQuote && (
                      <div className="quote-box">
                        <span className="quote-label">📖 Document Reference:</span>
                        <p className="quote-content">"{m.contextQuote}"</p>
                      </div>
                    )}
                    <div className="bubble-meta">
                      <span className="bubble-time">{m.time}</span>
                      {m.confidence && (
                        <span className="confidence-pill">Match: {m.confidence}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {asking && (
                <div className="chat-bubble-wrapper ai">
                  <div className="chat-bubble ai thinking-bubble">
                    <span className="dot-pulse"></span> Analyzing document passages...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAskQuestion()
              }}
              className="qa-input-form"
            >
              <input
                type="text"
                placeholder="Ask any question about this document..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="qa-text-input"
                disabled={asking}
              />
              <button
                type="submit"
                className="btn-ai btn-sm"
                disabled={!question.trim() || asking}
              >
                {asking ? 'Thinking...' : 'Ask AI ➔'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default AiAssistantModal
