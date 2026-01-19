import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  Upload, 
  DollarSign, 
  PieChart, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Filter,
  Truck,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  X,
  Plus,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  Save,
  AlertTriangle,
  Tractor 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell 
} from 'recharts';

// --- IMPORTAÇÕES DO FIREBASE ---
import { db, auth } from './firebaseConnection';
import { 
  collection, 
  addDoc, 
  getDocs,
  onSnapshot, 
  query, 
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  limit,
  orderBy 
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#ea580c', '#c2410c', '#9a3412'];

// Utilitário de formatação de moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Componente: Card de Estatística (Design Moderno & Sombras Suaves)
const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between hover:translate-y-[-2px] transition-all duration-300">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <p className="text-xs font-medium text-slate-500">{trend}</p>
        </div>
      )}
    </div>
    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
      <Icon size={24} strokeWidth={2} />
    </div>
  </div>
);

// Componente Principal
export default function FechamentoMaquinas() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- ESTADOS DO FIREBASE ---
  const [machines, setMachines] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rawTxtContent, setRawTxtContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  // --- ESTADOS E LÓGICA PARA LANÇAMENTOS (NOVO) ---
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  // --- ESTADOS EXTRAS PARA ABA LANÇAMENTOS (ENTRADA/SAÍDA) ---
  const [lancamentosTab, setLancamentosTab] = useState('entrada'); // 'entrada' ou 'saida'
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingDetail, setViewingDetail] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // Dados lidos mas não salvos
  const [importType, setImportType] = useState(null); // 'entrada' ou 'saida'
  const [isSaving, setIsSaving] = useState(false);

  // Função Auxiliar: Formatar Data (Do TXT para YYYY-MM-DD)
  const parseDate = (rawDate) => {
    if (!rawDate) return '';
    // Tenta identificar se é DD/MM/AAAA ou AAAAMMDD ou DD.MM.AAAA
    const cleanDate = rawDate.replace(/[^0-9]/g, '');
    if (cleanDate.length === 8) {
      // Assume formato brasileiro DDMMAAAA se começar com dia provável
      const day = cleanDate.substring(0, 2);
      const month = cleanDate.substring(2, 4);
      const year = cleanDate.substring(4, 8);
      // Ou formato AAAAMMDD (comum em sistemas)
      if (parseInt(day) > 31) { // Provavelmente é ano
         return `${cleanDate.substring(0,4)}-${cleanDate.substring(4,6)}-${cleanDate.substring(6,8)}`;
      }
      return `${year}-${month}-${day}`;
    }
    return ''; // Falha
  };

  // Função para abrir o Modal de Detalhes (Nota Fiscal)
  const openDetailsModal = (expense) => {
    setViewingDetail(expense);
    setIsDetailsModalOpen(true);
  };
  
  // Filtros de Data
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1)); // Mês atual
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));   // Ano atual
  const [filterPeriod, setFilterPeriod] = useState('Mês');

  // Constantes para os Dropdowns
  const MONTHS = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ];
  const YEARS = ['2023', '2024', '2025', '2026'];
  const PERIODS = ['Mês', 'Trimestre', 'Semestre', 'Ano'];

  // Lógica de Filtragem Avançada
