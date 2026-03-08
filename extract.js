// ── UTILITAIRES ──
export const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN
export const std = arr => {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.map(x => (x - m) ** 2).reduce((a, b) => a + b, 0) / (arr.length - 1))
}
export const fmt1 = v => (isNaN(v) || v == null) ? '—' : Number(v).toFixed(1)
export const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'
export const extractNum = val => {
  if (val == null) return NaN
  return parseFloat(val.toString().replace(/^[^:]+:\s*/, '').trim())
}
export const stripPrefix = val => val == null ? '' : val.toString().replace(/^[^:]+:\s*/, '').trim()

export function extractFromWorkbook(wb) {
  const XLSX = require('xlsx')
  const findSheet = kws => {
    const name = wb.SheetNames.find(n => kws.every(k => n.toLowerCase().includes(k.toLowerCase())))
    return name ? { sheet: wb.Sheets[name], name } : null
  }
  const rapFound = findSheet(['rapport']) || findSheet(['rap'])
  const questFound = findSheet(['quest'])
  if (!rapFound || !questFound)
    throw new Error(`Onglets non détectés. Trouvés : ${wb.SheetNames.join(', ')}`)

  const rapRaw = XLSX.utils.sheet_to_json(rapFound.sheet, { header: 1 })
  const questRaw = XLSX.utils.sheet_to_json(questFound.sheet, { header: 1 })
  const rapHeaders = rapRaw[1] || []
  const rapData = rapRaw.slice(2).filter(r => r[0] && r[0] !== 'ecart type' && r[0] !== 'moyenne')
  const questHeaders = questRaw[1] || []
  const questData = questRaw.slice(2).filter(r => r[0] && r[0] !== 'Id')

  const rapCol = name => rapHeaders.findIndex(h => h && h.toString().includes(name))
  const parseDate = d => {
    if (!d) return null
    if (typeof d === 'number') return new Date((d - 25569) * 86400000)
    const p = d.toString().split('/')
    if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`)
    return new Date(d)
  }

  const praticien = rapData.find(r => r[rapCol('Praticien')])?.[rapCol('Praticien')] || '—'
  const centre = rapData.find(r => r[rapCol('Centre')])?.[rapCol('Centre')] || '—'
  const dateIdx = rapCol('Date intervention')
  const dates = rapData.map(r => r[dateIdx]).map(parseDate).filter(d => d && !isNaN(d))
  const dateMin = dates.length ? new Date(Math.min(...dates)) : null
  const dateMax = dates.length ? new Date(Math.max(...dates)) : null

  const idIdx = rapHeaders.indexOf('Id')
  const nPatients = new Set(rapData.map(r => r[idIdx]).filter(Boolean)).size
  const nInjections = rapData.length
  const injPerPat = {}
  rapData.forEach(r => { const id = r[idIdx]; if (id) injPerPat[id] = (injPerPat[id] || 0) + 1 })
  const inj1 = Object.values(injPerPat).filter(v => v === 1).length
  const inj2 = Object.values(injPerPat).filter(v => v === 2).length
  const inj3p = Object.values(injPerPat).filter(v => v >= 3).length
  const dciIdx = rapHeaders.findIndex(h => h && h.toString().includes('DCI') && h.toString().includes('Autre produit 1'))
  const nAH = rapData.filter(r => {
    const v = r[dciIdx]
    return v && (v.toString().toLowerCase().includes('hyaluronate') || v.toString().toLowerCase().includes('hyaluronique'))
  }).length

  // Sexe, âge, IMC
  const qIdIdx = questHeaders.indexOf('Id')
  const qSexeIdx = questHeaders.indexOf('Sexe')
  const qAgeIdx = questHeaders.indexOf('Date De Naissance (âge)')
  const qImcIdx = questHeaders.indexOf('IMC')
  const seenIds = new Set()
  let nH = 0, nF = 0, ages = [], imcs = [], ageRawVals = [], imcRawVals = []
  questData.forEach(r => {
    const id = r[qIdIdx]; if (!id || seenIds.has(id)) return; seenIds.add(id)
    if (r[qSexeIdx] === 'Homme') nH++; else if (r[qSexeIdx] === 'Femme') nF++
    const ar = r[qAgeIdx]; if (ar != null) ageRawVals.push(ar.toString().trim())
    const ir = r[qImcIdx]; if (ir != null) imcRawVals.push(ir.toString().trim())
    const age = parseFloat(ar); if (!isNaN(age)) ages.push(age)
    const imc = parseFloat(ir); if (!isNaN(imc)) imcs.push(imc)
  })
  const ageIsTranche = ages.length < ageRawVals.length * 0.5
  const imcIsTranche = imcs.length < imcRawVals.length * 0.5
  const trancheDistrib = vals => {
    const c = {}; vals.forEach(v => { c[v] = (c[v] || 0) + 1 })
    return Object.entries(c).sort((a, b) =>
      (parseFloat(a[0].replace(/[^\d]/g, ' ').trim().split(/\s+/)[0]) || 0) -
      (parseFloat(b[0].replace(/[^\d]/g, ' ').trim().split(/\s+/)[0]) || 0))
  }
  const ageTranches = ageIsTranche ? trancheDistrib(ageRawVals) : null
  const imcTranches = imcIsTranche ? trancheDistrib(imcRawVals) : null

  // Bio
  const combineVols = kw => {
    const iG = rapHeaders.findIndex(h => h && h.toString().includes(kw) && h.toString().includes('gauche'))
    const iD = rapHeaders.findIndex(h => h && h.toString().includes(kw) && h.toString().includes('droit'))
    const vals = []
    rapData.forEach(r => { const g = parseFloat(r[iG]), d = parseFloat(r[iD]); if (!isNaN(g)) vals.push(g); else if (!isNaN(d)) vals.push(d) })
    return vals
  }
  const volPRP = combineVols('Volume PRP injecté')
  const dosePlaq = combineVols('Dose de plaquettes')
  const pureteIdx = rapCol('Composition relative en plaquettes')
  const facteurIdx = rapCol('Facteur de concentration plaquettaire')
  const rendIdx = rapCol('Rendement plaquettaire')
  const purete = rapData.map(r => parseFloat(r[pureteIdx])).filter(v => !isNaN(v))
  const facteur = rapData.map(r => parseFloat(r[facteurIdx])).filter(v => !isNaN(v))
  const rend = rapData.map(r => parseFloat(r[rendIdx])).filter(v => !isNaN(v))
  const volAHG = rapHeaders.findIndex(h => h && h.toString().includes('Volume Autre produit 1') && h.toString().includes('gauche'))
  const volAHD = rapHeaders.findIndex(h => h && h.toString().includes('Volume Autre produit 1') && h.toString().includes('droit'))
  const volAH = rapData.map(r => { const g = parseFloat(r[volAHG]), d = parseFloat(r[volAHD]); return !isNaN(g) ? g : !isNaN(d) ? d : NaN }).filter(v => !isNaN(v))

  // Scores
  const womacAiIdx = questHeaders.findIndex(h => h && h.toString().trim() === 'Avant Injection')
  const womacM3Idx = questHeaders.findIndex(h => h && h.toString().trim() === 'M3')
  const womacM6Idx = questHeaders.findIndex(h => h && h.toString().trim() === 'M6')
  const qdvIndices = questHeaders.reduce((a, h, i) => { if (h && h.toString().includes('quel point') && h.toString().includes('quotidienne')) a.push(i); return a }, [])
  const evaIndices = questHeaders.reduce((a, h, i) => { if (h && h.toString().includes('douleur AU REPOS')) a.push(i); return a }, [])

  const focusIds = new Set(
    questData.filter(r => {
      const wAI = womacAiIdx >= 0 ? parseFloat(r[womacAiIdx]) : NaN
      const eAI = evaIndices.length >= 1 ? extractNum(r[evaIndices[0]]) : NaN
      return !isNaN(wAI) || !isNaN(eAI)
    }).map(r => r[qIdIdx]?.toString()).filter(Boolean)
  )

  let womacAI = [], womacM3 = [], womacM6 = [], evaAI = [], evaM3 = [], evaM6 = [], qdvAI = [], qdvM3 = [], qdvM6 = [], nM3 = 0, nM6 = 0
  questData.forEach(r => {
    const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
    const wAI = womacAiIdx >= 0 ? parseFloat(r[womacAiIdx]) : NaN
    const wM3 = womacM3Idx >= 0 ? parseFloat(r[womacM3Idx]) : NaN
    const wM6 = womacM6Idx >= 0 ? parseFloat(r[womacM6Idx]) : NaN
    if (!isNaN(wAI)) womacAI.push(wAI)
    if (!isNaN(wM3)) { womacM3.push(wM3); nM3++ }
    if (!isNaN(wM6)) { womacM6.push(wM6); nM6++ }
    if (evaIndices.length >= 1) { const v = extractNum(r[evaIndices[0]]); if (!isNaN(v)) evaAI.push(v) }
    if (evaIndices.length >= 2) { const v = extractNum(r[evaIndices[1]]); if (!isNaN(v)) evaM3.push(v) }
    if (evaIndices.length >= 3) { const v = extractNum(r[evaIndices[2]]); if (!isNaN(v)) evaM6.push(v) }
    if (qdvIndices.length >= 1) { const v = extractNum(r[qdvIndices[0]]); if (!isNaN(v)) qdvAI.push(v) }
    if (qdvIndices.length >= 2) { const v = extractNum(r[qdvIndices[1]]); if (!isNaN(v)) qdvM3.push(v) }
    if (qdvIndices.length >= 3) { const v = extractNum(r[qdvIndices[2]]); if (!isNaN(v)) qdvM6.push(v) }
  })

  const calcImprov = (aiCol, mxCol, exFn, filterFn) => {
    const pairs = []
    questData.forEach(r => {
      const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
      if (filterFn && !filterFn(id.toString())) return
      const a = aiCol >= 0 ? (exFn ? exFn(r[aiCol]) : parseFloat(r[aiCol])) : NaN
      const b = mxCol >= 0 ? (exFn ? exFn(r[mxCol]) : parseFloat(r[mxCol])) : NaN
      if (!isNaN(a) && !isNaN(b)) pairs.push([a, b])
    })
    const improved = pairs.filter(([a, b]) => a > b).length
    const pctImproved = pairs.length ? improved / pairs.length * 100 : 0
    const improvements = pairs.filter(([a]) => a !== 0).map(([a, b]) => (a - b) / a * 100)
    return { pctImproved, meanImprov: improvements.length ? mean(improvements) : 0, n: pairs.length }
  }
  const womacRes = calcImprov(womacAiIdx, womacM6Idx, null, null)
  const evaRes = evaIndices.length >= 3 ? calcImprov(evaIndices[0], evaIndices[2], extractNum, null) : { pctImproved: 0, meanImprov: 0, n: 0 }
  const qdvRes = qdvIndices.length >= 3 ? calcImprov(qdvIndices[0], qdvIndices[2], extractNum, null) : { pctImproved: 0, meanImprov: 0, n: 0 }

  // Compare 1inj vs 2+
  const ids1 = new Set(Object.entries(injPerPat).filter(([, v]) => v === 1).map(([k]) => k.toString()))
  const ids2p = new Set(Object.entries(injPerPat).filter(([, v]) => v >= 2).map(([k]) => k.toString()))
  const calcGrp = fn => {
    const w = calcImprov(womacAiIdx, womacM6Idx, null, fn)
    const e = evaIndices.length >= 3 ? calcImprov(evaIndices[0], evaIndices[2], extractNum, fn) : { pctImproved: 0, meanImprov: 0, n: 0 }
    const wAI = [], wM6v = [], eAI = [], eM6v = []
    questData.forEach(r => {
      const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString()) || (fn && !fn(id.toString()))) return
      const wai = womacAiIdx >= 0 ? parseFloat(r[womacAiIdx]) : NaN
      const wm6 = womacM6Idx >= 0 ? parseFloat(r[womacM6Idx]) : NaN
      if (!isNaN(wai)) wAI.push(wai); if (!isNaN(wm6)) wM6v.push(wm6)
      if (evaIndices.length >= 1) { const ea = extractNum(r[evaIndices[0]]); if (!isNaN(ea)) eAI.push(ea) }
      if (evaIndices.length >= 3) { const em6 = extractNum(r[evaIndices[2]]); if (!isNaN(em6)) eM6v.push(em6) }
    })
    return { womac: w, eva: e, wAI, wM6: wM6v, eAI, eM6: eM6v, n: [...focusIds].filter(id => !fn || fn(id)).length }
  }
  const grp1 = calcGrp(id => ids1.has(id))
  const grp2p = calcGrp(id => ids2p.has(id))
  const showCompare = grp1.womac.n >= 5 || grp1.eva.n >= 5 || grp2p.womac.n >= 5 || grp2p.eva.n >= 5

  // Tolérance
  const tolIdx = questHeaders.findIndex(h => h && h.toString().includes('effets suivants') && h.toString().includes('attribuez'))
  let tolAucun = 0, tol1 = 0, tol2 = 0, tolTotal = 0
  questData.forEach(r => {
    const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
    const v = r[tolIdx]; if (!v) return
    const s = v.toString().toLowerCase().replace(/^[^:]+:\s*/, '').trim()
    if (!s) return; tolTotal++
    if (s.includes('aucune gêne') || s.includes('non, je n')) tolAucun++
    else if (s.includes('au moins deux')) tol2++
    else tol1++
  })

  // Profil pré-injection
  const tabacIdx = questHeaders.findIndex(h => h && h.toString().includes('tabac'))
  const comorbIdx = questHeaders.findIndex(h => h && h.toString().includes('atteintes chroniques'))
  const injAntIdx = questHeaders.findIndex(h => h && h.toString().includes("bénéficié d'une injection pour la pathol"))
  const injProdIdx = questHeaders.findIndex(h => h && h.toString().includes("De quel produit s'agissait"))
  const kineIdx = questHeaders.findIndex(h => h && h.toString().includes('rééducation chez un kinésithérapeute'))
  const rupLigIdx = questHeaders.findIndex(h => h && h.toString().includes('rupture ligamentaire'))
  const arthroIdx = questHeaders.findIndex(h => h && h.toString().includes('arthroscopie'))
  const antaiIdx = questHeaders.findIndex(h => h && h.toString().includes('antalgiques') && !h.toString().includes('.1') && !h.toString().includes('.2'))
  const antm3Idx = questHeaders.findIndex(h => h && h.toString().includes('antalgiques') && h.toString().includes('.1'))
  const antm6Idx = questHeaders.findIndex(h => h && h.toString().includes('antalgiques') && h.toString().includes('.2'))
  const actAiIdx = questHeaders.findIndex(h => h && h.toString().includes("type d'activité physique") && !h.toString().includes('.1') && !h.toString().includes('.2'))
  const actM3Idx = questHeaders.findIndex(h => h && h.toString().includes("type d'activité physique") && h.toString().includes('.1'))
  const actM6Idx = questHeaders.findIndex(h => h && h.toString().includes("type d'activité physique") && h.toString().includes('.2'))

  const seenProf = new Set(); let nProfile = 0
  let nAucuneComor = 0, nHTA = 0, nDiabete = 0, nRhumato = 0, nAutreComor = 0
  let nInjAntOui = 0, nInjPRP = 0, nInjCortisone = 0, nInjAH2 = 0, nInjAutre = 0
  let nKineOui = 0, nRupLigOui = 0, nArthroOui = 0
  const tabacCounts = { 'Non-fumeur': 0, 'Ex-fumeur': 0, 'Fumeur': 0 }
  questData.forEach(r => {
    const id = r[qIdIdx]; if (!id || seenProf.has(id)) return; seenProf.add(id); nProfile++
    const tab = stripPrefix(r[tabacIdx]).toLowerCase()
    if (tab.includes('jamais')) tabacCounts['Non-fumeur']++
    else if (tab.includes('ancien')) tabacCounts['Ex-fumeur']++
    else if (tab.includes('fum')) tabacCounts['Fumeur']++
    const com = stripPrefix(r[comorbIdx]).toLowerCase()
    if (com === '' || com === 'aucune') nAucuneComor++
    else {
      if (com.includes('hypertension')) nHTA++
      if (com.includes('diabète')) nDiabete++
      if (com.includes('rhumatisme')) nRhumato++
      if (!com.includes('hypertension') && !com.includes('diabète') && !com.includes('rhumatisme')) nAutreComor++
    }
    if (stripPrefix(r[injAntIdx]) === 'Oui') nInjAntOui++
    const prod = stripPrefix(r[injProdIdx]).toLowerCase()
    if (prod.includes('prp')) nInjPRP++
    if (prod.includes('cortisone')) nInjCortisone++
    if (prod.includes('hyaluronique')) nInjAH2++
    if (prod.includes('au moins deux')) nInjAutre++
    if (stripPrefix(r[kineIdx]) === 'Oui') nKineOui++
    if (stripPrefix(r[rupLigIdx]) === 'Oui') nRupLigOui++
    if (stripPrefix(r[arthroIdx]) === 'Oui') nArthroOui++
  })

  const countAct = colIdx => {
    let portant = 0, nonPortant = 0, aucune = 0, total = 0
    questData.forEach(r => {
      const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
      const v = r[colIdx]; if (!v) return
      const s = v.toString().replace(/^[^:]+:\s*/, '').trim().toLowerCase(); total++
      if (s.includes('non portant')) nonPortant++; else if (s.includes('portant')) portant++; else aucune++
    })
    return { portant, nonPortant, aucune, total }
  }
  const countAnt = colIdx => {
    let jamais = 0, occ = 0, regulier = 0, total = 0
    questData.forEach(r => {
      const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
      const v = r[colIdx]; if (!v) return
      const s = v.toString().replace(/^[^:]+:\s*/, '').trim().toLowerCase(); total++
      if (s === 'jamais') jamais++; else if (s.includes('tous les jours') || s.includes('5 fois')) regulier++; else occ++
    })
    return { jamais, occ, regulier, total }
  }
  const actAI = countAct(actAiIdx >= 0 ? actAiIdx : 34)
  const actM3 = countAct(actM3Idx >= 0 ? actM3Idx : 89)
  const actM6 = countAct(actM6Idx >= 0 ? actM6Idx : 90)
  const antAI = countAnt(antaiIdx >= 0 ? antaiIdx : 53)
  const antM3 = countAnt(antm3Idx >= 0 ? antm3Idx : 54)
  const antM6 = countAnt(antm6Idx >= 0 ? antm6Idx : 55)

  // Procédure
  const kitIdx = rapCol('Nom du kit')
  const guidageIdx = rapCol('Guidage')
  const melangeIdx = rapCol('Mélangé')
  const desinfIdx = rapCol('Désinfectant')
  const aiguilleIdx = rapCol('Aiguille')
  const rapDistrib = ci => { const c = {}; rapData.forEach(r => { const v = r[ci]; if (v) c[v] = (c[v] || 0) + 1 }); return Object.entries(c).sort((a, b) => b[1] - a[1]) }
  const kitDistrib = kitIdx >= 0 ? rapDistrib(kitIdx) : []
  const melangeDistrib = melangeIdx >= 0 ? rapDistrib(melangeIdx) : []
  const desinfDistrib = desinfIdx >= 0 ? rapDistrib(desinfIdx) : []
  const aiguilleDistrib = aiguilleIdx >= 0 ? rapDistrib(aiguilleIdx) : []
  const guidageN = guidageIdx >= 0 ? rapData.filter(r => r[guidageIdx]).length : 0

  // Facteurs prédictifs
  const MIN_N_CORR = 10
  const corrPats = []
  questData.forEach(r => {
    const id = r[qIdIdx]; if (!id || !focusIds.has(id.toString())) return
    const wAI = womacAiIdx >= 0 ? parseFloat(r[womacAiIdx]) : NaN
    const wM6v = womacM6Idx >= 0 ? parseFloat(r[womacM6Idx]) : NaN
    const eAI = evaIndices.length >= 1 ? extractNum(r[evaIndices[0]]) : NaN
    const eM6v = evaIndices.length >= 3 ? extractNum(r[evaIndices[2]]) : NaN
    const qAI = qdvIndices.length >= 1 ? extractNum(r[qdvIndices[0]]) : NaN
    const qM6v = qdvIndices.length >= 3 ? extractNum(r[qdvIndices[2]]) : NaN
    const antS = stripPrefix(r[antaiIdx >= 0 ? antaiIdx : 53]).toLowerCase()
    const comS = stripPrefix(r[comorbIdx]).toLowerCase()
    const injS = stripPrefix(r[injAntIdx])
    const tabS = stripPrefix(r[tabacIdx]).toLowerCase()
    const actS = stripPrefix(r[actAiIdx >= 0 ? actAiIdx : 34]).toLowerCase()
    const kineS = stripPrefix(r[kineIdx])
    const nInj = injPerPat[id.toString()] || 1
    corrPats.push({
      womacDelta: !isNaN(wAI) && !isNaN(wM6v) ? wAI - wM6v : NaN,
      evaDelta: !isNaN(eAI) && !isNaN(eM6v) ? eAI - eM6v : NaN,
      qdvDelta: !isNaN(qAI) && !isNaN(qM6v) ? qAI - qM6v : NaN,
      womacAI: wAI, evaAI: eAI,
      antRegulier: antS.includes('tous les jours') || antS.includes('5 fois') ? 1 : antS === '' ? null : 0,
      antJamais: antS === 'jamais' ? 1 : antS === '' ? null : 0,
      avecComor: comS === '' ? null : comS === 'aucune' ? 0 : 1,
      injAnt: injS === '' ? null : injS === 'Oui' ? 1 : 0,
      actPortant: actS === '' ? null : actS.includes('non portant') ? 0 : actS.includes('portant') ? 1 : null,
      actAucune: actS === '' ? null : actS.includes('ne pratique') ? 1 : 0,
      exFumeur: tabS === '' ? null : tabS.includes('ancien') ? 1 : 0,
      kineOui: kineS === '' ? null : kineS === 'Oui' ? 1 : 0,
      multiInj: nInj >= 2 ? 1 : 0,
    })
  })

  const groupDiff = (pred, out) => {
    const pairs = corrPats.filter(p => p[pred] !== null && !isNaN(p[pred]) && !isNaN(p[out]))
    const g0 = pairs.filter(p => p[pred] === 0).map(p => p[out])
    const g1 = pairs.filter(p => p[pred] === 1).map(p => p[out])
    if (g0.length < 2 || g1.length < 2) return null
    return { diff: mean(g1) - mean(g0), n: pairs.length, n0: g0.length, n1: g1.length }
  }
  const pearsonR = (xk, yk) => {
    const pairs = corrPats.filter(p => !isNaN(p[xk]) && !isNaN(p[yk]))
    if (pairs.length < 4) return null
    const xs = pairs.map(p => p[xk]), ys = pairs.map(p => p[yk])
    const mx = mean(xs), my = mean(ys)
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
    const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0))
    return den === 0 ? null : { r: num / den, n: pairs.length }
  }

  const PREDS = [
    { key: 'antRegulier', label: 'Antalgiques réguliers avant injection' },
    { key: 'antJamais', label: "Pas d'antalgiques avant injection" },
    { key: 'avecComor', label: 'Comorbidité chronique' },
    { key: 'injAnt', label: 'Injection antérieure' },
    { key: 'actPortant', label: 'Activité physique portante avant injection' },
    { key: 'actAucune', label: 'Aucune activité physique avant injection' },
    { key: 'exFumeur', label: 'Ancien fumeur' },
    { key: 'kineOui', label: 'Rééducation kiné antérieure' },
    { key: 'multiInj', label: 'Protocole multi-injections' },
  ]
  const OUTS = [
    { key: 'womacDelta', label: 'WOMAC', thr: 3 },
    { key: 'evaDelta', label: 'EVA', thr: 0.5 },
    { key: 'qdvDelta', label: 'QdV', thr: 0.5 },
  ]
  const correlations = []
  PREDS.forEach(p => OUTS.forEach(o => {
    const r = groupDiff(p.key, o.key)
    if (r && Math.abs(r.diff) >= o.thr) correlations.push({ predictor: p.label, outcome: o.label, ...r, sufficient: r.n >= MIN_N_CORR })
  }))
  correlations.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  const contCorr = [['womacAI', 'womacDelta', 'WOMAC'], ['evaAI', 'evaDelta', 'EVA']].map(([x, y, l]) => {
    const r = pearsonR(x, y)
    return r ? { label: `Score ${l} initial → amélioration ${l}`, ...r, sufficient: r.n >= MIN_N_CORR } : null
  }).filter(Boolean)

  return {
    praticien, centre, dateMin, dateMax, nPatients, nInjections, inj1, inj2, inj3p, nAH,
    nH, nF, ages, imcs, ageIsTranche, imcIsTranche, ageTranches, imcTranches,
    volPRP, dosePlaq, purete, facteur, rend, volAH,
    womacAI, womacM3, womacM6, evaAI, evaM3, evaM6, qdvAI, qdvM3, qdvM6,
    nM0: focusIds.size, nM3, nM6, womacRes, evaRes, qdvRes,
    tolAucun, tol1, tol2, tolTotal, showCompare, grp1, grp2p,
    nProfile, tabacCounts, nAucuneComor, nHTA, nDiabete, nRhumato, nAutreComor,
    nInjAntOui, nInjPRP, nInjCortisone, nInjAH2, nInjAutre, nKineOui, nRupLigOui, nArthroOui,
    actAI, actM3, actM6, antAI, antM3, antM6,
    kitDistrib, melangeDistrib, desinfDistrib, aiguilleDistrib, guidageN,
    correlations, contCorr, MIN_N_CORR,
  }
}
