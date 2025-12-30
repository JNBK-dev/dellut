import { useState, useEffect, useRef } from 'react';

export default function StereoApp() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('READY...');
  const [logs, setLogs] = useState(['SYSTEM INITIALIZED', 'AWAITING INPUT...']);
  const [eqBars, setEqBars] = useState(Array(16).fill(0));
  const logEndRef = useRef(null);

  // Animate EQ bars
  useEffect(() => {
    const interval = setInterval(() => {
      setEqBars(prev => prev.map((_, i) => {
        const base = Math.sin(Date.now() / 300 + i * 0.5) * 0.3 + 0.5;
        const noise = Math.random() * 0.3;
        return Math.max(0.1, Math.min(1, base + noise));
      }));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, `[${timestamp}] > ${input}`]);
    setOutput(input.toUpperCase());
    setLogs(prev => [...prev, `[${timestamp}] OUTPUT UPDATED`]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const EQBar = ({ level }) => {
    const segments = 12;
    const litSegments = Math.floor(level * segments);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px', height: '100%' }}>
        {Array(segments).fill(0).map((_, i) => {
          const isLit = i < litSegments;
          const isPeak = i === litSegments - 1 && isLit;
          return (
            <div
              key={i}
              style={{
                width: '100%',
                flex: 1,
                borderRadius: '1px',
                background: isLit 
                  ? i >= 10 ? '#ff3366' 
                  : i >= 8 ? '#ffaa00' 
                  : '#00d4ff'
                  : 'rgba(0, 60, 80, 0.3)',
                boxShadow: isLit 
                  ? isPeak 
                    ? `0 0 8px ${i >= 10 ? '#ff3366' : i >= 8 ? '#ffaa00' : '#00d4ff'}, inset 0 0 4px rgba(255,255,255,0.3)`
                    : `0 0 4px ${i >= 10 ? '#ff336680' : i >= 8 ? '#ffaa0080' : '#00d4ff80'}, inset 0 0 2px rgba(255,255,255,0.2)`
                  : 'inset 0 0 2px rgba(0,0,0,0.5)',
                transition: 'background 0.05s, box-shadow 0.05s',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Share Tech Mono", "Courier New", monospace',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700&display=swap');
        
        * { box-sizing: border-box; }
        
        .stereo-unit {
          background: linear-gradient(180deg, #d4d4d4 0%, #a8a8a8 20%, #c0c0c0 50%, #909090 100%);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.5),
            inset 0 2px 0 rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(0,0,0,0.2);
          position: relative;
        }
        
        .stereo-unit::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.03) 2px,
            rgba(255,255,255,0.03) 4px
          );
          pointer-events: none;
        }
        
        .display-panel {
          background: linear-gradient(180deg, #0a0a12 0%, #0d1520 100%);
          border-radius: 6px;
          padding: 16px;
          box-shadow: 
            inset 0 4px 12px rgba(0,0,0,0.8),
            inset 0 0 0 1px rgba(0,0,0,0.5),
            0 1px 0 rgba(255,255,255,0.1);
        }
        
        .lcd-text {
          font-family: 'Orbitron', 'Share Tech Mono', monospace;
          color: #00d4ff;
          text-shadow: 0 0 10px #00d4ff80, 0 0 20px #00d4ff40;
          letter-spacing: 2px;
        }
        
        .log-text {
          color: #00d4ff;
          text-shadow: 0 0 6px #00d4ff60;
          font-size: 11px;
          line-height: 1.6;
        }
        
        .input-field {
          background: #0a0a12;
          border: none;
          border-radius: 4px;
          padding: 12px 16px;
          color: #00d4ff;
          font-family: 'Share Tech Mono', monospace;
          font-size: 14px;
          width: 100%;
          box-shadow: 
            inset 0 2px 8px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(0,212,255,0.2);
          outline: none;
          text-shadow: 0 0 8px #00d4ff60;
        }
        
        .input-field::placeholder {
          color: #00d4ff40;
        }
        
        .input-field:focus {
          box-shadow: 
            inset 0 2px 8px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(0,212,255,0.5),
            0 0 12px rgba(0,212,255,0.2);
        }
        
        .submit-btn {
          background: linear-gradient(180deg, #404040 0%, #2a2a2a 100%);
          border: none;
          border-radius: 4px;
          padding: 12px 24px;
          color: #00d4ff;
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          cursor: pointer;
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          transition: all 0.1s;
          text-shadow: 0 0 8px #00d4ff80;
        }
        
        .submit-btn:hover {
          background: linear-gradient(180deg, #4a4a4a 0%, #333333 100%);
          box-shadow: 
            0 4px 12px rgba(0,212,255,0.2),
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(0,0,0,0.3);
        }
        
        .submit-btn:active {
          transform: translateY(1px);
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.05),
            inset 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .brand-label {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          color: #666;
          letter-spacing: 4px;
          text-transform: uppercase;
        }
        
        .led-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88, inset 0 -2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
      
      <div className="stereo-unit" style={{ width: '100%', maxWidth: '900px' }}>
        {/* Top branding bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          padding: '0 8px'
        }}>
          <span className="brand-label">DIGITAL AUDIO</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="led-indicator" />
            <span className="brand-label">POWER</span>
          </div>
        </div>
        
        {/* Main display area */}
        <div className="display-panel">
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Left section - EQ + Output */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* EQ Visualizer */}
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px',
                padding: '12px',
                height: '120px',
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  height: '100%',
                  justifyContent: 'center'
                }}>
                  {eqBars.map((level, i) => (
                    <div key={i} style={{ width: '20px', height: '100%' }}>
                      <EQBar level={level} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Output Display */}
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '4px',
                padding: '16px 20px',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <div className="lcd-text" style={{ 
                  fontSize: '18px',
                  fontWeight: '700',
                  wordBreak: 'break-word',
                  width: '100%'
                }}>
                  {output}
                </div>
              </div>
            </div>
            
            {/* Right section - Log display */}
            <div style={{
              width: '240px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ 
                fontSize: '10px', 
                color: '#00d4ff60', 
                marginBottom: '8px',
                fontFamily: 'Orbitron, monospace',
                letterSpacing: '2px'
              }}>
                SYSTEM LOG
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '160px',
              }}>
                {logs.map((log, i) => (
                  <div key={i} className="log-text" style={{ opacity: 0.6 + (i / logs.length) * 0.4 }}>
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Input section */}
        <div style={{ 
          marginTop: '16px',
          display: 'flex',
          gap: '12px',
        }}>
          <input
            type="text"
            className="input-field"
            placeholder="ENTER COMMAND..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="submit-btn" onClick={handleSubmit}>
            SEND
          </button>
        </div>
        
        {/* Bottom branding */}
        <div style={{ 
          marginTop: '16px', 
          textAlign: 'center',
          padding: '0 8px'
        }}>
          <span className="brand-label" style={{ color: '#555' }}>
            MODEL CL-2024 SPECTRUM DISPLAY
          </span>
        </div>
      </div>
    </div>
  );
}
