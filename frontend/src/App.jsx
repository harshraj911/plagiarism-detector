import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ShieldCheck,
  FileUp,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Search,
  Printer,
  Database,
  Cpu,
  Layers,
  ExternalLink,
  Lightbulb,
  Zap,
  ArrowLeft,
  Share2,
  Globe
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050';

// ── Cinematic Components ───────────────────────────────────────────────────

const Logo = ({ size = 40 }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-primary)', borderRadius: '35%', opacity: 0.5 }}
    />
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      style={{ position: 'absolute', inset: 3, border: '2px solid var(--accent-secondary)', borderRadius: '40%', opacity: 0.5 }}
    />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ShieldCheck size={size * 0.6} color="white" />
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = "var(--accent-primary)" }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}
  >
    <div style={{ padding: '10px', background: `${color}15`, border: `1px solid ${color}20`, borderRadius: '12px', color }}>
      <Icon size={20} />
    </div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
  </motion.div>
);

const SectionLegend = ({ items }) => (
  <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
    {items.map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{item.label}</span>
      </div>
    ))}
  </div>
);

const HumanBadge = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', color: '#10b981', fontSize: '0.65rem', fontWeight: 900, verticalAlign: 'middle', marginLeft: '10px' }}>
    <CheckCircle2 size={12} /> HUMAN
  </div>
);

// ── Main Application ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.5 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 12, stiffness: 100 } }
};

