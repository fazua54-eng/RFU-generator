'use client'
import { useState, useCallback, useRef } from 'react'
import Report from './Report'

const GOLD = '#C8A951'
const DARK = '#1a1a1a'
const SUCCESS = '#4a9e6a'
const DANGER = '#e85555'

export default function App() {
  const [screen, setScreen] = useState('upload')
  const [mode, setMode] = useState('mono')
  const [multiFiles, setMultiFiles] = useState([])
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const inputRef = useRef(null)
  const STEPS = ['Lecture du fichier…', 'Extraction des données…', 'Calcul des scores…', 'Génération…']

  const processFiles = useCallback(async (files) => {
    setScreen('processing'); setError(null); setStep(0)
    try {
      const XLSXmod = await import('xlsx')
      const XLSX = XLSXmod.default || XLSXmod
      const { extractFromWorkbook } = await import('./extract')
      const results = []
      for (const file of files) {
        const ab = await file.arrayBuffer(); setStep(1)
        const wb = XLSX.read(ab); setStep(2)
        const data = extractFromWorkbook(wb, XLSX); data.fileName = file.name
        results.push(data)
      }
      setStep(3); await new Promise(r => setTimeout(r, 200))
      setReportData(results.length === 1 ? results[0] : results)
      setScreen('report')
    } catch (e) { setError(e.message); setScreen('upload') }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    if (!files.length) return
    if (mode === 'mono') processFiles([files[0]])
    else setMultiFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...files.filter(f => !names.has(f.name))] })
  }, [mode, processFiles])

  if (screen === 'report' && reportData)
    return <Report data={reportData} onBack={() => { setScreen('upload'); setReportData(null); setMultiFiles([]) }} />

  if (screen === 'processing') return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 44, height: 44, border: `4px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#fff', fontSize: 15 }}>Analyse en cours…</div>
      <div style={{ color: '#888', fontSize: 12 }}>{STEPS[step]}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 32, height: 2, background: GOLD }} />
        <div style={{ color: GOLD, fontSize: 22, fontWeight: 800, letterSpacing: '0.15em' }}>REMEDEX</div>
        <div style={{ width: 32, height: 2, background: GOLD }} />
      </div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 32, letterSpacing: '0.05em' }}>Générateur de rapport · Registre KOA</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[['mono', '📄', 'Monocentrique', '1 médecin, 1 export'], ['multi', '📊', 'Multicentrique', 'Plusieurs centres agrégés']].map(([m, icon, label, sub]) => (
          <button key={m} onClick={() => setMode(m)} style={{ width: 170, padding: '14px 16px', background: mode === m ? 'rgba(200,169,81,0.12)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${mode === m ? GOLD : 'rgba(200,169,81,0.25)'}`, borderRadius: 10, cursor: 'pointer', color: mode === m ? '#fff' : '#888', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{sub}</div>
          </button>
        ))}
      </div>

      <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => inputRef.current?.click()}
        style={{ width: '100%', maxWidth: 480, border: `2px dashed ${GOLD}`, borderRadius: 12, padding: 32, textAlign: 'center', background: 'rgba(200,169,81,0.04)', cursor: 'pointer' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>Déposez votre export Excel ici</div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>Onglets Quest… et Rapport… requis · .xlsx</div>
        <div style={{ background: GOLD, color: DARK, padding: '8px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13, display: 'inline-block' }}>Choisir un fichier</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple={mode === 'multi'} style={{ display: 'none' }}
          onChange={e => {
            const files = Array.from(e.target.files)
            if (mode === 'mono') processFiles([files[0]])
            else setMultiFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...files.filter(f => !names.has(f.name))] })
            e.target.value = ''
          }} />
      </div>

      {mode === 'multi' && multiFiles.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 14 }}>
          {multiFiles.map(f => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(200,169,81,0.07)', border: '1px solid rgba(200,169,81,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
              <span>📄</span>
              <span style={{ flex: 1, color: '#ddd', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: SUCCESS, fontSize: 12 }}>✓</span>
              <button onClick={() => setMultiFiles(prev => prev.filter(x => x.name !== f.name))} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          ))}
          {multiFiles.length >= 2 && (
            <button onClick={() => processFiles(multiFiles)} style={{ width: '100%', marginTop: 8, padding: 12, background: GOLD, color: DARK, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Générer le rapport ({multiFiles.length} centres) →
            </button>
          )}
          {multiFiles.length === 1 && <div style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 8 }}>Ajoutez au moins un 2ème fichier</div>}
        </div>
      )}
      {error && <div style={{ marginTop: 16, color: DANGER, fontSize: 13, maxWidth: 480, textAlign: 'center' }}>⚠ {error}</div>}
    </div>
  )
}
