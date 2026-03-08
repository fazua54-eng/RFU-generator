'use client'
import dynamic from 'next/dynamic'
import { mean, std, fmt1, fmtDate } from './extract'

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

const GOLD = '#C8A951', DARK = '#1a1a1a', SUCCESS = '#4a9e6a', DANGER = '#e85555'

const SectionCard = ({ title, children }) => (
  <div style={{ background: '#fff', border: '1px solid #e0d9cc', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ background: DARK, color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px' }}>{title}</div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
)

const TrancheBars = ({ items, total }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {items.filter(([, n]) => n > 0).map(([label, n]) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 110, color: '#666', flexShrink: 0, fontSize: 11 }}>{label}</span>
        <div style={{ flex: 1, background: '#e8e4dc', borderRadius: 3, height: 10 }}>
          <div style={{ width: `${Math.round(n / total * 100)}%`, background: GOLD, height: 10, borderRadius: 3, minWidth: 4 }} />
        </div>
        <span style={{ width: 80, color: '#666', textAlign: 'right', flexShrink: 0, fontSize: 11 }}>{n} ({Math.round(n / total * 100)}%)</span>
      </div>
    ))}
  </div>
)

const CircleStat = ({ pct, label, size = 80, fontSize = 18 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{ width: size, height: size, borderRadius: '50%', border: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize, fontWeight: 700, color: DARK }}>{Math.round(pct)}%</span>
    </div>
    <span style={{ fontSize: 10, color: '#666', textAlign: 'center', maxWidth: size + 10 }}>{label}</span>
  </div>
)

