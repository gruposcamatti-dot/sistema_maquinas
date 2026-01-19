import React, { useState, useEffect } from 'react';
import SistemaMaquinas from './SistemaMaquinas'; // O seu componente principal
import { auth } from './firebaseConnection'; 
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mostrarLoginManual, setMostrarLoginManual] = useState(false); // Estado para controlar o formulário
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user ? user : null);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      setErro("Email ou senha incorretos.");
    }
  }

  if (carregando) {
    return <div style={{display:'flex', justifyContent:'center', padding:'50px', color:'white', background:'#0f172a', height:'100vh'}}>Carregando...</div>;
  }

  // --- TELA DE BLOQUEIO ---
  if (!usuario) {
    return (
      <div style={{
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0f172a', 
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: '#1e293b',
          padding: '40px', 
          borderRadius: '16px', 
          textAlign: 'center', 
          maxWidth: '400px', 
          width: '90%',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>🔒</div>
          <h2 style={{color: '#38bdf8', marginBottom: '10px'}}>Acesso Restrito</h2>
          
          {/* Se NÃO clicou no botão manual, mostra os botões iniciais */}
          {!mostrarLoginManual ? (
            <>
              <p style={{color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px'}}>
                Este sistema pertence à Plataforma Scamatti Hub.
              </p>

              {/* Botão 1: Voltar ao Portal */}
              <a href="https://portalscamattihub.web.app" style={{
                display: 'block', width: '100%', padding: '12px 0', 
                background: '#2563eb', color: 'white', textDecoration: 'none', 
                borderRadius: '8px', fontWeight: 'bold', marginBottom: '15px'
              }}>
                Voltar ao Portal
              </a>

              {/* Botão 2: O SALVADOR DA PÁTRIA - Validar Manualmente */}
              <button 
                onClick={() => setMostrarLoginManual(true)}
                style={{
                  background: 'transparent', border: '1px solid #64748b', 
                  color: '#cbd5e1', padding: '10px', width: '100%', 
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Validar Acesso Manualmente
              </button>
            </>
          ) : (
            /* Se clicou no botão manual, mostra o formulário */
            <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <p style={{marginBottom: '10px', fontSize: '0.9rem'}}>Insira suas credenciais para liberar este dispositivo:</p>
              <input 
                type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
                style={{padding: '12px', borderRadius: '6px', border: 'none', outline: 'none'}}
              />
              <input 
                type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)}
                style={{padding: '12px', borderRadius: '6px', border: 'none', outline: 'none'}}
              />
              <button type="submit" style={{padding: '12px', background: '#2563eb', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>
                Entrar
              </button>
              
              {erro && <span style={{color: '#ef4444', fontSize: '0.8rem'}}>{erro}</span>}
              
              <button type="button" onClick={() => setMostrarLoginManual(false)} style={{background: 'none', border: 'none', color: '#64748b', marginTop: '10px', cursor: 'pointer', textDecoration: 'underline'}}>
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sistema-container">
      <SistemaMaquinas /> 
    </div>
  );
}

export default App;