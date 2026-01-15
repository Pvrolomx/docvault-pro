'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newCliente, setNewCliente] = useState({ nombre: '', telefono: '', email: '', notas: '' })
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferMode, setTransferMode] = useState('export')
  const [exportData, setExportData] = useState('')
  const [importCode, setImportCode] = useState('')
  const [transferStatus, setTransferStatus] = useState('')
  const router = useRouter()

  useEffect(() => {
    const pin = localStorage.getItem('dvpro_pin')
    if (!pin) { router.push('/'); return }
    
    const saved = localStorage.getItem('dvpro_clientes')
    if (saved) setClientes(JSON.parse(saved))
  }, [router])

  const saveClientes = (data) => {
    setClientes(data)
    localStorage.setItem('dvpro_clientes', JSON.stringify(data))
  }

  const handleAddCliente = () => {
    if (!newCliente.nombre.trim()) return
    
    const cliente = {
      id: Date.now().toString(),
      ...newCliente,
      docs: {},
      docsLegales: [],
      datosGenerales: {},
      createdAt: new Date().toISOString()
    }
    
    saveClientes([...clientes, cliente])
    setNewCliente({ nombre: '', telefono: '', email: '', notas: '' })
    setShowModal(false)
  }

  const getClienteStatus = (cliente) => {
    const docs = cliente.docs || {}
    let vencidos = 0, porVencer = 0, total = 0
    
    const tiposConVencimiento = ['pasaporte', 'fm3', 'licencia']
    
    Object.entries(docs).forEach(([tipo, doc]) => {
      if (doc) total++
      if (tiposConVencimiento.includes(tipo) && doc?.fechaVencimiento) {
        const dias = Math.ceil((new Date(doc.fechaVencimiento) - new Date()) / (1000*60*60*24))
        if (dias < 0) vencidos++
        else if (dias <= 30) porVencer++
      }
    })
    
    total += (cliente.docsLegales?.length || 0)
    
    return { total, vencidos, porVencer }
  }

  // ======= TRANSFER FUNCTIONS =======
  const handleExport = () => {
    const data = {
      clientes: clientes,
      pin: localStorage.getItem('dvpro_pin'),
      exportedAt: new Date().toISOString()
    }
    const exportString = btoa(JSON.stringify(data))
    setExportData(exportString)
    setTransferStatus(`✅ Listo (${Math.round(exportString.length/1024*10)/10}KB)`)
  }

  const handleDownloadFile = () => {
    if (!exportData) handleExport()
    const blob = new Blob([exportData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `docvault-${new Date().toISOString().slice(0,10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setTransferStatus('✅ Archivo descargado')
  }

  const handleFileImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImportCode(event.target.result)
      setTransferStatus('✅ Archivo cargado')
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!importCode.trim()) {
      setTransferStatus('❌ Selecciona un archivo o pega el código')
      return
    }
    try {
      const data = JSON.parse(atob(importCode.trim()))
      if (data.clientes) {
        localStorage.setItem('dvpro_clientes', JSON.stringify(data.clientes))
        if (data.pin) localStorage.setItem('dvpro_pin', data.pin)
        setClientes(data.clientes)
        setTransferStatus(`✅ Importados ${data.clientes.length} clientes`)
        setTimeout(() => {
          setShowTransfer(false)
          setImportCode('')
          setTransferStatus('')
        }, 1500)
      } else {
        setTransferStatus('❌ Formato inválido')
      }
    } catch (err) {
      setTransferStatus('❌ Error al importar')
    }
  }

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📁 DocVault <span style={{color:'#d946ef'}}>Pro</span></h1>
        <div style={{display:'flex', gap:'0.5rem'}}>
          <button style={styles.transferBtn} onClick={() => { setShowTransfer(true); setTransferMode('export'); handleExport(); }}>🔄</button>
          <button style={styles.lockBtn} onClick={() => router.push('/')}>🔒</button>
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.searchInput}
      />

      <div style={styles.clientList}>
        {filteredClientes.length === 0 ? (
          <div style={styles.empty}>
            <p style={{fontSize:'3rem',marginBottom:'1rem'}}>👥</p>
            <p style={{color:'#a0a0a0'}}>No hay clientes aún</p>
          </div>
        ) : (
          filteredClientes.map(cliente => {
            const status = getClienteStatus(cliente)
            return (
              <div 
                key={cliente.id} 
                style={styles.clientCard}
                onClick={() => router.push(`/clientes/${cliente.id}`)}
              >
                <div style={styles.clientAvatar}>
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={styles.clientInfo}>
                  <div style={styles.clientName}>{cliente.nombre}</div>
                  <div style={styles.clientMeta}>
                    📄 {status.total} docs
                    {status.vencidos > 0 && <span style={{color:'#ef4444', marginLeft:'0.5rem'}}>🔴 {status.vencidos} vencido{status.vencidos>1?'s':''}</span>}
                    {status.vencidos === 0 && status.porVencer > 0 && <span style={{color:'#eab308', marginLeft:'0.5rem'}}>⚠️ {status.porVencer} por vencer</span>}
                    {status.vencidos === 0 && status.porVencer === 0 && status.total > 0 && <span style={{color:'#22c55e', marginLeft:'0.5rem'}}>✅ Al día</span>}
                  </div>
                </div>
                <div style={styles.chevron}>›</div>
              </div>
            )
          })
        )}
      </div>

      <button style={styles.addBtn} onClick={() => setShowModal(true)}>
        + Nuevo Cliente
      </button>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>✨ Nuevo Cliente</h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre completo *</label>
              <input
                type="text"
                value={newCliente.nombre}
                onChange={(e) => setNewCliente({...newCliente, nombre: e.target.value})}
                style={styles.input}
                placeholder="Nombre del cliente"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Teléfono</label>
              <input
                type="tel"
                value={newCliente.telefono}
                onChange={(e) => setNewCliente({...newCliente, telefono: e.target.value})}
                style={styles.input}
                placeholder="+52 322 123 4567"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={newCliente.email}
                onChange={(e) => setNewCliente({...newCliente, email: e.target.value})}
                style={styles.input}
                placeholder="cliente@email.com"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Notas</label>
              <textarea
                value={newCliente.notas}
                onChange={(e) => setNewCliente({...newCliente, notas: e.target.value})}
                style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                placeholder="Notas adicionales..."
              />
            </div>
            
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button style={styles.saveBtn} onClick={handleAddCliente}>
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={styles.footer}>C19 Sage | Colmena 2026</footer>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '1rem',
    paddingBottom: '6rem',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 100%)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  title: { fontSize: '1.4rem' },
  lockBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer'
  },
  searchInput: {
    width: '100%',
    padding: '0.9rem 1rem',
    borderRadius: '12px',
    border: '1px solid #581c87',
    background: '#1f1035',
    color: '#fff',
    fontSize: '1rem',
    marginBottom: '1.5rem'
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 1rem'
  },
  clientCard: {
    background: '#1f1035',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  clientAvatar: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #d946ef, #581c87)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    fontWeight: 'bold'
  },
  clientInfo: { flex: 1 },
  clientName: { fontWeight: '600', marginBottom: '0.25rem' },
  clientMeta: { fontSize: '0.85rem', color: '#a0a0a0' },
  chevron: { fontSize: '1.5rem', color: '#581c87' },
  addBtn: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #d946ef, #c026d3)',
    border: 'none',
    borderRadius: '12px',
    padding: '1rem 2rem',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(217, 70, 239, 0.4)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    background: '#1f1035',
    borderRadius: '20px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#d946ef'
  },
  formGroup: { marginBottom: '1rem' },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#a0a0a0',
    fontSize: '0.9rem'
  },
  input: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '10px',
    border: '1px solid #581c87',
    background: '#0a0a0f',
    color: '#fff',
    fontSize: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  cancelBtn: {
    flex: 1,
    padding: '0.9rem',
    borderRadius: '10px',
    border: '1px solid #581c87',
    background: 'transparent',
    color: '#a0a0a0',
    cursor: 'pointer'
  },
  saveBtn: {
    flex: 1,
    padding: '0.9rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #d946ef, #c026d3)',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer'
  },
  footer: {
    textAlign: 'center',
    padding: '1rem',
    color: '#555',
    fontSize: '0.8rem'
  },
  transferBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    border: 'none',
    borderRadius: '10px',
    padding: '0.6rem 0.9rem',
    color: '#fff',
    fontSize: '1.1rem',
    cursor: 'pointer'
  },
  tabBtn: {
    flex: 1,
    padding: '0.7rem',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontWeight: '500',
    cursor: 'pointer'
  }
}
