'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

const DOC_PERSONALES = [
  { id: 'pasaporte', name: 'Pasaporte', icon: '🛂', vencimiento: true },
  { id: 'fm3', name: 'FM3 / Visa', icon: '📜', vencimiento: true },
  { id: 'acta_matrimonio', name: 'Acta Matrimonio', icon: '💍', vencimiento: false },
  { id: 'curp', name: 'CURP', icon: '📋', vencimiento: false },
  { id: 'rfc', name: 'RFC', icon: '📄', emision: true },
  { id: 'comprobante', name: 'Comprobante', icon: '🏠', emision: true },
]

const DOC_LEGALES_TIPOS = [
  { id: 'escrituras', name: 'Escrituras', icon: '🏡' },
  { id: 'predial', name: 'Predial', icon: '🏛️' },
  { id: 'avaluo', name: 'Avalúo', icon: '📊' },
  { id: 'clg', name: 'CLG', icon: '📜' },
  { id: 'contrato', name: 'Contrato', icon: '📝' },
  { id: 'poder', name: 'Poder Notarial', icon: '⚖️' },
  { id: 'otro', name: 'Otro', icon: '📁' },
]

export default function ClienteDetalle() {
  const router = useRouter()
  const params = useParams()
  const [cliente, setCliente] = useState(null)
  const [clientes, setClientes] = useState([])
  const [editingDatos, setEditingDatos] = useState(false)
  const [tempDatos, setTempDatos] = useState({})
  
  // Modales
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDocLegalModal, setShowDocLegalModal] = useState(false)
  const [showViewer, setShowViewer] = useState(null)
  const [showDateModal, setShowDateModal] = useState(false)
  
  // Upload state
  const [uploadTarget, setUploadTarget] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [newDocLegal, setNewDocLegal] = useState({ tipo: '', nombre: '' })
  
  // Viewer state
  const [currentPage, setCurrentPage] = useState(0)
  const [currentVersion, setCurrentVersion] = useState(0)
  
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  useEffect(() => {
    const pin = localStorage.getItem('dvpro_pin')
    if (!pin) { router.push('/'); return }
    
    const saved = localStorage.getItem('dvpro_clientes')
    if (saved) {
      const data = JSON.parse(saved)
      setClientes(data)
      const c = data.find(x => x.id === params.id)
      if (c) {
        setCliente(c)
        setTempDatos(c.datosGenerales || {})
      }
    }
  }, [params.id, router])

  const saveCliente = (updated) => {
    const newClientes = clientes.map(c => c.id === updated.id ? updated : c)
    setClientes(newClientes)
    setCliente(updated)
    localStorage.setItem('dvpro_clientes', JSON.stringify(newClientes))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const fileData = {
        data: event.target.result,
        name: file.name,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
      
      const docType = DOC_PERSONALES.find(d => d.id === uploadTarget)
      if (docType && (docType.vencimiento || docType.emision)) {
        setPendingFile(fileData)
        setShowUploadModal(false)
        setShowDateModal(true)
      } else {
        saveDocPersonal(fileData, null)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveDocPersonal = (fileData, fecha) => {
    const updated = { ...cliente }
    if (!updated.docs) updated.docs = {}
    
    const existing = updated.docs[uploadTarget]
    const docType = DOC_PERSONALES.find(d => d.id === uploadTarget)
    
    const newVersion = {
      ...fileData,
      fechaVencimiento: docType?.vencimiento ? fecha : null,
      fechaEmision: docType?.emision ? fecha : null,
      esVigente: true
    }
    
    if (existing?.versiones) {
      // Marcar anteriores como no vigentes
      existing.versiones.forEach(v => v.esVigente = false)
      existing.versiones.push(newVersion)
      updated.docs[uploadTarget] = existing
    } else {
      updated.docs[uploadTarget] = { versiones: [newVersion] }
    }
    
    saveCliente(updated)
    setUploadTarget(null)
    setPendingFile(null)
    setSelectedDate('')
    setShowDateModal(false)
    setShowUploadModal(false)
  }

  const handleDateSubmit = () => saveDocPersonal(pendingFile, selectedDate || null)
  const handleSkipDate = () => saveDocPersonal(pendingFile, null)

  const handleAddDocLegal = (files) => {
    if (!newDocLegal.tipo || !newDocLegal.nombre || !files?.length) return
    
    const readers = Array.from(files).map(file => {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = (e) => resolve({
          data: e.target.result,
          name: file.name,
          type: file.type
        })
        reader.readAsDataURL(file)
      })
    })
    
    Promise.all(readers).then(paginas => {
      const updated = { ...cliente }
      if (!updated.docsLegales) updated.docsLegales = []
      
      updated.docsLegales.push({
        id: Date.now().toString(),
        tipo: newDocLegal.tipo,
        nombre: newDocLegal.nombre,
        paginas,
        createdAt: new Date().toISOString()
      })
      
      saveCliente(updated)
      setNewDocLegal({ tipo: '', nombre: '' })
      setShowDocLegalModal(false)
    })
  }

  const handleDeleteDocLegal = (docId) => {
    if (!confirm('¿Eliminar este documento?')) return
    const updated = { ...cliente }
    updated.docsLegales = updated.docsLegales.filter(d => d.id !== docId)
    saveCliente(updated)
    setShowViewer(null)
  }

  const handleDeleteCliente = () => {
    if (!confirm('¿Eliminar este cliente y todos sus documentos?')) return
    const newClientes = clientes.filter(c => c.id !== cliente.id)
    localStorage.setItem('dvpro_clientes', JSON.stringify(newClientes))
    router.push('/clientes')
  }

  const saveDatosGenerales = () => {
    const updated = { ...cliente, datosGenerales: tempDatos }
    saveCliente(updated)
    setEditingDatos(false)
  }

  const getDaysUntil = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date) - new Date()) / (1000*60*60*24))
  }

  const getBadgeColor = (days) => {
    if (days === null) return null
    if (days < 0) return '#ef4444'
    if (days <= 30) return '#f97316'
    if (days <= 90) return '#eab308'
    return '#22c55e'
  }

  if (!cliente) return <div style={{padding:'2rem',textAlign:'center'}}>Cargando...</div>

  // Viewer Modal
  const ViewerModal = () => {
    const isDocLegal = showViewer?.type === 'legal'
    let currentData, totalPages, docInfo
    
    if (isDocLegal) {
      const doc = cliente.docsLegales?.find(d => d.id === showViewer.id)
      if (!doc) return null
      docInfo = doc
      totalPages = doc.paginas?.length || 0
      currentData = doc.paginas?.[currentPage]
    } else {
      const doc = cliente.docs?.[showViewer?.id]
      if (!doc) return null
      const versiones = doc.versiones || []
      docInfo = DOC_PERSONALES.find(d => d.id === showViewer.id)
      const version = versiones[currentVersion] || versiones[versiones.length - 1]
      currentData = version
      totalPages = versiones.length
    }

    const days = isDocLegal ? null : getDaysUntil(currentData?.fechaVencimiento)
    const badgeColor = getBadgeColor(days)

    return (
      <div style={styles.viewerOverlay}>
        <div style={styles.viewerHeader}>
          <button style={styles.backBtn} onClick={() => { setShowViewer(null); setCurrentPage(0); setCurrentVersion(0); }}>
            ← Volver
          </button>
          <span style={styles.viewerTitle}>
            {isDocLegal ? docInfo.nombre : docInfo?.name}
          </span>
          {!isDocLegal && totalPages > 1 && (
            <span style={styles.versionIndicator}>v{currentVersion + 1}/{totalPages}</span>
          )}
        </div>
        
        {currentData?.fechaVencimiento && (
          <div style={{...styles.dateBadge, background: badgeColor}}>
            <span style={{fontSize:'0.75rem',opacity:0.8}}>{docInfo?.emision ? 'Emitido:' : 'Vence:'}</span>
            <span style={{fontWeight:'bold'}}>{new Date(currentData.fechaVencimiento || currentData.fechaEmision).toLocaleDateString('es-MX')}</span>
            {days !== null && (
              <span style={{fontSize:'0.8rem'}}>
                {days < 0 ? `¡Vencido hace ${Math.abs(days)} días!` : `${days} días restantes`}
              </span>
            )}
          </div>
        )}
        
        <div style={styles.viewerContent}>
          {isDocLegal && currentPage > 0 && (
            <button style={{...styles.navBtn, left: '10px'}} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
          )}
          {!isDocLegal && currentVersion > 0 && (
            <button style={{...styles.navBtn, left: '10px'}} onClick={() => setCurrentVersion(v => v - 1)}>‹</button>
          )}
          
          {currentData?.type?.includes('pdf') ? (
            <iframe src={currentData.data} style={styles.pdfViewer} title="PDF" />
          ) : (
            <img src={currentData?.data} alt="Doc" style={styles.docImage} />
          )}
          
          {isDocLegal && currentPage < totalPages - 1 && (
            <button style={{...styles.navBtn, right: '10px'}} onClick={() => setCurrentPage(p => p + 1)}>›</button>
          )}
          {!isDocLegal && currentVersion < totalPages - 1 && (
            <button style={{...styles.navBtn, right: '10px'}} onClick={() => setCurrentVersion(v => v + 1)}>›</button>
          )}
        </div>
        
        {(isDocLegal ? totalPages : totalPages) > 1 && (
          <div style={styles.dots}>
            {Array.from({length: isDocLegal ? totalPages : totalPages}).map((_, i) => (
              <div 
                key={i}
                style={{
                  ...styles.dot,
                  background: i === (isDocLegal ? currentPage : currentVersion) ? '#d946ef' : '#555'
                }}
                onClick={() => isDocLegal ? setCurrentPage(i) : setCurrentVersion(i)}
              />
            ))}
          </div>
        )}
        
        <div style={styles.viewerActions}>
          <a href={currentData?.data} download={currentData?.name || 'documento'} style={styles.downloadBtn}>📥</a>
          {isDocLegal && (
            <button style={styles.deleteDocBtn} onClick={() => handleDeleteDocLegal(showViewer.id)}>🗑️</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <input type="file" ref={cameraRef} onChange={handleFileUpload} accept="image/*" capture="environment" style={{display:'none'}} />
      <input type="file" ref={galleryRef} onChange={handleFileUpload} accept="image/*,.pdf" style={{display:'none'}} />
      
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/clientes')}>← Clientes</button>
        <button style={styles.deleteClienteBtn} onClick={handleDeleteCliente}>🗑️</button>
      </div>
      
      {/* Cliente Info */}
      <div style={styles.clienteHeader}>
        <div style={styles.avatar}>{cliente.nombre.charAt(0).toUpperCase()}</div>
        <h1 style={styles.clienteName}>{cliente.nombre}</h1>
        {cliente.telefono && <p style={styles.clienteMeta}>📱 {cliente.telefono}</p>}
        {cliente.email && <p style={styles.clienteMeta}>✉️ {cliente.email}</p>}
      </div>

      {/* Datos Generales */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>📋 Datos Generales</h2>
          <button style={styles.editBtn} onClick={() => editingDatos ? saveDatosGenerales() : setEditingDatos(true)}>
            {editingDatos ? '✓ Guardar' : '✏️ Editar'}
          </button>
        </div>
        
        {editingDatos ? (
          <div style={styles.card}>
            {['rfc', 'curp', 'nacionalidad', 'estadoCivil', 'ocupacion'].map(field => (
              <div key={field} style={styles.formRow}>
                <label style={styles.formLabel}>{field.toUpperCase()}</label>
                <input
                  type="text"
                  value={tempDatos[field] || ''}
                  onChange={(e) => setTempDatos({...tempDatos, [field]: e.target.value})}
                  style={styles.formInput}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.card}>
            {Object.keys(tempDatos).length === 0 ? (
              <p style={{color:'#a0a0a0',textAlign:'center',padding:'1rem'}}>Sin datos adicionales</p>
            ) : (
              Object.entries(tempDatos).filter(([k,v]) => v).map(([key, value]) => (
                <div key={key} style={styles.dataRow}>
                  <span style={styles.dataLabel}>{key.toUpperCase()}</span>
                  <span style={styles.dataValue}>{value}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Documentos Personales */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📄 Documentos Personales</h2>
        <div style={styles.docsGrid}>
          {DOC_PERSONALES.map(doc => {
            const clienteDoc = cliente.docs?.[doc.id]
            const hasDoc = clienteDoc?.versiones?.length > 0
            const currentVer = clienteDoc?.versiones?.find(v => v.esVigente) || clienteDoc?.versiones?.[clienteDoc.versiones.length - 1]
            const days = doc.vencimiento ? getDaysUntil(currentVer?.fechaVencimiento) : null
            const badgeColor = getBadgeColor(days)
            
            return (
              <div key={doc.id} style={styles.docCard}>
                {hasDoc && badgeColor && (
                  <div style={{...styles.miniBadge, background: badgeColor}}>
                    {days < 0 ? '!' : days <= 30 ? `${days}d` : '✓'}
                  </div>
                )}
                <div style={styles.docIcon}>{doc.icon}</div>
                <div style={styles.docName}>{doc.name}</div>
                {hasDoc ? (
                  <div style={styles.docActions}>
                    <button style={styles.viewDocBtn} onClick={() => setShowViewer({type:'personal', id: doc.id})}>
                      👁️
                    </button>
                    <button style={styles.addVersionBtn} onClick={() => { setUploadTarget(doc.id); setShowUploadModal(true); }}>
                      +
                    </button>
                  </div>
                ) : (
                  <button style={styles.uploadDocBtn} onClick={() => { setUploadTarget(doc.id); setShowUploadModal(true); }}>
                    + Agregar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Documentos Legales */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>📁 Documentos Legales</h2>
          <button style={styles.addLegalBtn} onClick={() => setShowDocLegalModal(true)}>+ Agregar</button>
        </div>
        
        {cliente.docsLegales?.length > 0 ? (
          <div style={styles.legalList}>
            {cliente.docsLegales.map(doc => {
              const tipoInfo = DOC_LEGALES_TIPOS.find(t => t.id === doc.tipo)
              return (
                <div 
                  key={doc.id} 
                  style={styles.legalCard}
                  onClick={() => setShowViewer({type:'legal', id: doc.id})}
                >
                  <span style={styles.legalIcon}>{tipoInfo?.icon || '📁'}</span>
                  <div style={styles.legalInfo}>
                    <div style={styles.legalName}>{doc.nombre}</div>
                    <div style={styles.legalMeta}>{doc.paginas?.length || 0} página(s)</div>
                  </div>
                  <span style={styles.chevron}>›</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={styles.card}>
            <p style={{color:'#a0a0a0',textAlign:'center',padding:'1rem'}}>Sin documentos legales</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Agregar documento</h3>
            <div style={styles.uploadOptions}>
              <button style={styles.uploadOption} onClick={() => cameraRef.current?.click()}>
                <span style={{fontSize:'2rem'}}>📷</span>
                <span>Cámara</span>
              </button>
              <button style={styles.uploadOption} onClick={() => galleryRef.current?.click()}>
                <span style={{fontSize:'2rem'}}>🖼️</span>
                <span>Galería</span>
              </button>
            </div>
            <button style={styles.cancelModalBtn} onClick={() => setShowUploadModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Date Modal */}
      {showDateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {DOC_PERSONALES.find(d => d.id === uploadTarget)?.vencimiento ? '📅 Fecha de Vencimiento' : '📅 Fecha de Emisión'}
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
            <div style={styles.dateActions}>
              <button style={styles.datePrimaryBtn} onClick={handleDateSubmit}>Guardar</button>
              <button style={styles.cancelModalBtn} onClick={handleSkipDate}>Omitir</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Legal Modal */}
      {showDocLegalModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDocLegalModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>📁 Nuevo Documento Legal</h3>
            
            <div style={styles.formRow}>
              <label style={styles.formLabel}>Tipo</label>
              <select
                value={newDocLegal.tipo}
                onChange={(e) => setNewDocLegal({...newDocLegal, tipo: e.target.value})}
                style={styles.formInput}
              >
                <option value="">Seleccionar...</option>
                {DOC_LEGALES_TIPOS.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.formRow}>
              <label style={styles.formLabel}>Nombre/Descripción</label>
              <input
                type="text"
                value={newDocLegal.nombre}
                onChange={(e) => setNewDocLegal({...newDocLegal, nombre: e.target.value})}
                style={styles.formInput}
                placeholder="Ej: Escrituras Casa PV"
              />
            </div>
            
            <div style={styles.formRow}>
              <label style={styles.formLabel}>Archivos (múltiples)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => handleAddDocLegal(e.target.files)}
                style={styles.formInput}
              />
            </div>
            
            <button style={styles.cancelModalBtn} onClick={() => setShowDocLegalModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Viewer */}
      {showViewer && <ViewerModal />}

      <footer style={styles.footer}>C19 Sage | Colmena 2026</footer>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '1rem', paddingBottom: '4rem', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 100%)' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  backBtn: { background: 'transparent', border: 'none', color: '#d946ef', fontSize: '1rem', cursor: 'pointer' },
  deleteClienteBtn: { background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' },
  clienteHeader: { textAlign: 'center', marginBottom: '2rem' },
  avatar: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #d946ef, #581c87)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 1rem' },
  clienteName: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  clienteMeta: { color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '0.25rem' },
  section: { marginBottom: '2rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sectionTitle: { fontSize: '1.1rem', color: '#d946ef' },
  editBtn: { background: '#2a1545', border: 'none', color: '#d946ef', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
  addLegalBtn: { background: 'linear-gradient(135deg, #d946ef, #c026d3)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
  card: { background: '#1f1035', borderRadius: '12px', padding: '1rem' },
  formRow: { marginBottom: '1rem' },
  formLabel: { display: 'block', color: '#a0a0a0', fontSize: '0.8rem', marginBottom: '0.5rem' },
  formInput: { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #581c87', background: '#0a0a0f', color: '#fff', fontSize: '0.95rem' },
  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2a1545' },
  dataLabel: { color: '#a0a0a0', fontSize: '0.8rem' },
  dataValue: { fontWeight: '500' },
  docsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
  docCard: { background: '#1f1035', borderRadius: '12px', padding: '1rem', textAlign: 'center', position: 'relative' },
  miniBadge: { position: 'absolute', top: '6px', right: '6px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', color: '#fff' },
  docIcon: { fontSize: '1.8rem', marginBottom: '0.5rem' },
  docName: { fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.5rem' },
  docActions: { display: 'flex', gap: '0.5rem', justifyContent: 'center' },
  viewDocBtn: { background: '#d946ef', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' },
  addVersionBtn: { background: '#581c87', border: 'none', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', color: '#fff' },
  uploadDocBtn: { background: '#2a1545', border: '1px dashed #581c87', borderRadius: '6px', padding: '0.4rem', color: '#a0a0a0', fontSize: '0.75rem', cursor: 'pointer', width: '100%' },
  legalList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  legalCard: { background: '#1f1035', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' },
  legalIcon: { fontSize: '1.5rem' },
  legalInfo: { flex: 1 },
  legalName: { fontWeight: '500', marginBottom: '0.25rem' },
  legalMeta: { fontSize: '0.8rem', color: '#a0a0a0' },
  chevron: { color: '#581c87', fontSize: '1.5rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#1f1035', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '350px' },
  modalTitle: { textAlign: 'center', marginBottom: '1.5rem', color: '#d946ef' },
  uploadOptions: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  uploadOption: { flex: 1, background: '#2a1545', border: '1px solid #581c87', borderRadius: '12px', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#fff' },
  cancelModalBtn: { width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid #581c87', borderRadius: '10px', color: '#a0a0a0', cursor: 'pointer' },
  dateInput: { width: '100%', padding: '1rem', borderRadius: '10px', border: '1px solid #581c87', background: '#0a0a0f', color: '#fff', fontSize: '1rem', marginBottom: '1rem' },
  dateActions: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  datePrimaryBtn: { padding: '0.9rem', background: 'linear-gradient(135deg, #d946ef, #c026d3)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  viewerOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a0a0f', zIndex: 1001, display: 'flex', flexDirection: 'column' },
  viewerHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#1f1035' },
  viewerTitle: { flex: 1, fontSize: '1.1rem' },
  versionIndicator: { background: '#581c87', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' },
  dateBadge: { margin: '0.5rem 1rem', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  viewerContent: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  navBtn: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '2rem', padding: '1rem 0.5rem', cursor: 'pointer', zIndex: 10, borderRadius: '8px' },
  docImage: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  pdfViewer: { width: '100%', height: '100%', border: 'none' },
  dots: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '0.5rem' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer' },
  viewerActions: { display: 'flex', gap: '1rem', padding: '1rem', background: '#1f1035' },
  downloadBtn: { flex: 1, background: '#d946ef', textAlign: 'center', padding: '0.75rem', borderRadius: '10px', fontSize: '1.2rem', textDecoration: 'none' },
  deleteDocBtn: { background: '#ef4444', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer' },
  footer: { textAlign: 'center', padding: '1rem', color: '#555', fontSize: '0.8rem' }
}