// --- AUXILIARES ---
  // Formatador de Moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  // NOVO: Formatador de Data (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateBR = (dateStr) => {
    if (!dateStr) return '-';
    // Se já estiver em BR, retorna. Se estiver em ISO (yyyy-mm-dd), converte.
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // --- LÓGICA DE FILTRAGEM AVANÇADA (CORRIGIDA) ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. FILTRO DE TIPO (CRUCIAL: Separa Entrada de Saída)
      if (exp.tipo !== lancamentosTab) return false;

      // 2. Filtro de Texto (Busca)
      const searchTerm = expenseSearch.toLowerCase();
      const matchesSearch = 
        (exp.descricao && exp.descricao.toLowerCase().includes(searchTerm)) ||
        (exp.materia && exp.materia.toLowerCase().includes(searchTerm)) ||
        (exp.frota && exp.frota.toLowerCase().includes(searchTerm)) ||
        (exp.classe && exp.classe.toLowerCase().includes(searchTerm));

      // 3. Filtro de Data
      let matchesDate = true;
      if (exp.data) {
        const dateParts = exp.data.includes('/') ? exp.data.split('/') : exp.data.split('-');
        const expDate = exp.data.includes('/') 
          ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
          : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        
        const expMonth = String(expDate.getMonth() + 1);
        const expYear = String(expDate.getFullYear());

        if (filterPeriod === 'Ano') {
          matchesDate = expYear === filterYear;
        } else if (filterPeriod === 'Mês') {
          matchesDate = expYear === filterYear && expMonth === filterMonth;
        } else {
           matchesDate = expYear === filterYear && expMonth === filterMonth; 
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [expenses, expenseSearch, filterMonth, filterYear, filterPeriod, lancamentosTab]); 

// --- LÓGICA DE SELEÇÃO, EXCLUSÃO E LIMPEZA (CORRIGIDA E COMPLETA) ---

  // 1. Limpar seleção automaticamente ao mudar de aba (Entrada <-> Saída)
  useEffect(() => {
    setSelectedExpenses([]);
  }, [lancamentosTab]);

  // 2. Função para Selecionar/Deselecionar UM item
  const toggleSelectExpense = (id) => {
    setSelectedExpenses(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 3. Função para Selecionar TODOS os itens visíveis
  const handleSelectAllExpenses = () => {
    // Verifica se todos os itens atualmente filtrados estão na lista de selecionados
    const allVisibleSelected = filteredExpenses.length > 0 && filteredExpenses.every(e => selectedExpenses.includes(e.id));

    if (allVisibleSelected) {
      // Se todos os visíveis já estão marcados, desmarca tudo
      setSelectedExpenses([]);
    } else {
      // Caso contrário, marca todos os que estão aparecendo na tela
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    }
  };

  // 4. Excluir UM item individualmente
  const handleDeleteExpense = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este lançamento permanentemente?")) {
      try {
        await deleteDoc(doc(db, "despesas", id));
        // O onSnapshot atualizará a lista visualmente, apenas removemos da seleção se estiver lá
        setSelectedExpenses(prev => prev.filter(itemId => itemId !== id));
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir o lançamento.");
      }
    }
  };

  // 5. Excluir Itens SELECIONADOS (Lote)
  const handleBulkDeleteExpenses = async () => {
    if (selectedExpenses.length === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir ${selectedExpenses.length} lançamentos selecionados?`)) {
      setIsSaving(true);
      try {
        const batch = writeBatch(db);
        
        selectedExpenses.forEach(id => {
          const docRef = doc(db, "despesas", id);
          batch.delete(docRef);
        });

        await batch.commit();
        
        setSelectedExpenses([]); // Limpa a seleção após o sucesso
        alert("Itens excluídos com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir em lote:", error);
        alert("Ocorreu um erro ao tentar excluir os itens.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // --- HANDLERS DE AÇÃO (NOVO LANÇAMENTO E EDIÇÃO) ---
  
  // 1. Abrir Modal (Funciona para Criar Novo ou Editar)
  const openExpenseModal = (expense = null) => {
    setEditingExpense(
      expense 
        ? { ...expense } 
        : { 
            // Se for novo, inicia com a data de hoje e campos vazios
            data: new Date().toISOString().split('T')[0], 
            frota: '', 
            descricao: '', 
            classe: '', 
            valor: '' 
          }
    );
    setIsExpenseModalOpen(true);
  };

  // 2. Salvar Lançamento Manual
  const handleSaveExpense = async () => {
    // Validação básica
    if (!editingExpense.frota || !editingExpense.valor) {
      alert("Preencha pelo menos Frota e Valor.");
      return;
    }

    setIsSaving(true);

    try {
      // Prepara os dados (converte string para número)
      const dataToSave = { 
        ...editingExpense, 
        valor: Number(editingExpense.valor),
        // Adiciona timestamp se for criação
        ...(!editingExpense.id && { criadoEm: new Date() })
      };

      if (editingExpense.id) {
        // MODO EDIÇÃO: Atualiza documento existente
        const docRef = doc(db, "despesas", editingExpense.id);
        await updateDoc(docRef, dataToSave);
      } else {
        // MODO CRIAÇÃO: Cria novo documento
        await addDoc(collection(db, "despesas"), dataToSave);
      }

      // Fecha o modal e limpa estado
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar lançamento: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. FUNÇÃO DE EMERGÊNCIA: LIMPAR TUDO (RESTAURADA)
  const handleWipeAllExpenses = async () => {
    if(!window.confirm("ATENÇÃO: Isso apagará TODOS os lançamentos do banco de dados. Continuar?")) return;
    const pwd = window.prompt("Digite DELETAR para confirmar:");
    if(pwd !== "DELETAR") return;

    setIsSaving(true);
    try {
      const q = query(collection(db, "despesas"), limit(500));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      alert("Lançamentos apagados (primeiros 500). Repita se houver mais.");
      setExpenses([]);
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- ESTADOS PARA TABELA DATABASE ---
// --- ESTADOS E LÓGICA PARA TABELA DATABASE (CORRIGIDO) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  // Filtro de Busca
  const filteredMachines = machines.filter(m => 
    (m.frota && m.frota.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.maquina && m.maquina.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Seleção
  const toggleSelectMachine = (id) => {
    setSelectedMachines(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMachines.length === filteredMachines.length) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(filteredMachines.map(m => m.id));
    }
  };

  // Excluir
  const handleDeleteMachine = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta máquina?")) {
      try {
        await deleteDoc(doc(db, "maquinas", id));
      } catch (error) {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir ${selectedMachines.length} máquinas?`)) {
      const batch = writeBatch(db);
      selectedMachines.forEach(id => {
        const docRef = doc(db, "maquinas", id);
        batch.delete(docRef);
      });
      await batch.commit();
      setSelectedMachines([]);
    }
  };

  // --- FUNÇÕES DE EDIÇÃO CORRIGIDAS ---
  
  // Abrir Modal
  const openEditModal = (machine) => {
    // Cria uma cópia do objeto para evitar erros de referência
    setEditingMachine({ ...machine });
    setIsEditModalOpen(true);
  };

  // Função genérica para atualizar os inputs
  const handleEditChange = (field, value) => {
    setEditingMachine(prev => ({ ...prev, [field]: value }));
  };

  // Salvar no Firebase
  const handleSaveEdit = async () => {
    if (!editingMachine || !editingMachine.id) return;

    try {
      const docRef = doc(db, "maquinas", editingMachine.id);
      await updateDoc(docRef, {
        frota: editingMachine.frota || '',
        maquina: editingMachine.maquina || '',
        tipo: editingMachine.tipo || '',
        localizacao: editingMachine.localizacao || '',
        segmento: editingMachine.segmento || ''
      });
      
      setIsEditModalOpen(false);
      setEditingMachine(null);
      alert("Máquina atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao salvar alterações.");
    }
  };

  // --- 1. AUTENTICAÇÃO ANÔNIMA ---
  useEffect(() => {
    // Tenta fazer login anônimo ao iniciar
    signInAnonymously(auth).catch((error) => {
      console.error("Erro ao entrar como anônimo:", error);
    });

    // Monitora o estado da autenticação
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Só carrega os dados depois de ter um usuário (mesmo que anônimo)
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 2. CARREGAMENTO DE DADOS (LISTENER EM TEMPO REAL) ---
  useEffect(() => {
    if (!user) return; // Aguarda a autenticação

    // Listener de Máquinas
    const maquinasRef = collection(db, "maquinas");
    const unsubMaquinas = onSnapshot(maquinasRef, (snapshot) => {
      let listaMaquinas = [];
      snapshot.forEach((doc) => {
        listaMaquinas.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMachines(listaMaquinas);
    });

    // Listener de Despesas
    const despesasRef = collection(db, "despesas");
    const q = query(despesasRef, orderBy("data", "desc"));
    const unsubDespesas = onSnapshot(q, (snapshot) => {
      let listaDespesas = [];
      snapshot.forEach((doc) => {
        listaDespesas.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setExpenses(listaDespesas);
      setLoading(false); // Remove o loading quando os dados chegam
    });

    return () => {
      unsubMaquinas();
      unsubDespesas();
    }
  }, [user]);
  
  // --- PROCESSAMENTO DE DADOS COM FILTRO DE DATA ---
  const processedData = useMemo(() => {
    // 1. Filtra as despesas baseadas no Período/Mês/Ano selecionados
    const dateFilteredExpenses = expenses.filter(exp => {
      // Importante: Para Dashboard e Fechamento, geralmente analisamos CUSTOS (Saídas)
      // Se quiser incluir entradas, remova a linha abaixo.
      if (exp.tipo !== 'saida') return false; 

      if (!exp.data) return false;

      // Tratamento de data robusto
      const dateParts = exp.data.includes('/') ? exp.data.split('/') : exp.data.split('-');
      // Reconstrói data objeto (assumindo YYYY-MM-DD ou DD/MM/YYYY)
      const expDate = exp.data.includes('/') 
          ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
          : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

      const expMonth = String(expDate.getMonth() + 1);
      const expYear = String(expDate.getFullYear());

      // Lógica de Período
      if (filterPeriod === 'Ano') {
        return expYear === filterYear;
      } else {
        // Mês, Trimestre (simplificado como mês individual por enquanto)
        return expYear === filterYear && expMonth === filterMonth;
      }
    });

    // 2. Enriquece os dados (Adiciona nome da máquina, etc.)
    const enrichedExpenses = dateFilteredExpenses.map(exp => {
      const machine = machines.find(m => m.frota === exp.frota);
      return {
        ...exp,
        maquinaNome: machine ? machine.maquina : 'Máquina não encontrada',
        segmento: machine ? machine.segmento : 'Indefinido',
        localizacao: machine ? machine.localizacao : 'Indefinido',
        tipo: machine ? machine.tipo : 'Indefinido'
      };
    });

    // 3. Cálculos Totais
    const totalCusto = enrichedExpenses.reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    // 4. Agrupamento por Segmento
    const custoPorSegmento = enrichedExpenses.reduce((acc, curr) => {
      const seg = curr.segmento || 'Geral';
      acc[seg] = (acc[seg] || 0) + (curr.valor || 0);
      return acc;
    }, {});
    
    const chartDataSegmento = Object.keys(custoPorSegmento).map(key => ({
      name: key,
      value: custoPorSegmento[key]
    }));

    // 5. Agrupamento por Máquina (Top 5)
    const custoPorMaquina = enrichedExpenses.reduce((acc, curr) => {
      const nome = curr.frota + ' - ' + (curr.maquinaNome || '');
      acc[nome] = (acc[nome] || 0) + (curr.valor || 0);
      return acc;
    }, {});

    const chartDataMaquina = Object.keys(custoPorMaquina)
      .map(key => ({ name: key, custo: custoPorMaquina[key] }))
      .sort((a, b) => b.custo - a.custo) // Ordena do maior para menor
      .slice(0, 5); // Pega top 5

    return { enrichedExpenses, totalCusto, chartDataSegmento, chartDataMaquina };
  }, [machines, expenses, filterMonth, filterYear, filterPeriod]);

// --- HANDLER DE IMPORTAÇÃO CSV (ATUALIZADO PARA O PADRÃO BR) ---
  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        // Divide por quebra de linha (suporta Windows \r\n e Unix \n)
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        let count = 0;
        
        // Pular cabeçalho (slice 1) e processar as linhas de dados
        const promises = lines.slice(1).map(async (line) => {
          // Detecta separador: Se tiver ponto e vírgula usa ele, senão usa vírgula
          const separator = line.includes(';') ? ';' : ',';
          
          // Divide a linha e limpa espaços ou aspas extras de cada campo
          const cols = line.split(separator).map(c => c ? c.trim().replace(/^"|"$/g, '') : '');

          // Mapeamento EXATO da ordem solicitada:
          // 0: Frota | 1: Máquina | 2: Tipo | 3: Localização | 4: Segmento
          const [frota, maquina, tipo, localizacao, segmento] = cols;

          // Só salva se tiver pelo menos o código da frota
          if (frota && frota !== '') {
            await addDoc(collection(db, "maquinas"), {
              frota: frota,
              maquina: maquina || 'Sem nome',
              tipo: tipo || 'Outros',
              localizacao: localizacao || 'Não informada',
              segmento: segmento || 'Geral'
            });
            count++;
          }
        });

        await Promise.all(promises);
        alert(`${count} máquinas importadas com sucesso! (Atualize a página se necessário)`);
      };
      reader.readAsText(file); // Lê como texto padrão
    }
  };

// --- IMPORTADOR INTELIGENTE (COM REMOÇÃO DE ZEROS E CORREÇÃO DE COLUNAS) ---
  const handleSmartImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportPreview(null);
    setImportType(null);

    // Lista de frotas conhecidas (banco de dados)
    const knownFleets = machines.map(m => m.frota ? m.frota.trim().toUpperCase() : '');

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target.result;

      // 1. Parser (Mantido igual)
      const parseCustomCSV = (content) => {
        const rows = [];
        let currentRow = [];
        let curField = "";
        let insideQuote = false;
        for (let i = 0; i < content.length; i++) {
          const char = content[i];
          if (char === '"') {
            if (insideQuote && content[i+1] === '"') { curField += '"'; i++; } 
            else { insideQuote = !insideQuote; }
          } 
          else if (char === ';' && !insideQuote) { currentRow.push(curField); curField = ""; } 
          else if ((char === '\n' || char === '\r') && !insideQuote) {
            if (char === '\r' && content[i+1] === '\n') i++;
            if (currentRow.length > 0 || curField.length > 0) {
              currentRow.push(curField);
              rows.push(currentRow);
              currentRow = [];
              curField = "";
            }
          } 
          else {
            if ((char === '\n' || char === '\r') && insideQuote) { curField += " "; } 
            else { curField += char; }
          }
        }
        return rows;
      };

      const parsedRows = parseCustomCSV(rawText);

      // 2. Cabeçalho
      let headerRowIndex = -1;
      let headers = [];

      for(let i=0; i < parsedRows.length && i < 50; i++) {
         const rowStr = parsedRows[i].join(' ').toUpperCase();
         if (rowStr.includes('PRGER-CCUS') || rowStr.includes('DET01-QUEBRA')) {
            headerRowIndex = i;
            headers = parsedRows[i].map(c => c.trim().toUpperCase().replace(/["']/g, ''));
            break;
         }
      }

      if (headerRowIndex === -1) {
        alert("Cabeçalho não identificado. Verifique o arquivo.");
        return;
      }

      // 3. Auxiliares
      const getIdx = (colName) => headers.findIndex(h => h === colName);
      const cleanStr = (val) => val ? val.trim().replace(/^"|"$/g, '') : '';
      
      const parseTxtNumber = (valStr, divisor) => {
        if (!valStr) return 0;
        const cleanNum = valStr.replace(/[^\d-]/g, '');
        const number = parseFloat(cleanNum);
        if (isNaN(number)) return 0;
        return Math.abs(number) / divisor; 
      };

      const parseDateTxt = (dateStr) => {
        if (!dateStr || dateStr.trim() === '') return null;
        let cleanDate = dateStr.replace(/[^0-9]/g, '');
        if (cleanDate.length === 8) {
           if (cleanDate.startsWith('202') || cleanDate.startsWith('201')) {
              return `${cleanDate.substring(0,4)}-${cleanDate.substring(4,6)}-${cleanDate.substring(6,8)}`;
           } else {
              return `${cleanDate.substring(4,8)}-${cleanDate.substring(2,4)}-${cleanDate.substring(0,2)}`;
           }
        }
        return '';
      };

      // 4. Processamento
      let detectedType = '';
      let processedData = [];

      // --- TIPO ENTRADA (SAE134) ---
      if (getIdx('PRENT-TOTA') !== -1 || getIdx('PRGER-NFOR') !== -1) {
        detectedType = 'entrada';
        processedData = parsedRows.slice(headerRowIndex + 1).map((cols, index) => {
           if (cols.length < 5) return null;

           let rawDate = cleanStr(cols[getIdx('PRGER-LCTO')]);
           const rawEmissao = cleanStr(cols[getIdx('PRGER-EMIS')]);
           if (!rawDate || rawDate === '') rawDate = rawEmissao;

           let rawDesc = cleanStr(cols[getIdx('PR-SORT')]);
           if (rawDesc.match(/^0+$/) || rawDesc === '') rawDesc = "Lançamento SAF";

           const valStr = cleanStr(cols[getIdx('PRENT-TOTA')]);
           const valorFinal = parseTxtNumber(valStr, 100);

           let frota = cleanStr(cols[getIdx('PRGER-CCUS')]);
           if (!frota) return null;
           frota = frota.replace(/^0+/, ''); // Remove zeros à esquerda (00123 -> 123)

           const unknownFleet = !knownFleets.includes(frota.toUpperCase());

           return {
             idTemp: index,
             tipo: 'entrada',
             frota: frota,
             unknownFleet: unknownFleet,
             data: parseDateTxt(rawDate),
             dataEmissao: parseDateTxt(rawEmissao),
             fornecedorNome: cleanStr(cols[getIdx('PRGER-NFOR')]), // Fornecedor Real
             fornecedorCod: cleanStr(cols[getIdx('PRGPR-FORN')]),
             classe: cleanStr(cols[getIdx('PRGER-NPLC')]),
             valor: valorFinal,
             descricao: rawDesc, // Descrição do Serviço
             empresa: cleanStr(cols[getIdx('PREMP-CODI')]),
             fiscal: cleanStr(cols[getIdx('PRGER-NFIS')]),
             notaFiscal: cleanStr(cols[getIdx('PRGER-NOTA')]),
             especie: cleanStr(cols[getIdx('PRENT-ESPE')]),
             ordemCompra: cleanStr(cols[getIdx('PRENT-ORDE')])
           };
        }).filter(Boolean);

      // --- TIPO SAÍDA (SAE127) ---
      } else if (getIdx('DET01-QUEBRA') !== -1 || getIdx('PRGER-TTEN') !== -1) {
        detectedType = 'saida';
        processedData = parsedRows.slice(headerRowIndex + 1).map((cols, index) => {
           if (cols.length < 5) return null;

           let frota = cleanStr(cols[getIdx('DET01-QUEBRA')]);
           if (!frota) return null;
           frota = frota.replace(/^0+/, ''); // Remove zeros à esquerda

           const unknownFleet = !knownFleets.includes(frota.toUpperCase());

           const rawDate = cleanStr(cols[getIdx('PRGER-DATA')]);
           const valTotalStr = cleanStr(cols[getIdx('PRGER-TTEN')]);
           const valorTotal = parseTxtNumber(valTotalStr, 1000);
           const qtdStr = cleanStr(cols[getIdx('PRGER-QTDES')]);
           const quantidade = parseTxtNumber(qtdStr, 1000);
           const valEntradaStr = cleanStr(cols[getIdx('PRGER-VREN')]);
           const valorEntrada = parseTxtNumber(valEntradaStr, 1000);

           // Correção de Descrição e Fornecedor
           const descMateria = cleanStr(cols[getIdx('PRMAT-NOME')]);

           return {
             idTemp: index,
             tipo: 'saida',
             frota: frota,
             unknownFleet: unknownFleet,
             data: parseDateTxt(rawDate),
             fornecedorNome: "Movimentação de Estoque", // Fixo conforme pedido
             classe: "Peças",
             valor: valorTotal,
             materia: descMateria,
             descricao: descMateria, // A descrição DEVE ser a matéria
             empresa: cleanStr(cols[getIdx('PRGER-EMPR')]),
             codLancamento: cleanStr(cols[getIdx('PRGER-CODI')]),
             quantidade: quantidade,
             valorEntrada: valorEntrada,
             codMateria: cleanStr(cols[getIdx('PRMAT-CODI')]),
             recebedor: cleanStr(cols[getIdx('PRGER-RECE')]),
             almoxarifado: cleanStr(cols[getIdx('PRGER-NALM')])
           };
        }).filter(Boolean);
      } else {
        alert("Layout não reconhecido.");
        return;
      }

      setImportType(detectedType);
      
      if (processedData.length > 0) {
        setImportPreview(processedData);
      } else {
        alert("Nenhum dado válido encontrado.");
      }
    };
    reader.readAsText(file);
  };

// --- FUNÇÃO DE SALVAR BLINDADA (CORRIGE O CARREGAMENTO ETERNO) ---
  const saveImportedData = async () => {
    if (!importPreview || importPreview.length === 0) {
      alert("Nenhum dado para salvar.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Limpeza Profunda (Deep Clean)
      // O Firebase trava se receber 'undefined'. Esta técnica remove qualquer campo indefinido.
      const cleanData = importPreview.map(item => {
        // Remove o ID temporário
        const { idTemp, ...rest } = item;
        
        // Copia o objeto garantindo que não existam referências de memória quebradas
        const sanitized = JSON.parse(JSON.stringify(rest));
        
        // Garante valores padrão para campos cruciais (evita NaN)
        return {
          ...sanitized,
          valor: Number(sanitized.valor) || 0,
          quantidade: sanitized.quantidade ? Number(sanitized.quantidade) : 0,
          valorEntrada: sanitized.valorEntrada ? Number(sanitized.valorEntrada) : 0,
          criadoEm: new Date(), // Data do sistema
          dataImportacao: new Date().toISOString()
        };
      });

      // 2. Processamento em Lotes (Batch) para não sobrecarregar
      const batchSize = 100; // Tamanho seguro
      const totalItems = cleanData.length;
      let batchesCommitted = 0;

      // Divide em pedaços e salva
      for (let i = 0; i < totalItems; i += batchSize) {
        const chunk = cleanData.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach((data) => {
          const docRef = doc(collection(db, "despesas")); // Cria ID automático
          batch.set(docRef, data);
        });

        // Envia o lote
        await batch.commit();
        batchesCommitted++;
        
        // Pequena pausa técnica para liberar o processador do navegador
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 3. Sucesso
      alert(`Sucesso! ${totalItems} registros salvos em ${batchesCommitted} lotes.`);
      
      // Limpa e Redireciona
      const tipoParaRedirecionar = importType || 'entrada';
      setImportPreview(null);
      setImportType(null);
      setLancamentosTab(tipoParaRedirecionar); 
      setActiveMenu('lancamentos');

    } catch (error) {
      console.error("ERRO CRÍTICO AO SALVAR:", error);
      alert(`Erro ao salvar: ${error.message}. Verifique o console (F12) para detalhes.`);
    } finally {
      setIsSaving(false); // Destrava o botão aconteça o que acontecer
    }
  };

// --- FUNÇÃO RECUPERADA: CANCELAR IMPORTAÇÃO ---
  const cancelImport = () => {
    setImportPreview(null);
    setImportType(null);
    // Limpa o input de arquivo para permitir selecionar o mesmo arquivo novamente se necessário
    const fileInput = document.getElementById('csv-upload');
    if (fileInput) fileInput.value = ''; 
  };
  // Renderização do Conteúdo (ESTRUTURA COMPLETA MANTIDA)
  const renderContent = () => {
    // Se ainda estiver carregando a autenticação ou os dados iniciais
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="mb-4 inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent h-8 w-8 text-orange-600"></div>
            <p>Conectando ao banco de dados...</p>
          </div>
        </div>
      );
    }

    switch(activeMenu) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fadeIn">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Gerencial</h2>
                <p className="text-slate-500">Visão geral dos custos operacionais (Saídas)</p>
              </div>
              
              {/* ÁREA DE FILTROS DO DASHBOARD */}
              <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <select 
                  value={filterPeriod} 
                  onChange={(e) => setFilterPeriod(e.target.value)} 
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 border-transparent hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 outline-none cursor-pointer"
                >
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {filterPeriod !== 'Ano' && (
                  <select 
                    value={filterMonth} 
                    onChange={(e) => setFilterMonth(e.target.value)} 
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 border-transparent hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 outline-none cursor-pointer"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                )}

                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)} 
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 border-transparent hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 outline-none cursor-pointer"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </header>

            {/* KPI Cards (Agora reagem aos filtros) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Custo Total (Período)" value={formatCurrency(processedData.totalCusto)} icon={DollarSign} trend="Baseado em Saídas" />
              <StatCard title="Máquinas na Base" value={machines.length} icon={Truck} />
              <StatCard title="Lançamentos Filtrados" value={processedData.enrichedExpenses.length} icon={FileText} />
              <StatCard title="Média por Máquina" value={formatCurrency(processedData.totalCusto / (machines.length || 1))} icon={PieChart} />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Máquinas (Maior Custo)</h3>
                <div className="h-64">
                  {processedData.chartDataMaquina.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.chartDataMaquina} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                        <Bar dataKey="custo" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados neste período</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Custo por Segmento</h3>
                <div className="h-64 flex justify-center items-center">
                  {processedData.chartDataSegmento.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={processedData.chartDataSegmento}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {processedData.chartDataSegmento.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados neste período</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'database':
        return (
          <>
            <div className="space-y-6 animate-fadeIn">
              {/* CABEÇALHO MODERNO */}
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pb-2">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Base de Dados</h2>
                  <p className="text-slate-500 font-medium mt-1">Gestão de frota e equipamentos</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedMachines.length > 0 && (
                    <button 
                      onClick={handleBulkDelete}
                      className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm"
                    >
                      <Trash2 size={18} /> Excluir ({selectedMachines.length})
                    </button>
                  )}
                  
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCSVImport}
                      className="hidden" 
                      id="csv-upload"
                    />
                    <label 
                      htmlFor="csv-upload"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-slate-900/20 group-hover:translate-y-[-1px]"
                    >
                      <Upload size={18} /> Importar CSV
                    </label>
                  </div>
                </div>
              </div>

              {/* CARD DA TABELA (COM SOMBRAS SUAVES E BORDAS ARREDONDADAS) */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                
                {/* Barra de Filtros */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Buscar máquina, frota ou tipo..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-4 py-2.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all" 
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    Total: <span className="text-slate-700">{filteredMachines.length}</span>
                  </div>
                </div>

                {/* Tabela Moderna */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 w-4">
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAll}
                            checked={filteredMachines.length > 0 && selectedMachines.length === filteredMachines.length}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4 tracking-wider">Frota</th>
                        <th className="px-6 py-4 tracking-wider">Máquina</th>
                        <th className="px-6 py-4 tracking-wider">Tipo</th>
                        <th className="px-6 py-4 tracking-wider">Localização</th>
                        <th className="px-6 py-4 tracking-wider">Segmento</th>
                        <th className="px-6 py-4 text-right tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredMachines.length > 0 ? (
                        filteredMachines.map((m) => (
                          <tr key={m.id} className={`group hover:bg-orange-50/30 transition-colors ${selectedMachines.includes(m.id) ? 'bg-orange-50/60' : ''}`}>
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedMachines.includes(m.id)}
                                onChange={() => toggleSelectMachine(m.id)}
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover:bg-white group-hover:border-orange-200 transition-colors">
                                {m.frota}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">{m.maquina}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {m.tipo}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{m.localizacao}</td>
                            <td className="px-6 py-4 text-slate-500">{m.segmento}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openEditModal(m)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                                  title="Editar"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteMachine(m.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-slate-400 bg-slate-50/30">
                            <div className="flex flex-col items-center gap-2">
                              <Search size={32} className="text-slate-300" />
                              <p>Nenhum registro encontrado.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* MODAL MANTIDO IGUAL AO QUE JÁ FUNCIONA (Código abreviado aqui, mantém o que já tinhas do passo anterior) */}
            {isEditModalOpen && editingMachine && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                 {/* ... Mantém o conteúdo do modal que te passei na resposta anterior, pois ele já funciona ... */}
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Edit size={20} className="text-orange-600" /> Editar Máquina
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/50">
                      {/* Inputs com design arredondado */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Frota</label>
                          <input value={editingMachine.frota || ''} onChange={(e) => handleEditChange('frota', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-bold text-slate-700 bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo</label>
                          <input value={editingMachine.tipo || ''} onChange={(e) => handleEditChange('tipo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nome da Máquina</label>
                        <input value={editingMachine.maquina || ''} onChange={(e) => handleEditChange('maquina', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Localização</label>
                            <input value={editingMachine.localizacao || ''} onChange={(e) => handleEditChange('localizacao', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Segmento</label>
                            <input value={editingMachine.segmento || ''} onChange={(e) => handleEditChange('segmento', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" />
                         </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                      <button onClick={handleSaveEdit} className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:translate-y-[-1px]">Salvar Alterações</button>
                    </div>
                 </div>
              </div>
            )}
          </>
        );
case 'import':
        // Cálculo de resumo de frotas desconhecidas
        const unknownFleetsList = importPreview 
          ? [...new Set(importPreview.filter(i => i.unknownFleet).map(i => i.frota))].sort() 
          : [];

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* TELA DE UPLOAD (Se não tiver preview) */}
            {!importPreview ? (
              <div className="max-w-2xl mx-auto text-center mt-12">
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-100">
                  <FileText size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-3">Importação Inteligente</h2>
                <p className="text-slate-500 mb-10 text-lg">
                  O sistema detecta automaticamente SAE134 (Entrada) e SAE127 (Saída).
                </p>
                
                <div className="border-4 border-dashed border-slate-200 rounded-3xl p-16 bg-white hover:bg-orange-50/50 hover:border-orange-300 transition-all cursor-pointer relative group shadow-sm">
                  <input 
                    type="file" 
                    accept=".txt,.csv" 
                    onChange={handleSmartImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                    <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                      <Upload className="w-10 h-10 text-slate-400 group-hover:text-orange-600" />
                    </div>
                    <p className="text-slate-700 font-bold text-lg">Clique ou arraste o arquivo TXT aqui</p>
                    <p className="text-sm text-slate-400 mt-2">Relatórios SAE134 ou SAE127</p>
                  </div>
                </div>
              </div>
            ) : (
              // TELA DE PREVIEW E CONFIRMAÇÃO
              <div className="animate-fadeIn">
                <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <CheckCircle className="text-green-500" /> Pré-visualização de Importação
                    </h2>
                    <p className="text-slate-500 mt-1">
                      Detectamos <strong className="uppercase text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-xs tracking-wider">{importType}</strong> com <strong>{importPreview.length}</strong> registros.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={cancelImport}
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={saveImportedData}
                      disabled={isSaving}
                      className={`px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg 
                        ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:translate-y-[-2px] shadow-green-600/20'}
                      `}
                    >
                      {isSaving ? 'Salvando...' : <><Save size={20} /> Confirmar e Salvar</>}
                    </button>
                  </div>
                </header>
                
                {/* ALERTA DE FROTAS NÃO CADASTRADAS (NOVO) */}
                {unknownFleetsList.length > 0 && (
                  <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <div className="bg-amber-100 text-amber-600 p-2 rounded-lg h-fit">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">
                        Atenção: {unknownFleetsList.length} Frotas não identificadas
                      </h4>
                      <p className="text-sm text-amber-700 mb-2">
                        As seguintes frotas encontradas no arquivo não estão cadastradas na sua Base de Dados. 
                        Os lançamentos serão salvos, mas você deve cadastrar essas máquinas depois.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unknownFleetsList.map(frota => (
                          <span key={frota} className="bg-white border border-amber-200 text-amber-800 px-2 py-1 rounded text-xs font-bold font-mono">
                            {frota}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Frota</th>
                          <th className="px-6 py-3">
                            {importType === 'entrada' ? 'Fornecedor / Descrição' : 'Matéria / Descrição'}
                          </th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {importPreview.slice(0, 100).map((item, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50 ${item.unknownFleet ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-6 py-3 whitespace-nowrap">{item.data}</td>
                            
                            {/* COLUNA FROTA COM ALERTA */}
                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className={`font-bold ${item.unknownFleet ? 'text-amber-700' : 'text-slate-700'}`}>
                                  {item.frota}
                                </span>
                                {item.unknownFleet && (
                                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                                    Não Cadastrada
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">
                                  {importType === 'entrada' ? item.fornecedorNome : item.materia}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {importType === 'entrada' ? item.descricao : 'Mov. Estoque'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 font-bold text-slate-800">
                              {formatCurrency(item.valor)}
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-400">
                              {importType === 'entrada' 
                                ? `NF: ${item.notaFiscal || '-'} | OC: ${item.ordemCompra || '-'}`
                                : `Qtd: ${item.quantidade} | Almox: ${item.almoxarifado}`
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 100 && (
                      <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 border-t border-slate-100">
                        Exibindo os primeiros 100 de {importPreview.length} registros...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'lancamentos':
        return (
          <>
            <div className="space-y-6 animate-fadeIn">
              
              {/* HEADER E BOTÕES DE TIPO (ENTRADA / SAÍDA) */}
{/* HEADER E BOTÕES DE TIPO (ENTRADA / SAÍDA) */}
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Lançamentos</h2>
                  <p className="text-slate-500 font-medium mt-1">Gestão de {lancamentosTab === 'entrada' ? 'Entradas (Compras)' : 'Saídas (Consumo)'}</p>
                </div>
                
                <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
                  <button 
                    onClick={() => setLancamentosTab('entrada')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${lancamentosTab === 'entrada' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <ArrowDownCircle size={18} /> Entradas
                  </button>
                  <button 
                    onClick={() => setLancamentosTab('saida')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${lancamentosTab === 'saida' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <ArrowUpCircle size={18} /> Saídas
                  </button>
                </div>

                <div className="flex gap-2">
                  {/* BOTÃO DE EMERGÊNCIA - SÓ APARECE SE TIVER DADOS */}
                  {expenses.length > 0 && (
                    <button 
                      onClick={handleWipeAllExpenses}
                      disabled={isSaving}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-red-200"
                      title="Apagar todo o banco de dados de lançamentos"
                    >
                      {isSaving ? 'Limpando...' : <><Trash2 size={20} /> Limpar Tudo</>}
                    </button>
                  )}

                  <button 
                    onClick={() => openExpenseModal(null)}
                    disabled={isSaving}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all hover:translate-y-[-2px]"
                  >
                    <Plus size={20} strokeWidth={3} /> Novo Lançamento
                  </button>
                </div>
              </div>

              {/* CARD DE FILTROS (MANTIDO) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Período</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="pl-9 pr-4 py-2 w-full md:w-32 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20">
                      {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                {filterPeriod !== 'Ano' && (
                  <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mês</label>
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-4 py-2 w-full md:w-40 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20">
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ano</label>
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-4 py-2 w-full md:w-28 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Pesquisar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Buscar..." value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"/>
                  </div>
                </div>
              </div>

              {/* BOTÃO EXCLUIR EM LOTE */}
              {selectedExpenses.length > 0 && (
                <div className="flex justify-end animate-fadeIn">
                   <button onClick={handleBulkDeleteExpenses} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200">
                      <Trash2 size={16} /> Excluir Selecionados ({selectedExpenses.length})
                    </button>
                </div>
              )}

              {/* TABELA DINÂMICA (ENTRADA vs SAÍDA) */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                 <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    {/* CABEÇALHO DA TABELA */}
                    <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50/80 border-b border-slate-100">
                       <tr>
                        <th className="px-6 py-4 w-4">
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAllExpenses}
                            checked={filteredExpenses.length > 0 && selectedExpenses.length === filteredExpenses.length}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4 tracking-wider">Data</th>
                        <th className="px-6 py-4 tracking-wider">Frota</th>
                        
                        {/* Colunas Dinâmicas (Entrada vs Saída) */}
                        {lancamentosTab === 'entrada' ? (
                          <th className="px-6 py-4 tracking-wider">Descrição</th>
                        ) : (
                          <>
                            <th className="px-6 py-4 tracking-wider">Matéria</th>
                            <th className="px-6 py-4 tracking-wider">Qtd</th>
                          </>
                        )}
                        
                        <th className="px-6 py-4 tracking-wider">Classe</th>
                        <th className="px-6 py-4 text-right tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-center tracking-wider">Ações</th>
                      </tr>
                    </thead>

                    {/* CORPO DA TABELA */}
                    <tbody className="divide-y divide-slate-50">
                      {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((exp) => (
                          <tr key={exp.id} className={`hover:bg-orange-50/30 transition-colors ${selectedExpenses.includes(exp.id) ? 'bg-orange-50/60' : ''}`}>
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedExpenses.includes(exp.id)} 
                                onChange={() => toggleSelectExpense(exp.id)} 
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400"/> {formatDateBR(exp.data)}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">{exp.frota}</td>
                            
                            {lancamentosTab === 'entrada' ? (
                               <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={exp.descricao}>{exp.descricao}</td>
                            ) : (
                               <>
                                 <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={exp.materia}>{exp.materia || exp.descricao}</td>
                                 <td className="px-6 py-4 text-slate-600">{exp.quantidade || 1}</td>
                               </>
                            )}

                            <td className="px-6 py-4">
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200">
                                  {exp.classe || exp.categoria || 'Geral'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(exp.valor)}</td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openDetailsModal(exp)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Ver Detalhes">
                                  <FileText size={16}/>
                                </button>
                                <button onClick={() => openExpenseModal(exp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                  <Edit size={16}/>
                                </button>
                                <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan="8" className="px-6 py-12 text-center text-slate-400 bg-slate-50/30">
                              <p className="font-medium">Nenhum lançamento de {lancamentosTab.toUpperCase()} encontrado neste período.</p>
                           </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* MODAL DE DETALHES (NOTA FISCAL) */}
            {isDetailsModalOpen && viewingDetail && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <FileText size={22} className="text-orange-600"/> Detalhes do Lançamento
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide font-bold">
                           Tipo: {lancamentosTab === 'entrada' ? 'Entrada (Nota Fiscal)' : 'Saída (Requisição)'}
                        </p>
                      </div>
                      <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full"><X size={20} /></button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto bg-white">
                      {/* LAYOUT DE ENTRADA */}
                      {lancamentosTab === 'entrada' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Data Lançamento</p><p className="font-bold text-slate-800">{viewingDetail.data || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Data Emissão</p><p className="font-medium text-slate-700">{viewingDetail.dataEmissao || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Nota Fiscal</p><p className="font-bold text-orange-600 text-lg">{viewingDetail.notaFiscal || '-'}</p></div>
                           
                           <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Empresa</p><p className="font-medium text-slate-700">{viewingDetail.empresa || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Espécie</p><p className="font-medium text-slate-700">{viewingDetail.especie || '-'}</p></div>
                           
                           <div className="col-span-3 h-px bg-slate-100 my-2"></div>
                           
                           <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Fornecedor</p><p className="font-bold text-slate-800">{viewingDetail.fornecedorNome || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Cód. Fornecedor</p><p className="font-medium text-slate-700">{viewingDetail.fornecedorCod || '-'}</p></div>
                           
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Fiscal</p><p className="font-medium text-slate-700">{viewingDetail.fiscal || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Classe</p><span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-sm font-bold">{viewingDetail.classe || '-'}</span></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Ordem Compra</p><p className="font-medium text-slate-700">{viewingDetail.ordemCompra || '-'}</p></div>
                        </div>
                      )}

                      {/* LAYOUT DE SAÍDA */}
                      {lancamentosTab === 'saida' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Data</p><p className="font-bold text-slate-800">{viewingDetail.data || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Cód. Lançamento</p><p className="font-medium text-slate-700">{viewingDetail.codLancamento || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Empresa</p><p className="font-medium text-slate-700">{viewingDetail.empresa || '-'}</p></div>

                           <div className="col-span-3 h-px bg-slate-100 my-2"></div>

                           <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Matéria / Descrição</p><p className="font-bold text-slate-800 text-lg">{viewingDetail.materia || viewingDetail.descricao || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Cód. Matéria</p><p className="font-medium text-slate-700">{viewingDetail.codMateria || '-'}</p></div>

                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Quantidade</p><p className="font-bold text-slate-800">{viewingDetail.quantidade || '-'}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Valor Entrada</p><p className="font-medium text-slate-700">{formatCurrency(viewingDetail.valorEntrada || 0)}</p></div>
                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Valor Total</p><p className="font-bold text-red-600 text-lg">{formatCurrency(viewingDetail.valor || 0)}</p></div>

                           <div className="col-span-3 h-px bg-slate-100 my-2"></div>

                           <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Recebedor</p><p className="font-medium text-slate-700">{viewingDetail.recebedor || '-'}</p></div>
                           <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Almoxarifado</p><p className="font-medium text-slate-700">{viewingDetail.almoxarifado || '-'}</p></div>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setIsDetailsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors">Fechar Detalhes</button>
                    </div>
                 </div>
              </div>
            )}

            {/* MODAL DE EDIÇÃO MANTIDO (CÓDIGO ANTERIOR) */}
            {isExpenseModalOpen && editingExpense && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{editingExpense.id ? <Edit size={20} className="text-orange-600"/> : <Plus size={20} className="text-orange-600"/>} {editingExpense.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                      <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Data</label><input type="date" value={editingExpense.data} onChange={(e) => setEditingExpense({...editingExpense, data: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Frota</label><input type="text" placeholder="Ex: TR-01" value={editingExpense.frota} onChange={(e) => setEditingExpense({...editingExpense, frota: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium" /></div>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Descrição / Matéria</label><input type="text" value={editingExpense.descricao || editingExpense.materia} onChange={(e) => setEditingExpense({...editingExpense, descricao: e.target.value, materia: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Classe</label><input type="text" value={editingExpense.classe || editingExpense.categoria || ''} onChange={(e) => setEditingExpense({...editingExpense, classe: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor (R$)</label><input type="number" step="0.01" value={editingExpense.valor} onChange={(e) => setEditingExpense({...editingExpense, valor: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-800" /></div>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsExpenseModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                      <button onClick={handleSaveExpense} className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg shadow-orange-600/20">Salvar</button>
                    </div>
                 </div>
              </div>
            )}
          </>
        );
case 'fechamento':
        // Preparação dos dados para a Tabela Mestra
        const fechamentoData = machines.map(m => {
          // Valores Placeholder (Zerados para layout)
          const horasTrabalhadas = 0;
          const litrosAbastecidos = 0;
          
          const vlrCombustivel = 0;
          const vlrManutencao = 0;
          const vlrMO = 0;
          const vlrPneus = 0;
          const vlrFixas = 0;
          const vlrGerais = 0;

          // Cálculos
          const mediaLitrosHora = horasTrabalhadas > 0 ? litrosAbastecidos / horasTrabalhadas : 0;
          const totalManutencao = vlrManutencao + vlrMO + vlrPneus;
          const totalDespesas = vlrCombustivel + totalManutencao + vlrFixas + vlrGerais;
          
          const custoHora = horasTrabalhadas > 0 ? totalDespesas / horasTrabalhadas : 0;
          const combustivelHora = horasTrabalhadas > 0 ? vlrCombustivel / horasTrabalhadas : 0;
          const custoHoraSemComb = horasTrabalhadas > 0 ? (totalDespesas - vlrCombustivel) / horasTrabalhadas : 0;

          return {
            ...m, 
            horasTrabalhadas,
            litrosAbastecidos,
            mediaLitrosHora,
            combustivelHora,
            vlrCombustivel,
            vlrManutencao,
            vlrMO,
            vlrPneus,
            vlrFixas,
            vlrGerais,
            totalManutencao,
            totalDespesas,
            custoHora,
            custoHoraSemComb
          };
        });

        // Ordenação
        fechamentoData.sort((a, b) => {
            const numA = parseInt(a.frota.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.frota.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        return (
           <div className="space-y-4 animate-fadeIn flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
            {/* CABEÇALHO (Fixo) */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 px-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Fechamento Mensal</h2>
                <p className="text-slate-500 text-sm">Relatório Analítico Consolidado</p>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 outline-none cursor-pointer">
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {filterPeriod !== 'Ano' && (
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 outline-none cursor-pointer">
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  )}
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 outline-none cursor-pointer">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                
                <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all">
                  <Download size={18}/> Excel
                </button>
              </div>
            </header>

            {/* TABELA COM SCROLL INTERNO (Altura travada na tela) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
               {/* O segredo está aqui: 'overflow-auto' permite rolagem X e Y.
                  O pai tem altura definida pelo flex-1 e altura da tela.
               */}
               <div className="overflow-auto custom-scrollbar flex-1 w-full h-full"> 
                  <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap border-collapse">
                    <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                      <tr>
                        {/* FROTA (Fixa na esquerda e no topo) */}
                        <th className="px-4 py-3 bg-slate-100 sticky left-0 z-50 border-r border-slate-300 min-w-[80px] text-slate-700">Frota</th>
                        
                        {/* Resto do Cabeçalho */}
                        <th className="px-4 py-3 min-w-[150px] bg-slate-50">Máquina</th>
                        <th className="px-4 py-3 bg-slate-50">Tipo</th>
                        <th className="px-4 py-3 bg-slate-50">Loc.</th>
                        <th className="px-4 py-3 border-r border-slate-100 bg-slate-50">Seg.</th>
                        
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right">Horas Trab.</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right">Litros</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right border-r border-blue-100">Méd. L/H</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">R$ Comb/H</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-100 bg-slate-50">R$ Combustível</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">Peças/Serv.</th>
                        <th className="px-4 py-3 text-right bg-slate-50">M.O. Interna</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Pneus</th>
                        <th className="px-4 py-3 text-right font-bold text-red-600 bg-red-50 border-r border-red-100">Total Manut.</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">Fixas</th>
                        <th className="px-4 py-3 text-right border-r border-slate-100 bg-slate-50">Gerais</th>

                        <th className="px-4 py-3 text-right font-black text-slate-800 bg-slate-100">Total Geral</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-800 bg-orange-50">Custo/Hora</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 bg-orange-50">S/ Combust.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fechamentoData.map((row) => (
                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                          {/* Coluna Frota FIXA na esquerda */}
                          <td className="px-4 py-2 font-bold text-slate-800 bg-white sticky left-0 z-30 border-r border-slate-200 group-hover:bg-blue-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            {row.frota}
                          </td>

                          <td className="px-4 py-2 font-medium">{row.maquina}</td>
                          <td className="px-4 py-2 text-slate-500">{row.tipo}</td>
                          <td className="px-4 py-2 text-slate-500">{row.localizacao}</td>
                          <td className="px-4 py-2 text-slate-500 border-r border-slate-100">{row.segmento}</td>

                          <td className="px-4 py-2 text-right font-medium text-blue-700 bg-blue-50/10">{row.horasTrabalhadas}</td>
                          <td className="px-4 py-2 text-right font-medium text-blue-700 bg-blue-50/10">{row.litrosAbastecidos}</td>
                          <td className="px-4 py-2 text-right font-medium text-blue-700 bg-blue-50/10 border-r border-blue-50">{row.mediaLitrosHora.toFixed(2)}</td>

                          <td className="px-4 py-2 text-right">{formatCurrency(row.combustivelHora)}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-700 border-r border-slate-100">{formatCurrency(row.vlrCombustivel)}</td>

                          <td className="px-4 py-2 text-right">{formatCurrency(row.vlrManutencao)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.vlrMO)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.vlrPneus)}</td>
                          <td className="px-4 py-2 text-right font-bold text-red-600 bg-red-50/10 border-r border-red-50">{formatCurrency(row.totalManutencao)}</td>

                          <td className="px-4 py-2 text-right">{formatCurrency(row.vlrFixas)}</td>
                          <td className="px-4 py-2 text-right border-r border-slate-100">{formatCurrency(row.vlrGerais)}</td>

                          <td className="px-4 py-2 text-right font-black text-slate-800 bg-slate-50/50">{formatCurrency(row.totalDespesas)}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 bg-orange-50/20">{formatCurrency(row.custoHora)}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-600 bg-orange-50/20">{formatCurrency(row.custoHoraSemComb)}</td>
                        </tr>
                      ))}
                      
                      {/* RODAPÉ DE TOTAIS (Sticky Bottom para sempre aparecer no fim da tela) */}
                      <tr className="bg-slate-800 text-white font-bold sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                          <td className="px-4 py-3 sticky left-0 bg-slate-800 z-50 border-r border-slate-600">TOTAIS</td>
                          <td colSpan="4" className="border-r border-slate-700"></td>
                          
                          <td className="px-4 py-3 text-right text-blue-200">{fechamentoData.reduce((a,b)=>a+b.horasTrabalhadas,0)}</td>
                          <td className="px-4 py-3 text-right text-blue-200">{fechamentoData.reduce((a,b)=>a+b.litrosAbastecidos,0)}</td>
                          <td className="border-r border-slate-700"></td>

                          <td className="border-r border-slate-700"></td>
                          <td className="px-4 py-3 text-right text-white border-r border-slate-700">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrCombustivel,0))}</td>

                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrManutencao,0))}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrMO,0))}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrPneus,0))}</td>
                          <td className="px-4 py-3 text-right text-red-300 border-r border-slate-700">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.totalManutencao,0))}</td>

                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrFixas,0))}</td>
                          <td className="px-4 py-3 text-right border-r border-slate-700">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.vlrGerais,0))}</td>

                          <td className="px-4 py-3 text-right text-white bg-slate-900">{formatCurrency(fechamentoData.reduce((a,b)=>a+b.totalDespesas,0))}</td>
                          <td colSpan="2"></td>
                      </tr>
                    </tbody>
                  </table>
               </div>
            </div>
           </div>
        );
      default:
        return <div className="p-10 text-center text-slate-500">Em desenvolvimento...</div>;
    }
  };

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveMenu(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 border-r-4 ${
        activeMenu === id 
          ? 'bg-white text-orange-600 border-orange-200 shadow-sm' 
          : 'text-orange-100 hover:bg-orange-500 hover:text-white border-transparent'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Sidebar Clássica Laranja */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-orange-600 to-orange-700 border-r border-orange-500 flex-shrink-0 transition-all duration-300 flex flex-col z-20 shadow-xl`}
      >
        <div className={`flex flex-col px-6 border-b border-orange-500/30 transition-all duration-300 ${isSidebarOpen ? 'py-6' : 'py-4 items-center'}`}>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-lg flex-shrink-0 flex items-center justify-center text-orange-600 shadow-lg shadow-orange-900/20">
              <Tractor size={22} />
            </div>
            {isSidebarOpen && (
              <span className="ml-3 text-lg font-bold text-white tracking-tight leading-tight">
                Fechamento<br/>Máquinas
              </span>
            )}
          </div>
          
          {isSidebarOpen && (
            <p className="mt-2 text-xs text-orange-100/90 font-medium">
              Cálculo de Custos e Análise de Dados
            </p>
          )}
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <NavItem id="dashboard" label={isSidebarOpen ? "Dashboard" : ""} icon={LayoutDashboard} />
          <NavItem id="fechamento" label={isSidebarOpen ? "Fechamento" : ""} icon={PieChart} />
          <NavItem id="reports" label={isSidebarOpen ? "Relatórios" : ""} icon={FileText} />
          <NavItem id="lancamentos" label={isSidebarOpen ? "Lançamentos" : ""} icon={DollarSign} />
          
          <div className="my-4 border-t border-orange-500/30 mx-4"></div>
          <p className={`px-6 text-xs font-semibold text-orange-200 uppercase mb-2 ${!isSidebarOpen && 'hidden'}`}>Dados</p>
          
          <NavItem id="database" label={isSidebarOpen ? "Base de Dados" : ""} icon={Database} />
          <NavItem id="import" label={isSidebarOpen ? "Importar TXT" : ""} icon={Upload} />
        </nav>

        <div className="p-4 border-t border-orange-500/30">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-orange-500 text-orange-100 transition-colors"
           >
             {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
           </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center text-slate-400 text-sm">
            <span>Sistema</span>
            <span className="mx-2">/</span>
            <span className="capitalize text-slate-800 font-bold">{activeMenu.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold border border-orange-200">
                SA
             </div>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Estilos Globais */}
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}