export default function App() {
  const [text, setText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [winstonKey, setWinstonKey] = useState(localStorage.getItem('winston_key') || '');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_key') || '');
  const fileInputRef = useRef(null);

  useEffect(() => { localStorage.setItem('winston_key', winstonKey); }, [winstonKey]);
  useEffect(() => { localStorage.setItem('groq_key', groqKey); }, [groqKey]);

  const WORD_LIMIT = 5000;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleScan = async () => {
    if (!text.trim() || isScanning) return;
    setIsScanning(true);
    setError(null);
    setProgress(10);
    setResults(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/scan`, {
        text,
        winston_key: winstonKey,
        groq_key: groqKey
      });
      setScanId(data.scan_id);
    } catch (err) {
      setError(err.response?.data?.error || 'System engine offline. Verification stalled.');
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isScanning && scanId) {
      interval = setInterval(async () => {
        try {
          const { data } = await axios.get(`${API_BASE}/api/status/${scanId}`);
          setProgress(data.progress || 0);
          if (data.status === 'complete') {
            setResults(data);
            setIsScanning(false);
            clearInterval(interval);
          } else if (data.status === 'error') {
            setResults(data); // Still set results so we can show the specific error details
            setIsScanning(false);
            clearInterval(interval);
          }
        } catch (err) { console.error(err); }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${API_BASE}/api/extract-text`, formData);
      setText(data.text);
      setIsUploadMode(false);
    } catch (err) { setError('File extraction failed.'); }
    setIsExtracting(false);
  };

  const handleFileClick = () => !isExtracting && fileInputRef.current?.click();

  return (
    <div className="App">
      <div className="bg-grid"></div>
      <div className="hologram-overlay"></div>
      <div className="bg-orbs">
        <div className="orb orb-1" style={{ background: 'var(--accent-primary)' }}></div>
        <div className="orb orb-2" style={{ background: 'var(--accent-secondary)' }}></div>
      </div>

      <nav className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100px' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Logo size={42} />
            <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-1.5px', background: 'white', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PlagiScan</span>
          </motion.div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }} className="hide-on-mobile">
              <div style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '100px', fontSize: '0.6rem', fontWeight: 900, color: '#ef4444' }}>PLAGIARISM INDEX</div>
              <div style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '100px', fontSize: '0.6rem', fontWeight: 900, color: '#10b981' }}>AUTHENTICITY</div>
            </div>
            <button onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>
              <Cpu size={16} color={winstonKey ? "var(--accent-secondary)" : "var(--accent-primary)"} />
              {winstonKey ? "CUSTOM ENGINE ACTIVE" : "DEFAULT ENGINE"}
            </button>
          </div>
        </div>
      </nav>

      <main className="container" style={{ minHeight: '80vh', paddingBottom: '100px', paddingTop: '40px' }}>
        <AnimatePresence mode="wait">
          {!isScanning && !results && (
            <motion.div key="hero" variants={containerVariants} initial="hidden" animate="visible" exit="exit" style={{ paddingTop: '5vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 0.8fr', gap: '80px', alignItems: 'center' }}>
                <div>
                  <motion.div variants={itemVariants} style={{ display: 'inline-flex', padding: '8px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '32px', gap: '10px', alignItems: 'center', letterSpacing: '1px' }}>
                    <ShieldCheck size={16} color="var(--accent-primary)" /> NEURAL INTEGRITY SYSTEM V2.4
                  </motion.div>
                  <motion.h1 variants={itemVariants} style={{ fontSize: '6rem', fontWeight: 950, lineHeight: 0.85, letterSpacing: '-5px', marginBottom: '32px' }}>
                    Verify Your <br /><span style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Creative DNA.</span>
                  </motion.h1>
                  <motion.p variants={itemVariants} style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '56px', maxWidth: '650px', fontWeight: 400 }}>
                    Professional-grade plagiarism and AI detection engine. Scanned against 400B+ neural clusters and global repositories.
                  </motion.p>

                  <motion.div variants={itemVariants} style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 950 }}>99.9%</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>ENGINE ACCURACY</span>
                    </div>
                    <div style={{ width: '1px', height: '50px', background: 'var(--border-color)', marginTop: '10px' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 950 }}>~1.2s</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>LATENCY</span>
                    </div>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="glass-card" style={{ padding: '0', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(5, 7, 10, 0.4)' }}>
                  <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <button onClick={() => setIsUploadMode(false)} style={{ color: isUploadMode ? 'var(--text-secondary)' : 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>TERMINAL</button>
                      <button onClick={() => setIsUploadMode(true)} style={{ color: !isUploadMode ? 'var(--text-secondary)' : 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>UPLOADS</button>
                    </div>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                  </div>

                  <div style={{ padding: '40px' }}>
                    {isUploadMode ? (
                      <div onClick={handleFileClick} style={{ width: '100%', height: '320px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isExtracting ? 'wait' : 'pointer', background: 'rgba(255,255,255,0.01)', transition: 'all 0.3s' }}>
                        {isExtracting ? <Loader2 size={48} className="animate-spin" color="var(--accent-primary)" /> : <FileUp size={48} color="var(--accent-primary)" />}
                        <span style={{ marginTop: '24px', fontWeight: 900, fontSize: '1.1rem' }}>{isExtracting ? 'SEQUENCING...' : 'DROP FILE HERE'}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '8px' }}>PDF · DOCX · RAW TEXT</span>
                      </div>
                    ) : (
                      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter query content for deep integrity verification..." style={{ width: '100%', height: '320px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', outline: 'none', resize: 'none', lineHeight: 1.6, fontWeight: 500 }} />
                    )}
                  </div>

                  <div style={{ padding: '32px 40px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>PAYLOAD STATUS</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>{wordCount} WORDS</span>
                    </div>
                    <button
                      onClick={handleScan}
                      disabled={wordCount < 10 || isScanning}
                      style={{
                        padding: '16px 40px',
                        background: (wordCount < 10 || isScanning) ? 'rgba(255,255,255,0.03)' : 'white',
                        borderRadius: '16px',
                        fontWeight: 950,
                        color: (wordCount < 10 || isScanning) ? 'rgba(255,255,255,0.1)' : 'black',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '1rem',
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {isScanning ? <Loader2 className="animate-spin" size={20} /> : 'EXECUTE SCAN'} <ChevronRight size={20} strokeWidth={3} />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".txt,.pdf,.docx" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {isScanning && (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', paddingTop: '15vh' }}>
              <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 40px' }}>
                <div className="scan-line"></div>
                <div className="shimmer" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Logo size={140} />
                </div>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: '16px', letterSpacing: '-1px' }}>Deep Integrity Analysis</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '56px', fontSize: '1.1rem' }}>Sequencing neural patterns and cross-referencing global databases...</p>
              <div style={{ maxWidth: '450px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 900, marginBottom: '12px', letterSpacing: '1px' }}>
                  <span className="grad-text">ENGINE PROGRESS</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden', padding: '1px' }}>
                  <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', borderRadius: '100px' }} />
                </div>
              </div>
            </motion.div>
          )}

          {results && !isScanning && (
            <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
                <button onClick={() => setResults(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.9rem' }}>
                  <ArrowLeft size={18} /> NEW DISCOVERY
                </button>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button onClick={() => window.print()} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                    <Printer size={16} /> EXPORT DOCUMENT
                  </button>
                  <button style={{ padding: '12px 24px', background: 'white', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 900, color: 'black', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Share2 size={16} /> SHARE REPORT
                  </button>
                </div>
              </div>

              {results.error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '24px 32px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '24px',
                    marginBottom: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}
                >
                  <ShieldAlert size={32} color="#ef4444" />
                  <div>
                    <h4 style={{ fontWeight: 950, fontSize: '1rem', color: '#ef4444', marginBottom: '4px' }}>CORE ENGINE INTERRUPTED</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{results.error}</p>
                  </div>
                </motion.div>
              )}

              {/* High-Level Verification Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '80px' }}>
                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '48px', display: 'flex', alignItems: 'center', gap: '40px' }}>
                  <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
                      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                      <motion.circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="10"
                        strokeDasharray="339.12"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 339.12 }}
                        animate={{ strokeDashoffset: 339.12 - (339.12 * (results.plagiarism?.score || 0) / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 950 }}>{Math.round(results.plagiarism?.score || 0)}%</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <ShieldAlert size={20} color="#ef4444" />
                      <span style={{ fontSize: '1.2rem', fontWeight: 950 }}>PLAGIARISM INDEX</span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                      {results.plagiarism?.error ? 'Engine failed to verify plagiarism due to API/Credit limits.' : ((results.plagiarism?.score || 0) > 20 ? 'Significant external matches detected.' : 'Content verified against global databases.')}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>ENGINE FLAGGED</span>
                      <span style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, color: 'white' }}>{Math.round(results.plagiarism?.score || 0)}% Match</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '48px', display: 'flex', alignItems: 'center', gap: '40px' }}>
                  <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
                      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                      <motion.circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="10"
                        strokeDasharray="339.12"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 339.12 }}
                        animate={{ strokeDashoffset: 339.12 - (339.12 * (results.ai_detection?.score || 0) / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 950 }}>{Math.round(results.ai_detection?.score || 0)}%</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      <span style={{ fontSize: '1.2rem', fontWeight: 950 }}>AI PROBABILITY</span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                      {(results.ai_detection?.score || 0) > 80 ? 'Verified as authentic original humanity.' : 'Neural patterns indicate machine generation.'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>AUTHENTIC</span>
                      <span style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, color: 'white' }}>{Math.round(results.ai_detection?.score || 0)}% Human</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Plagiarism Section */}
              <SectionHeader icon={Layers} title="Plagiarism — Source Matches" color="#ef4444" />
              <SectionLegend items={[
                { label: 'Original', color: '#10b981' },
                { label: 'Low Match', color: '#f59e0b' },
                { label: 'High Match', color: '#ef4444' }
              ]} />

              {/* Global Sources Summary */}
              {results.plagiarism?.sources?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: '40px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <Globe size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 950, color: 'white' }}>GLOBAL SOURCE REPOSITORIES</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {results.plagiarism.sources.map((src, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{src.title || 'Unknown Source'}</span>
                        <a href={src.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none', wordBreak: 'break-all' }}>{src.url}</a>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '80px' }}>
                {(results.plagiarism?.sentences || []).map((s, i) => {
                  const score = s.score || 0;
                  const color = score > 60 ? '#ef4444' : score > 10 ? '#f59e0b' : '#10b981';
                  const bg = score > 10 ? `rgba(${score > 60 ? '239, 68, 68' : '245, 158, 11'}, 0.05)` : 'rgba(255,255,255,0.01)';

                  // Only show Human badge if BOTH the sentence match and the OVERALL report score are low
                  const isDeemedHuman = score === 0 && (results.plagiarism?.score || 0) < 15;

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      key={i}
                      className="glass-card"
                      style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '30px' }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 950, color }}>{score}%</div>
                          <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5, letterSpacing: '1px' }}>MATCH</div>
                        </div>
                        <div>
                          <div style={{ padding: '20px', background: bg, borderLeft: `3px solid ${color}`, borderRadius: '8px', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: s.source_url ? '16px' : '0' }}>
                            {s.text}
                            {isDeemedHuman && <HumanBadge />}
                          </div>

                          {s.source_url && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' }}>
                              <Globe size={14} color="var(--text-muted)" />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {s.source_title && <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', marginBottom: '2px' }}>{s.source_title.toUpperCase()}</span>}
                                <a href={s.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}>{s.source_url}</a>
                              </div>
                            </div>
                          )}

                          {s.rewrite_suggestion && (
                            <div style={{ padding: '12px 18px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, borderLeft: '3px solid #f59e0b', color: '#f59e0b', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <Lightbulb size={16} />
                              <span>{s.rewrite_suggestion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* AI Content Section */}
              <SectionHeader icon={Zap} title="AI Content — Sentence Analysis" color="var(--accent-secondary)" />
              <SectionLegend items={[
                { label: 'Human Written', color: '#10b981' },
                { label: 'Likely AI', color: '#f59e0b' },
                { label: 'AI Generated', color: '#ef4444' }
              ]} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '100px' }}>
                {(results.ai_detection?.sentences || []).map((s, i) => {
                  const aiScore = s.score || 0;
                  const color = aiScore > 60 ? '#ef4444' : aiScore > 20 ? '#f59e0b' : '#10b981';
                  const bg = aiScore > 20 ? `rgba(${aiScore > 60 ? '239, 68, 68' : '245, 158, 11'}, 0.05)` : 'rgba(16, 185, 129, 0.02)';

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      key={i}
                      className="glass-card"
                      style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '30px' }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 950, color }}>{Math.round(aiScore)}%</div>
                          <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5, letterSpacing: '1px' }}>AI</div>
                        </div>
                        <div>
                          <div style={{ padding: '20px', background: bg, borderLeft: `3px solid ${color}`, borderRadius: '8px', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: s.rewrite_suggestion ? '16px' : '0' }}>
                            {s.text}
                            {aiScore < 15 && <HumanBadge />}
                          </div>

                          {s.rewrite_suggestion && (
                            <div style={{ padding: '12px 18px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, borderLeft: '3px solid var(--accent-primary)', color: 'var(--accent-primary)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <Lightbulb size={16} />
                              <span>{s.rewrite_suggestion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Actionable Insights */}
              <SectionHeader icon={Lightbulb} title="Actionable Insights" color="var(--accent-secondary)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginBottom: '100px' }}>
                {results.actionable_tips?.map((tip, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    key={i}
                    className="glass-card"
                    style={{ padding: '32px' }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '20px' }}>{tip.icon}</div>
                    <h4 style={{ fontWeight: 950, fontSize: '1rem', marginBottom: '12px', letterSpacing: '1px' }}>{tip.title.toUpperCase()}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>{tip.body}</p>
                    <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, borderLeft: '3px solid var(--accent-secondary)' }}>
                      {tip.example}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card" style={{ maxWidth: '550px', width: '100%', padding: '48px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <Cpu size={28} className="grad-text" />
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-1px' }}>System Matrix</h2>
                </div>
                <button onClick={() => setShowSettings(false)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)', marginBottom: '12px', display: 'block', letterSpacing: '1px' }}>INTEGRITY ENGINE LINK</label>
                  <input type="password" value={winstonKey} onChange={(e) => setWinstonKey(e.target.value)} placeholder="NEURAL_AUTH_KEY_REQUIRED" style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', color: 'white', fontSize: '1rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: '12px', display: 'block', letterSpacing: '1px' }}>REWRITE MODULE LINK</label>
                  <input type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="ENCRYPTION_OPTIONAL" style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', color: 'white', fontSize: '1rem' }} />
                </div>
              </div>

              <div style={{ marginTop: '40px', padding: '20px', background: winstonKey ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '14px', border: winstonKey ? '1px solid rgba(16, 185, 129, 0.1)' : '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.85rem', color: winstonKey ? '#10b981' : '#ef4444', fontWeight: 800, display: 'flex', gap: '10px' }}>
                <ShieldCheck size={18} /> {winstonKey ? "DYNAMIC API KEY ACTIVE" : "USING HARDCODED FALLBACK KEY"}
              </div>

              <button onClick={() => setShowSettings(false)} style={{ width: '100%', marginTop: '32px', padding: '20px', background: 'white', color: 'black', borderRadius: '16px', fontWeight: 950, fontSize: '1rem' }}>SAVE & INITIALIZE ENGINE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="container" style={{ padding: '100px 0', borderTop: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
          <Logo size={28} /> <span style={{ fontWeight: 950, fontSize: '1.2rem' }}>PlagiScan Content Integrity Systems</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>POWERED BY SECURE NEURAL CLUSTER · © 2026 CORPORATE INTEGRITY</div>
      </footer>
    </div>
  );
}
