import React, { useState, useEffect } from 'react';
// Importamos o teu sistema antigo (que renomeaste)
import SistemaMaquinas from './SistemaMaquinas'; 

// Importamos a autenticação que já tens
import { auth } from './firebaseConnection'; 
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

import './App.css'; 

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  
  // Estados para login de emergência (caso acessem direto)
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Verifica se já existe alguém logado (vindo do Portal)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  // Função para logar diretamente aqui, se necessário
  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      setErro("Erro ao acessar. Verifique se tem permissão.");
    }
  }

  if (carregando) {
    return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}>Carregando sistema...</div>;
  }

  // --- CENÁRIO 1: NÃO LOGADO (MOSTRA TELA DE BLOQUEIO) ---
  if (!usuario) {
    return (
      <div style={{
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f172a', // Fundo escuro igual ao portal
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: '#1e293b',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2 style={{marginBottom: '10px', color:'#38bdf8'}}>🔒 Acesso Restrito</h2>
          <p style={{color: '#94a3b8', marginBottom: '30px'}}>
            Você precisa acessar através do <strong>Portal Scamatti</strong>.
          </p>

          <a 
            href="https://portal-scamatti.vercel.app" 
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 0',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              marginBottom: '20px',
              cursor: 'pointer'
            }}
          >
            Ir para o Portal
          </a>

          <div style={{borderTop: '1px solid #334155', margin: '20px 0', position:'relative'}}>
            <span style={{position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', background:'#1e293b', padding:'0 10px', color:'#64748b', fontSize:'12px'}}>OU</span>
          </div>

          <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} onChange={e => setEmail(e.target.value)}
              style={{padding: '10px', borderRadius: '5px', border: 'none', outline:'none'}}
            />
            <input 
              type="password" 
              placeholder="Senha" 
              value={senha} onChange={e => setSenha(e.target.value)}
              style={{padding: '10px', borderRadius: '5px', border: 'none', outline:'none'}}
            />
            <button type="submit" style={{padding: '10px', background: '#475569', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>
              Entrar
            </button>
          </form>
          {erro && <p style={{color: '#ef4444', marginTop: '10px', fontSize:'0.9rem'}}>{erro}</p>}
        </div>
      </div>
    );
  }

  // --- CENÁRIO 2: LOGADO (MOSTRA O SISTEMA DE MÁQUINAS) ---
  return (
    <div className="sistema-container">
      {/* Aqui chamamos o teu componente antigo! */}
      <SistemaMaquinas /> 
    </div>
  );
}

export default App;