const ScoreEvol = ({ label, data }) => {
  const pts = data.filter(d => d.val !== null)
  if (pts.length < 1) return null
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 }}>{label}</div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={pts} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="tp" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={v => fmt1(v)} />
          <Line type="monotone" dataKey="val" stroke={DARK} strokeWidth={2.5} dot={{ fill: GOLD, r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const StackedEvol = ({ label, data, c1, c2, c3, l1, l2, l3 }) => {
  const valid = data.filter(d => d.total > 0)
  if (!valid.length) return null
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 }}>{label}</div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={valid} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} domain={[0, 100]} />
          <Tooltip formatter={(v, n) => [v + '%', n]} />
          <Bar dataKey="p1" stackId="a" fill={c1} name={l1} />
          <Bar dataKey="p2" stackId="a" fill={c2} name={l2} />
          <Bar dataKey="p3" stackId="a" fill={c3} name={l3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Report({ data: d, onBack }) {
  const ratioPct = n => (d.nH + d.nF) > 0 ? Math.round(n / (d.nH + d.nF) * 100) : 0
  const pAucun = d.tolTotal ? Math.round(d.tolAucun / d.tolTotal * 100) : 0
  const p1t = d.tolTotal ? Math.round(d.tol1 / d.tolTotal * 100) : 0
  const p2t = d.tolTotal ? Math.round(d.tol2 / d.tolTotal * 100) : 0
  const scoreData = [
    { score: 'WOMAC', ai: d.womacAI, m3: d.womacM3, m6: d.womacM6, res: d.womacRes },
    { score: 'EVA douleur', ai: d.evaAI, m3: d.evaM3, m6: d.evaM6, res: d.evaRes },
    { score: 'Qualité de vie', ai: d.qdvAI, m3: d.qdvM3, m6: d.qdvM6, res: d.qdvRes },
  ]
  const mkEvol = (ai, m3, m6) => [
    { tp: 'Avant inj.', val: ai.length ? mean(ai) : null },
    { tp: 'M3', val: m3.length ? mean(m3) : null },
    { tp: 'M6', val: m6.length ? mean(m6) : null },
  ]
  const mkAct = (src, name) => src.total ? { name, total: src.total, p1: Math.round(src.portant / src.total * 100), p2: Math.round(src.nonPortant / src.total * 100), p3: Math.round(src.aucune / src.total * 100) } : null
  const mkAnt = (src, name) => src.total ? { name, total: src.total, p1: Math.round(src.jamais / src.total * 100), p2: Math.round(src.occ / src.total * 100), p3: Math.round(src.regulier / src.total * 100) } : null
  const actData = [mkAct(d.actAI, 'Avant inj.'), mkAct(d.actM3, 'M3'), mkAct(d.actM6, 'M6')].filter(Boolean)
  const antData = [mkAnt(d.antAI, 'Avant inj.'), mkAnt(d.antM3, 'M3'), mkAnt(d.antM6, 'M6')].filter(Boolean)
  const corrItems = [
    ...d.contCorr.map(c => ({ icon: c.r > 0 ? '↑' : '↓', pos: c.r > 0, label: c.label, detail: `corrélation ${Math.abs(c.r) > 0.6 ? 'forte' : Math.abs(c.r) > 0.3 ? 'modérée' : 'faible'} (r = ${c.r > 0 ? '+' : ''}${c.r.toFixed(2)}, n = ${c.n})`, sufficient: c.sufficient })),
    ...d.correlations.map(c => ({ icon: c.diff > 0 ? '↑' : '↓', pos: c.diff > 0, label: c.predictor, detail: `${c.diff > 0 ? 'meilleur' : 'moins bon'} delta ${c.outcome} (${c.diff > 0 ? '+' : ''}${c.diff.toFixed(1)} pts, n=${c.n})`, sufficient: c.sufficient }))
  ]

  return (
    <div style={{ background: '#f5f1e8', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: DARK, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>REMEDEX</div>
          <div style={{ color: '#aaa', fontSize: 11 }}>Dr. {d.praticien} · {d.centre} · {fmtDate(d.dateMin)} → {fmtDate(d.dateMax)}</div>
        </div>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${GOLD}`, color: GOLD, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>← Nouveau</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>

        {/* Stats clés */}
        <SectionCard title="Statistiques clés">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              {[['Patients traités', d.nPatients], ['Injections', d.nInjections], ['Ratio H/F', `${ratioPct(d.nH)}% / ${ratioPct(d.nF)}%`]].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                {[[d.inj1, '1 inj.'], [d.inj2, '2 inj.'], [d.inj3p, '3+']].filter(([n]) => n > 0).map(([n, l]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{n}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {d.ageIsTranche && d.ageTranches
                ? <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>Âge (tranches)</div><TrancheBars items={d.ageTranches} total={d.nPatients} /></div>
                : <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>Âge moyen</div><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt1(mean(d.ages))} ± {fmt1(std(d.ages))}</div></div>}
              {d.imcIsTranche && d.imcTranches
                ? <div><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>IMC (tranches)</div><TrancheBars items={d.imcTranches} total={d.nPatients} /></div>
                : <div><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>IMC</div><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt1(mean(d.imcs))} ± {fmt1(std(d.imcs))}</div></div>}
            </div>
          </div>
        </SectionCard>

        {/* Focus KOA */}
        <SectionCard title="Focus arthrose du genou">
          <div style={{ background: DARK, color: GOLD, fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 6, marginBottom: 16, display: 'inline-block' }}>
            Patients avec score AI renseigné — n={d.nM0}
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            {d.tolTotal > 0 && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Tolérance (n={d.tolTotal})</div>
                <div style={{ height: 32, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
                  {p2t > 3 && <div style={{ width: `${p2t}%`, background: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{p2t}%</div>}
                  {p1t > 3 && <div style={{ width: `${p1t}%`, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK, fontSize: 11, fontWeight: 700 }}>{p1t}%</div>}
                  <div style={{ width: `${pAucun}%`, background: '#e8e0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK, fontSize: 11, fontWeight: 700 }}>{pAucun}%</div>
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>■ 2 sympt. &nbsp;■ 1 sympt. &nbsp;□ Aucune gêne</div>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Suivi longitudinal</div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[['M0', d.nM0], ['M3', d.nM3], ['M6', d.nM6]].map(([tp, n]) => (
                  <div key={tp} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{n}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{tp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cercles résultats */}
          <div style={{ borderTop: '1px solid #e0d9cc', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {scoreData.map(s => (
                <div key={s.score} style={{ textAlign: 'center', minWidth: 150 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>{s.score}</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <CircleStat pct={s.res.pctImproved} label="améliorés" size={72} fontSize={16} />
                    <CircleStat pct={Math.abs(s.res.meanImprov)} label="amélio. moy." size={60} fontSize={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Graphiques évolution */}
          <div style={{ borderTop: '1px solid #e0d9cc', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {scoreData.map(s => <ScoreEvol key={s.score} label={s.score} data={mkEvol(s.ai, s.m3, s.m6)} />)}
            </div>
          </div>

          {/* Comparaison 1inj vs 2+ */}
          {d.showCompare && (
            <div style={{ borderTop: '1px solid #e0d9cc', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>1 injection vs 2+ injections</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'WOMAC', r1: d.grp1.womac, r2: d.grp2p.womac, ai1: d.grp1.wAI, m61: d.grp1.wM6, ai2: d.grp2p.wAI, m62: d.grp2p.wM6 },
                  { label: 'EVA', r1: d.grp1.eva, r2: d.grp2p.eva, ai1: d.grp1.eAI, m61: d.grp1.eM6, ai2: d.grp2p.eAI, m62: d.grp2p.eM6 },
                ].map(row => (
                  <div key={row.label} style={{ background: '#faf8f2', border: '1px solid #e0d9cc', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>{row.label}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ label: '1 inj.', r: row.r1, ai: row.ai1, m6: row.m61 }, { label: '2+ inj.', r: row.r2, ai: row.ai2, m6: row.m62 }].map((g, gi) => (
                        <div key={gi} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, background: gi === 0 ? '#e8e4dc' : 'rgba(200,169,81,0.15)', color: gi === 0 ? '#555' : '#8a6a00', padding: '2px 6px', borderRadius: 10, display: 'inline-block', marginBottom: 4 }}>{g.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt1(mean(g.ai))} → {fmt1(mean(g.m6))}</div>
                          <div style={{ fontSize: 11, color: SUCCESS, fontWeight: 600 }}>{Math.round(g.r.pctImproved)}%</div>
                          <div style={{ fontSize: 10, color: '#aaa' }}>n={g.r.n}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facteurs prédictifs */}
          {corrItems.length > 0 && (
            <div style={{ borderTop: '1px solid #e0d9cc', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Facteurs associés à l'efficacité</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                Delta = score AI − M6 (positif = amélioration).{corrItems.some(c => !c.sufficient) ? ` ⚠ = moins de ${d.MIN_N_CORR} patients.` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {corrItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px', background: item.sufficient ? '#faf8f2' : '#f5f5f5', borderRadius: 6, borderLeft: `3px solid ${item.pos ? SUCCESS : DANGER}`, opacity: item.sufficient ? 1 : 0.65 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: item.pos ? SUCCESS : DANGER, flexShrink: 0, width: 18, textAlign: 'center' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: '#777' }}>{item.detail}{!item.sufficient ? ' ⚠' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Qualité biologique */}
        <SectionCard title="Qualité biologique">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: DARK }}>
                  {[['Vol. PRP (mL)', d.volPRP], ['Dose plaq. (Md)', d.dosePlaq], ['Pureté (%)', d.purete], ['Facteur conc.', d.facteur], ['Rendement (%)', d.rend], ...(d.volAH.length > 0 ? [['Vol. AH (mL)', d.volAH]] : [])].map(([h]) => (
                    <th key={h} style={{ color: GOLD, padding: '7px 10px', textAlign: 'left', fontSize: 10, letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[d.volPRP, d.dosePlaq, d.purete, d.facteur, d.rend, ...(d.volAH.length > 0 ? [d.volAH] : [])].map((arr, i) => (
                    <td key={i} style={{ padding: '9px 10px', border: '1px solid #e0d9cc', fontSize: 12 }}>{fmt1(mean(arr))} ± {fmt1(std(arr))}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Profil pré-injection */}
        {d.nProfile > 0 && (
          <SectionCard title="Profil pré-injection">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                ['Tabac', Object.entries(d.tabacCounts), Object.values(d.tabacCounts).reduce((a, b) => a + b, 0)],
                ['Comorbidités', [['Aucune', d.nAucuneComor], ['HTA', d.nHTA], ['Diabète', d.nDiabete], ['Rhumatisme inflam.', d.nRhumato], ['Autre', d.nAutreComor]], d.nProfile],
                ['Injections antérieures', [['Oui', d.nInjAntOui], ['Non', d.nProfile - d.nInjAntOui]], d.nProfile],
                ['Antécédents chir.', [['Kiné', d.nKineOui], ['Rupture lig.', d.nRupLigOui], ['Arthroscopie', d.nArthroOui]], d.nProfile],
              ].map(([title, items, total]) => (
                <div key={title}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7, paddingBottom: 4, borderBottom: '1px solid #e0d9cc' }}>{title} (n={total})</div>
                  <TrancheBars items={items} total={total} />
                </div>
              ))}
            </div>
            {d.nInjAntOui > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                {[['PRP', d.nInjPRP], ['Cortisone', d.nInjCortisone], ['AH', d.nInjAH2], ['Mixte', d.nInjAutre]].filter(([, n]) => n > 0).map(([l, n]) => (
                  <span key={l} style={{ fontSize: 11, background: 'rgba(200,169,81,0.12)', color: '#8a6a00', padding: '2px 8px', borderRadius: 10 }}>{l} : {n}</span>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Activité + Antalgiques */}
        {(actData.length > 0 || antData.length > 0) && (
          <SectionCard title="Activité physique & Antalgiques — évolution">
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <StackedEvol label="Type d'activité pratiquée" data={actData} c1={DARK} c2={GOLD} c3="#e0d9cc" l1="Portant" l2="Non portant" l3="Aucune" />
              <StackedEvol label="Antalgiques / AINS" data={antData} c1={SUCCESS} c2={GOLD} c3={DANGER} l1="Jamais" l2="Occasionnel" l3="Régulier" />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 11, color: '#666', flexWrap: 'wrap' }}>
              <div>
                {[['Portant', DARK], ['Non portant', GOLD], ['Aucune', '#e0d9cc']].map(([l, c]) => <span key={l}><span style={{ display: 'inline-block', width: 10, height: 10, background: c, marginRight: 4, marginLeft: 8, borderRadius: 2 }} />{l}</span>)}
              </div>
              <div>
                {[['Jamais', SUCCESS], ['Occasionnel', GOLD], ['Régulier', DANGER]].map(([l, c]) => <span key={l}><span style={{ display: 'inline-block', width: 10, height: 10, background: c, marginRight: 4, marginLeft: 8, borderRadius: 2 }} />{l}</span>)}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Procédure */}
        {d.kitDistrib.length > 0 && (
          <SectionCard title="Données procédure">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {d.kitDistrib.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 7 }}>Kit</div><TrancheBars items={d.kitDistrib} total={d.nInjections} /></div>}
              {d.melangeDistrib.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 7 }}>Mélangé/Séparé</div><TrancheBars items={d.melangeDistrib} total={d.nInjections} /></div>}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 7 }}>Guidage écho.</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{d.guidageN}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{Math.round(d.guidageN / d.nInjections * 100)}% des injections</div>
              </div>
              {d.desinfDistrib.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 7 }}>Désinfectant</div>{d.desinfDistrib.map(([k, n]) => <div key={k} style={{ fontSize: 11, background: '#f0ece2', padding: '3px 8px', borderRadius: 4, marginBottom: 3 }}>{k} ({n})</div>)}</div>}
              {d.aiguilleDistrib.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 7 }}>Aiguille</div>{d.aiguilleDistrib.map(([k, n]) => <div key={k} style={{ fontSize: 11, background: '#f0ece2', padding: '3px 8px', borderRadius: 4, marginBottom: 3 }}>{k} ({n})</div>)}</div>}
            </div>
          </SectionCard>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', padding: '16px 0' }}>
          www.remedex.fr · Marque déposée — Tous droits réservés — Remedex©
        </div>
      </div>
    </div>
  )
}
