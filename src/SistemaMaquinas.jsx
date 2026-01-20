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
  const [fechamentoSearch, setFechamentoSearch] = useState('');
  // --- ESTADOS PARA O MENU RESUMO (NOVO) ---
  const [resumoSegmento, setResumoSegmento] = useState('');
  const [resumoLocalizacao, setResumoLocalizacao] = useState('');
  // --- NOVOS ESTADOS PARA CONFERÊNCIA ---
  const [isConferenciaModalOpen, setIsConferenciaModalOpen] = useState(false);
  const [conferenciaTab, setConferenciaTab] = useState('entrada');
  // --- ESTADOS DO FIREBASE ---
  const [machines, setMachines] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rawTxtContent, setRawTxtContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [manutencaoModalFilter, setManutencaoModalFilter] = useState('');
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
  // --- ESTADOS DO ALMOXARIFADO (NOVO) ---
  const [almoxarifadoItems, setAlmoxarifadoItems] = useState([]);
  const [isAlmoxarifadoModalOpen, setIsAlmoxarifadoModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [almoxarifadoSearch, setAlmoxarifadoSearch] = useState('');
  const [selectedMateriais, setSelectedMateriais] = useState([]);

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
  // --- ESTADOS PARA FILTRO DO JSON ---
  const [jsonImportMonth, setJsonImportMonth] = useState(String(new Date().getMonth() + 1));
  const [jsonImportYear, setJsonImportYear] = useState(String(new Date().getFullYear()));

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
            valor: '',
            // CORREÇÃO CRUCIAL: Define o 'tipo' automaticamente conforme a aba aberta (entrada ou saida)
            tipo: lancamentosTab 
          }
    );
    setIsExpenseModalOpen(true);
  };

  // 2. Salvar Lançamento Manual (COM REGRA DE RATEIO 95102)
  const handleSaveExpense = async () => {
    // Validação básica (Exceto se for 95102, que aceita descrição vazia pois vamos preencher)
    if (!editingExpense.frota || (!editingExpense.valor && editingExpense.valor !== 0)) {
      alert("Preencha pelo menos Frota e Valor.");
      return;
    }

    setIsSaving(true);

    try {
      // --- LÓGICA DE RATEIO AUTOMÁTICO ---
      let dadosFinais = { ...editingExpense };

      // Se for o Centro de Custo de Rateio
      if (dadosFinais.frota === '95102') {
        dadosFinais.descricao = "FRETES ALMOXARIFADO MÁQUINAS PESADAS";
        dadosFinais.materia = "FRETES ALMOXARIFADO MÁQUINAS PESADAS"; // Garante compatibilidade com ambos os tipos
        dadosFinais.classe = "Rateio";
      } else {
        // Validação padrão para outras frotas
        if (!dadosFinais.descricao && !dadosFinais.materia) {
           // Opcional: alertar se quiser obrigar descrição para os outros
        }
      }

      // Prepara os dados numéricos e tipo
      const dataToSave = { 
        ...dadosFinais, 
        valor: Number(dadosFinais.valor),
        // Garante que o tipo seja salvo (usa o do state ou a aba atual)
        tipo: dadosFinais.tipo || lancamentosTab,
        // Adiciona timestamp se for criação
        ...(!dadosFinais.id && { criadoEm: new Date() })
      };

      if (editingExpense.id) {
        // MODO EDIÇÃO
        const docRef = doc(db, "despesas", editingExpense.id);
        await updateDoc(docRef, dataToSave);
      } else {
        // MODO CRIAÇÃO
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
  // --- ESTADOS PARA O MENU RELATÓRIOS ---
  const [reportEspecie, setReportEspecie] = useState('maquina'); // maquina, tipo, segmento
  const [reportFilterValue, setReportFilterValue] = useState(''); // Valor digitado ou selecionado
  const [reportType, setReportType] = useState('completo'); // completo, manutencao
  const [generatedReport, setGeneratedReport] = useState(null); // Dados processados
  // --- ESTADOS EXTRAS PARA O NOVO RELATÓRIO DASHBOARD ---
  const [isManutencaoReportOpen, setIsManutencaoReportOpen] = useState(false); // Abre o modal da lista de manutenção
  const [reportSummary, setReportSummary] = useState(null); // Guarda os totais calculados
  const [reportChartData, setReportChartData] = useState([]); // Dados para os gráficos

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

  // --- FUNÇÕES DE EDIÇÃO E CRIAÇÃO (ATUALIZADO) ---
  
  // Abrir Modal para NOVA máquina
  const handleAddMachine = () => {
    setEditingMachine({
      frota: '',
      maquina: '',
      tipo: '',
      localizacao: '',
      segmento: ''
    });
    setIsEditModalOpen(true);
  };

  // Abrir Modal para EDITAR máquina existente
  const openEditModal = (machine) => {
    setEditingMachine({ ...machine });
    setIsEditModalOpen(true);
  };

  // Função genérica para atualizar os inputs
  const handleEditChange = (field, value) => {
    setEditingMachine(prev => ({ ...prev, [field]: value }));
  };

  // Salvar no Firebase (Criação ou Edição)
  const handleSaveEdit = async () => {
    if (!editingMachine) return;

    // Validação simples
    if (!editingMachine.frota) {
      alert("O campo Frota é obrigatório.");
      return;
    }

    try {
      if (editingMachine.id) {
        // --- MODO EDIÇÃO: Atualiza documento existente ---
        const docRef = doc(db, "maquinas", editingMachine.id);
        await updateDoc(docRef, {
          frota: editingMachine.frota || '',
          maquina: editingMachine.maquina || '',
          tipo: editingMachine.tipo || '',
          localizacao: editingMachine.localizacao || '',
          segmento: editingMachine.segmento || ''
        });
        alert("Máquina atualizada com sucesso!");
      } else {
        // --- MODO CRIAÇÃO: Adiciona novo documento ---
        await addDoc(collection(db, "maquinas"), {
          frota: editingMachine.frota, // Obrigatório
          maquina: editingMachine.maquina || 'Sem nome',
          tipo: editingMachine.tipo || 'Outros',
          localizacao: editingMachine.localizacao || 'Não informada',
          segmento: editingMachine.segmento || 'Geral'
        });
        alert("Nova máquina cadastrada com sucesso!");
      }
      
      setIsEditModalOpen(false);
      setEditingMachine(null);
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações: " + error.message);
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
    
    // Listener de Almoxarifado (NOVO)
    const almoxarifadoRef = collection(db, "almoxarifado");
    const unsubAlmoxarifado = onSnapshot(almoxarifadoRef, (snapshot) => {
      let lista = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      // Ordena por código
      lista.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setAlmoxarifadoItems(lista);
    });

    return () => {
      unsubMaquinas();
      unsubDespesas();
      unsubAlmoxarifado(); // Adicionar aqui a limpeza
    }
  }, [user]);
  
// --- PROCESSAMENTO DE DADOS (KPIs COM TENDÊNCIA + COMPOSIÇÃO + ISOLAMENTO INTELIGENTE) ---
  const processedData = useMemo(() => {
    
    const curMonth = parseInt(filterMonth);
    const curYear = parseInt(filterYear);
    
    let prevMonth = curMonth;
    let prevYear = curYear;

    if (filterPeriod === 'Ano') {
        prevYear -= 1;
    } else if (filterPeriod === 'Mês') {
        prevMonth -= 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
    } else if (filterPeriod === 'Trimestre') {
        prevMonth -= 3;
        if (prevMonth <= 0) { prevMonth += 12; prevYear -= 1; }
    } else if (filterPeriod === 'Semestre') {
        prevMonth -= 6;
        if (prevMonth <= 0) { prevMonth += 12; prevYear -= 1; }
    }

    const R_CAT_PNEUS = ["PNEUS E CAMARAS", "PNEUS E CAMERAS – NOVOS", "PNEUS RESSOLADOS", "SERVICOS DE PNEUS / BORRACHARIA"];
    const R_CAT_FIXAS = ["SEGUROS", "DPVAT (SEGURO OBRIGATORIO)", "LICENCIAMENTO", "IPVA", "TAXA DE LICENCIAMENTO", "MENSALIDADES"];
    const R_CAT_GERAIS = ["LAVAGEM DE FROTAS", "RAT DESP FINANCEIRAS", "MOTO TAXI", "TAXA DE COBRANÇA", "BENS PEQUENO VALOR (ATIVO PERMANENTE)", "TAXAS DIVERSAS", "PEDAGIO", "ALIMENTACAO"];
    const R_CAT_FURTO = ["PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"];
    const R_CAT_MO_INTERNA = ["RAT CUSTO-ADM"];

    const stats = {
        curr: { total: 0, combustivel: 0, manutencao: 0, horas: 0, composition: {} },
        prev: { total: 0, combustivel: 0, manutencao: 0, horas: 0 }
    };

    stats.curr.composition = {
        'Combustível': 0, 'Manutenção': 0, 'M.O. Interna': 0, 
        'Pneus': 0, 'Fixas': 0, 'Gerais': 0
    };

    const checkPeriod = (dateStr, month, year) => {
        if (!dateStr) return false;
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        const d = dateStr.includes('/') 
            ? new Date(parts[2], parts[1] - 1, parts[0]) 
            : new Date(parts[0], parts[1] - 1, parts[2]);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        if (filterPeriod === 'Ano') return y === year;
        if (filterPeriod === 'Mês') return y === year && m === month;
        
        const qCurr = Math.ceil(curMonth / 3);
        const qCheck = Math.ceil(m / 3);
        if (filterPeriod === 'Trimestre') return y === year && qCheck === qCurr;

        const sCurr = Math.ceil(curMonth / 6);
        const sCheck = Math.ceil(m / 6);
        if (filterPeriod === 'Semestre') return y === year && sCheck === sCurr;

        return false;
    };

    // 5. Processamento Financeiro
    expenses.forEach(exp => {
        const val = Number(exp.valor) || 0;
        const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();

        if (R_CAT_FURTO.some(c => termo.includes(c))) return;

        // --- ISOLAMENTO DE MOTORES (REGRA ATUALIZADA) ---
        const maquinaRef = machines.find(m => m.frota === exp.frota);
        if (maquinaRef) {
            const tipo = (maquinaRef.tipo || '').toUpperCase();
            const nome = (maquinaRef.maquina || '').toUpperCase().trim();
            
            // Só exclui do dashboard se for MOTOR PURO (não começa com "MOTOR DA" nem "MOTOR DO")
            const ehMotorPuro = tipo === 'MOTOR' && !nome.startsWith('MOTOR DA') && !nome.startsWith('MOTOR DO');
            
            if (ehMotorPuro) return; 
        }
        // -----------------------------------------------

        const isCurrent = checkPeriod(exp.data, curMonth, curYear);
        const isPrevious = checkPeriod(exp.data, prevMonth, prevYear);

        if (!isCurrent && !isPrevious) return;

        const target = isCurrent ? stats.curr : stats.prev;
        target.total += val;

        if (termo === "OLEO DIESEL" || termo.includes("COMBUSTIVEL")) {
            target.combustivel += val;
            if (isCurrent) stats.curr.composition['Combustível'] += val;
        } else {
            target.manutencao += val;
            if (isCurrent) {
                if (R_CAT_MO_INTERNA.some(c => termo.includes(c))) stats.curr.composition['M.O. Interna'] += val;
                else if (R_CAT_PNEUS.some(c => termo.includes(c))) stats.curr.composition['Pneus'] += val;
                else if (R_CAT_FIXAS.some(c => termo.includes(c))) stats.curr.composition['Fixas'] += val;
                else if (R_CAT_GERAIS.some(c => termo.includes(c))) stats.curr.composition['Gerais'] += val;
                else stats.curr.composition['Manutenção'] += val;
            }
        }
    });

    // 6. Processamento de Horas
    machines.forEach(m => {
        const tipo = (m.tipo || '').toUpperCase();
        const nome = (m.maquina || '').toUpperCase().trim();
        const ehMotorPuro = tipo === 'MOTOR' && !nome.startsWith('MOTOR DA') && !nome.startsWith('MOTOR DO');
        
        if (ehMotorPuro) return; // Ignora horas de motores puros

        const machineExpenses = expenses.filter(e => e.frota === m.frota && Number(e.horimetro) > 0);
        machineExpenses.sort((a, b) => {
            const dA = a.data.includes('/') ? a.data.split('/').reverse().join('-') : a.data;
            const dB = b.data.includes('/') ? b.data.split('/').reverse().join('-') : b.data;
            return dA.localeCompare(dB);
        });

        const currExps = machineExpenses.filter(e => checkPeriod(e.data, curMonth, curYear));
        if (currExps.length >= 2) {
            const delta = Number(currExps[currExps.length-1].horimetro) - Number(currExps[0].horimetro);
            if (delta > 0) stats.curr.horas += delta;
        }

        const prevExps = machineExpenses.filter(e => checkPeriod(e.data, prevMonth, prevYear));
        if (prevExps.length >= 2) {
            const delta = Number(prevExps[prevExps.length-1].horimetro) - Number(prevExps[0].horimetro);
            if (delta > 0) stats.prev.horas += delta;
        }
    });

    const getTrend = (curr, prev) => {
        if (prev === 0) return { label: "Sem base anterior", color: "text-slate-400" };
        const pct = ((curr - prev) / prev) * 100;
        const isIncrease = pct > 0;
        return {
            val: pct,
            color: isIncrease ? "text-red-500" : "text-green-500",
            icon: isIncrease ? "🔺" : "🔻",
            text: `${Math.abs(pct).toFixed(1)}% vs anterior`
        };
    };

    const kpiTotal = { value: stats.curr.total, ...getTrend(stats.curr.total, stats.prev.total) };
    const kpiFuel = { value: stats.curr.combustivel, ...getTrend(stats.curr.combustivel, stats.prev.combustivel) };
    const kpiManut = { value: stats.curr.manutencao, ...getTrend(stats.curr.manutencao, stats.prev.manutencao) };
    
    const custHoraCurr = stats.curr.horas > 0 ? stats.curr.total / stats.curr.horas : 0;
    const custHoraPrev = stats.prev.horas > 0 ? stats.prev.total / stats.prev.horas : 0;
    const kpiCustHora = { value: custHoraCurr, ...getTrend(custHoraCurr, custHoraPrev) };

    const custoPorMaquina = {};
    expenses.filter(e => checkPeriod(e.data, curMonth, curYear)).forEach(e => {
       const mRef = machines.find(m => m.frota === e.frota);
       
       // Validação de Motor Puro no Top 5
       if (mRef) {
          const tipo = (mRef.tipo || '').toUpperCase();
          const nome = (mRef.maquina || '').toUpperCase().trim();
          if (tipo === 'MOTOR' && !nome.startsWith('MOTOR DA') && !nome.startsWith('MOTOR DO')) return;
       }

       if (R_CAT_FURTO.some(c => (e.classe||'').toUpperCase().includes(c))) return;
       const nome = e.frota; 
       custoPorMaquina[nome] = (custoPorMaquina[nome] || 0) + (Number(e.valor) || 0);
    });
    const chartDataMaquina = Object.keys(custoPorMaquina)
      .map(key => ({ name: key, custo: custoPorMaquina[key] }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const chartDataComposition = Object.keys(stats.curr.composition)
      .map(key => ({ name: key, value: stats.curr.composition[key] }))
      .filter(item => item.value > 0)
      .sort((a,b) => b.value - a.value);

    return { 
        kpiTotal, kpiFuel, kpiManut, kpiCustHora,
        chartDataMaquina, chartDataComposition,
        totalHoras: stats.curr.horas
    };
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

// --- FUNÇÃO DE EXPORTAR FECHAMENTO PARA EXCEL (CSV) ---
  const handleExportFechamentoExcel = (data) => {
    if (!data || data.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    // 1. Cabeçalho das Colunas (Separado por ponto e vírgula para Excel Brasil)
    const header = [
      "Frota", "Máquina", "Tipo", "Localização", "Segmento",
      "Horas Trab.", "Litros", "Méd. L/H",
      "R$ Comb/H", "R$ Combustível",
      "Manutenção", "M.O. Interna", "Pneus", "Total Manut.",
      "Fixas", "Gerais", "Total Geral", "Custo/Hora", "S/ Combust.", "Furto/Roubo"
    ];

    // 2. Mapeamento das Linhas
    const rows = data.map(item => [
      item.frota,
      item.maquina,
      item.tipo,
      item.localizacao,
      item.segmento,
      String(item.horasTrabalhadas).replace('.', ','),
      String(item.litrosAbastecidos).replace('.', ','),
      String(item.mediaLitrosHora.toFixed(2)).replace('.', ','),
      String(item.combustivelHora.toFixed(2)).replace('.', ','),
      String(item.vlrCombustivel.toFixed(2)).replace('.', ','),
      String(item.vlrManutencao.toFixed(2)).replace('.', ','),
      String(item.vlrMO.toFixed(2)).replace('.', ','),
      String(item.vlrPneus.toFixed(2)).replace('.', ','),
      String(item.totalManutencao.toFixed(2)).replace('.', ','),
      String(item.vlrFixas.toFixed(2)).replace('.', ','),
      String(item.vlrGerais.toFixed(2)).replace('.', ','),
      String(item.totalDespesas.toFixed(2)).replace('.', ','), // Total Geral
      String(item.custoHora.toFixed(2)).replace('.', ','),
      String(item.custoHoraSemComb.toFixed(2)).replace('.', ','),
      String(item.vlrFurto.toFixed(2)).replace('.', ',')
    ]);

    // 3. Montagem do CSV com BOM (\uFEFF) para acentuação correta
    const csvContent = "\uFEFF" + [
      header.join(";"), 
      ...rows.map(r => r.join(";"))
    ].join("\n");

    // 4. Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Fechamento_${filterPeriod}_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

// --- IMPORTADOR INTELIGENTE V6 (CORREÇÃO DE COLUNAS) ---
  const handleSmartImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportPreview(null);
    setImportType(null);

    // Cria lista de frotas conhecidas (normalizadas)
    const knownFleets = machines.map(m => m.frota ? m.frota.trim().toUpperCase() : '');

    // --- LISTA MESTRA DE CLASSES VÁLIDAS ---
    const VALID_CLASSES = new Set([
      // MANUTENÇÃO
      "MANUT. POR DESGASTE (MAQUINAS PESADAS)", "MANUT. PREVENTIVA (FROTA / MAQ)",
      "MANUT. CORRETIVA (FROTA / MAQ)", "REFORMA DE FROTA ( VEICULOS / EQUIP. )",
      "FRETES S/ COMPRAS", "MANUT/ PECAS E ACESSORIOS EQUIPAMENTOS",
      "MATERIAL DE USO E CONSUMO", "FERRAMENTAS", "MANUT. POR ACIDENTE (FROTA / MAQ)",
      "MANUTENCAO / PECAS E ACES. VEICULOS", "MANUT. MAQUINAS E EQUIPAMENTOS",
      "MANUT/ PECAS E ACESSORIOS MAQUINAS", "REFORMA ALTERNADOR (MAQUINAS)",
      "REFORMA MOTOR DE PARTIDA (MAQUINAS)", "DESPESAS DE VIAGENS E HOSPEDAGENS",
      "GAS GLP", "OXIGENIO / GAS P/ SOLDA", "MATERIAL DE SEGURANCA E PROTECAO",
      "TUBOS E CONEXOES", "SERVIÇOS DE GUINCHO", "LOCAÇÃO DE MAQUINAS E EQUIPAMENTOS",
      "SERVICOS DE TERCEIROS – INTERNO", "SERVICOS DE TERCEIROS – EXTERNO",
      "SERVICOS DE TERCEIROS (FROTA E MAQ)", "SERVICOS DE TERCEIROS (EQUIPAMENTOS)",
      "SERVICOS DE TERCEIROS",
      // PNEUS
      "PNEUS E CAMARAS", "PNEUS E CAMERAS – NOVOS", "PNEUS RESSOLADOS", "SERVICOS DE PNEUS / BORRACHARIA",
      // FIXAS E ADMINISTRATIVAS
      "SEGUROS", "DPVAT (SEGURO OBRIGATORIO)", "LICENCIAMENTO", "MENSALIDADES", "RAT CUSTO-ADM",
      // GERAIS E COMBUSTÍVEL
      "LAVAGEM DE FROTAS", "RAT DESP FINANCEIRAS", "MOTO TAXI", "TAXA DE COBRANÇA", 
      "OLEO DIESEL", "BENS PEQUENO VALOR (ATIVO PERMANENTE)",
      // FURTO
      "PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"
    ]);

    // --- FUNÇÃO AUXILIAR DE NORMALIZAÇÃO ---
    // Remove zeros à esquerda. Ex: "002260" -> "2260"
    const normalizeCode = (code) => {
       if (!code) return '';
       return String(code).trim().replace(/^0+/, '');
    };

    const parseMonetary = (val) => {
       if (!val) return 0;
       if (typeof val === 'number') return val;
       const clean = val.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
       return parseFloat(clean) || 0;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target.result;

      // 1. Parser
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

      // 2. Identificação do Cabeçalho
      let headerRowIndex = -1;
      let headers = [];

      for(let i=0; i < parsedRows.length && i < 50; i++) {
         const rowStr = parsedRows[i].join(' ').toUpperCase();
         
         if (rowStr.includes('PRGER-CCUS') || 
             rowStr.includes('DET01-QUEBRA') || 
             (rowStr.includes('PLACA') && rowStr.includes('MENSALIDADE')) ||
             (rowStr.includes('CUSTO TOTAL BORRACHARIA') || rowStr.includes('CUSTO TOTAL MECANICA'))) {
            headerRowIndex = i;
            headers = parsedRows[i].map(c => c.trim().toUpperCase().replace(/["']/g, ''));
            break;
         }
      }

      if (headerRowIndex === -1) {
        alert("Cabeçalho não identificado. Verifique se o arquivo é compatível.");
        return;
      }

      // --- CORREÇÃO IMPORTANTE AQUI ---
      // Prioriza a busca EXATA do nome da coluna para evitar confundir
      // "DET01-QUEBRA" com "DET01-QUEBRA-EMPR"
      const getIdx = (colName) => {
         const exactIdx = headers.findIndex(h => h === colName);
         if (exactIdx !== -1) return exactIdx;
         return headers.findIndex(h => h.includes(colName));
      };

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
        if (dateStr.includes('/')) {
           const parts = dateStr.split('/');
           if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
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
      let materiaisNaoCadastrados = new Set();
      let classesNaoIdentificadas = new Set();

      // --- CENÁRIO 1: M.O. INTERNA ---
      if (getIdx('CUSTO TOTAL BORRACHARIA') !== -1 || getIdx('CUSTO TOTAL MECANICA') !== -1) {
         detectedType = 'saida';
         processedData = [];

         const idxFrota = getIdx('FROTA');
         const idxBorracharia = getIdx('CUSTO TOTAL BORRACHARIA');
         const idxMecanica = getIdx('CUSTO TOTAL MECANICA'); 
         const idxData = getIdx('DATA');

         const linhas = parsedRows.slice(headerRowIndex + 1);

         linhas.forEach((cols, index) => {
            if (cols.length < 2) return;

            const frotaRaw = cleanStr(cols[idxFrota]);
            const frota = normalizeCode(frotaRaw);
            if (!frota) return;

            const unknownFleet = !knownFleets.includes(frota.toUpperCase());
            const dataLinha = idxData !== -1 ? parseDateTxt(cleanStr(cols[idxData])) : null;
            const dataFinal = dataLinha || new Date().toISOString().split('T')[0];

            // 1. Processa Borracharia
            const valorBorracharia = parseMonetary(cols[idxBorracharia]);
            if (valorBorracharia > 0) {
               processedData.push({
                  idTemp: `B-${index}`,
                  tipo: 'saida',
                  frota: frota,
                  unknownFleet: unknownFleet,
                  data: dataFinal,
                  fornecedorNome: 'M.O. Interna',
                  classe: 'RAT CUSTO-ADM',
                  valor: valorBorracharia,
                  materia: 'M.O INTERNA BORRACHARIA',
                  descricao: 'M.O Interna Borracharia',
                  quantidade: 1,
                  origem: 'Importação M.O.'
               });
            }

            // 2. Processa Mecânica
            const valorMecanica = parseMonetary(cols[idxMecanica]);
            if (valorMecanica > 0) {
               processedData.push({
                  idTemp: `M-${index}`,
                  tipo: 'saida',
                  frota: frota,
                  unknownFleet: unknownFleet,
                  data: dataFinal,
                  fornecedorNome: 'M.O. Interna',
                  classe: 'RAT CUSTO-ADM',
                  valor: valorMecanica,
                  materia: 'M.O INTERNA MECANICA',
                  descricao: 'M.O Interna Mecânica',
                  quantidade: 1,
                  origem: 'Importação M.O.'
               });
            }
         });

      // --- CENÁRIO 2: RASTREADOR ---
      } else if (getIdx('PLACA') !== -1 && getIdx('MENSALIDADE') !== -1) {
         detectedType = 'saida';
         
         processedData = parsedRows.slice(headerRowIndex + 1).map((cols, index) => {
            if (cols.length < 3) return null;

            const rawPlaca = cleanStr(cols[getIdx('PLACA')]);
            const frotaMatch = rawPlaca.match(/\d+/);
            const frota = frotaMatch ? normalizeCode(frotaMatch[0]) : null;

            if (!frota) return null;

            const unknownFleet = !knownFleets.includes(frota.toUpperCase());
            const rawDate = cleanStr(cols[getIdx('DATA')]);
            
            const subtotal = parseMonetary(cols[getIdx('SUBTOTAL')]);
            const outros = parseMonetary(cols[getIdx('OUTROS SERVIÇOS')]);
            const valorTotal = subtotal + outros;

            if (valorTotal <= 0) return null;

            return {
               idTemp: index,
               tipo: 'saida',
               frota: frota,
               unknownFleet: unknownFleet,
               data: parseDateTxt(rawDate) || new Date().toISOString().split('T')[0],
               fornecedorNome: 'Rastreador',
               classe: 'MENSALIDADES',
               valor: valorTotal,
               materia: 'MENSALIDADE RASTREADOR',
               descricao: `Rastreador (${rawPlaca})`,
               quantidade: 1,
               origem: 'Importação CSV'
            };
         }).filter(Boolean);

      // --- CENÁRIO 3: ENTRADA (SAE134) ---
      } else if (getIdx('PRGER-TOTA') !== -1 || getIdx('PRGER-NFOR') !== -1) {
        detectedType = 'entrada';
        processedData = parsedRows.slice(headerRowIndex + 1).map((cols, index) => {
           if (cols.length < 5) return null;

           let rawDate = cleanStr(cols[getIdx('PRGER-LCTO')]);
           const rawEmissao = cleanStr(cols[getIdx('PRGER-EMIS')]);
           if (!rawDate || rawDate === '') rawDate = rawEmissao;

           let rawDesc = cleanStr(cols[getIdx('PR-SORT')]);
           if (rawDesc.match(/^0+$/) || rawDesc === '') rawDesc = "Lançamento SAF";

           const valStr = cleanStr(cols[getIdx('PRGER-TOTA')]);
           const valorFinal = parseTxtNumber(valStr, 100);

           let frotaRaw = cleanStr(cols[getIdx('PRGER-CCUS')]);
           if (!frotaRaw) return null;
           let frota = normalizeCode(frotaRaw);

           const unknownFleet = !knownFleets.includes(frota.toUpperCase());
           
           const classeLida = cleanStr(cols[getIdx('PRGER-NPLC')]);
           if (classeLida && !VALID_CLASSES.has(classeLida.toUpperCase().trim())) {
              classesNaoIdentificadas.add(classeLida);
           }

           return {
             idTemp: index,
             tipo: 'entrada',
             frota: frota,
             unknownFleet: unknownFleet,
             data: parseDateTxt(rawDate),
             dataEmissao: parseDateTxt(rawEmissao),
             fornecedorNome: cleanStr(cols[getIdx('PRGER-NFOR')]), 
             fornecedorCod: cleanStr(cols[getIdx('PRGPR-FORN')]),
             classe: classeLida,
             valor: valorFinal,
             descricao: rawDesc, 
             empresa: cleanStr(cols[getIdx('PREMP-CODI')]),
             fiscal: cleanStr(cols[getIdx('PRGER-NFIS')]),
             notaFiscal: cleanStr(cols[getIdx('PRGER-NOTA')]),
             especie: cleanStr(cols[getIdx('PRENT-ESPE')]),
             ordemCompra: cleanStr(cols[getIdx('PRENT-ORDE')])
           };
        }).filter(Boolean);

      // --- CENÁRIO 4: SAÍDA (SAE127) ---
      } else if (getIdx('DET01-QUEBRA') !== -1 || getIdx('PRGER-TTEN') !== -1) {
        detectedType = 'saida';
        
        const idxCodMateria = getIdx('PRMAT-CODI');
        const idxNomeMateria = getIdx('PRMAT-NOME');
        
        // AQUI: Agora getIdx garante que pega a coluna DET01-QUEBRA correta (com a frota)
        const idxFrota = getIdx('DET01-QUEBRA'); 

        processedData = parsedRows.slice(headerRowIndex + 1).map((cols, index) => {
           if (cols.length < 5) return null;

           let frotaRaw = cleanStr(cols[idxFrota]);
           if (!frotaRaw) return null;
           
           // Normaliza: "002260" vira "2260"
           let frota = normalizeCode(frotaRaw);

           const unknownFleet = !knownFleets.includes(frota.toUpperCase());

           const rawDate = cleanStr(cols[getIdx('PRGER-DATA')]);
           const valTotalStr = cleanStr(cols[getIdx('PRGER-TTEN')]);
           const valorTotal = parseTxtNumber(valTotalStr, 1000);
           const qtdStr = cleanStr(cols[getIdx('PRGER-QTDES')]);
           const quantidade = parseTxtNumber(qtdStr, 1000);
           const valEntradaStr = cleanStr(cols[getIdx('PRGER-VREN')]);
           const valorEntrada = parseTxtNumber(valEntradaStr, 1000);

           const descMateria = idxNomeMateria !== -1 ? cleanStr(cols[idxNomeMateria]) : 'Sem Descrição';
           const codMateriaOriginal = idxCodMateria !== -1 ? cleanStr(cols[idxCodMateria]) : '';
           const codMateriaNormalizado = normalizeCode(codMateriaOriginal);

           let classeIdentificada = "NÃO CADASTRADO"; 

           if (codMateriaNormalizado) {
              const itemAlmoxarifado = almoxarifadoItems.find(
                 item => normalizeCode(item.codigo) === codMateriaNormalizado
              );
              
              if (itemAlmoxarifado && itemAlmoxarifado.classe) {
                 classeIdentificada = itemAlmoxarifado.classe;
              } else {
                 materiaisNaoCadastrados.add(`${codMateriaOriginal} - ${descMateria}`);
              }
           } else {
              classeIdentificada = "SEM CÓDIGO";
           }

           return {
             idTemp: index,
             tipo: 'saida',
             frota: frota,
             unknownFleet: unknownFleet,
             data: parseDateTxt(rawDate),
             fornecedorNome: "Movimentação de Estoque", 
             classe: classeIdentificada,
             valor: valorTotal,
             materia: descMateria,
             descricao: descMateria,
             empresa: cleanStr(cols[getIdx('PRGER-EMPR')]),
             codLancamento: cleanStr(cols[getIdx('PRGER-CODI')]),
             quantidade: quantidade,
             valorEntrada: valorEntrada,
             codMateria: codMateriaOriginal,
             recebedor: cleanStr(cols[getIdx('PRGER-RECE')]),
             almoxarifado: cleanStr(cols[getIdx('PRGER-NALM')])
           };
        }).filter(Boolean);
      } else {
        alert("Layout não reconhecido. Verifique as colunas do arquivo.");
        return;
      }

      setImportType(detectedType);
      
      // --- ALERTAS ---
      if (materiaisNaoCadastrados.size > 0) {
         const listaFaltante = Array.from(materiaisNaoCadastrados).sort().join('\n');
         setTimeout(() => {
            alert(`⚠️ ITENS NÃO IDENTIFICADOS NO ALMOXARIFADO:\n${listaFaltante}`);
         }, 500);
      }

      if (classesNaoIdentificadas.size > 0) {
         const listaClasses = Array.from(classesNaoIdentificadas).sort().join('\n');
         setTimeout(() => {
            alert(`⚠️ CLASSES NÃO RECONHECIDAS (ENTRADA):\n${listaClasses}`);
         }, 600);
      }
      
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

// --- IMPORTAÇÃO V4 (COM CORREÇÃO DE ESCALA /100 EM TUDO: QTD, VALOR E HORÍMETRO) ---
  const [loadingJson, setLoadingJson] = useState(false);

  const handleN8nImport = async () => {
    setLoadingJson(true);
    try {
      const n8nUrl = 'https://n8n-n8n.tzpn7t.easypanel.host/webhook/abastecimento'; 
      const targetUrl = `${n8nUrl}?mes=${jsonImportMonth}&ano=${jsonImportYear}&t=${new Date().getTime()}`;

      console.log("Buscando dados...", targetUrl);

      const response = await fetch(targetUrl, { method: 'GET' });
      if (!response.ok) throw new Error(`Erro n8n: ${response.status}`);

      const data = await response.json();
      const arrayDados = Array.isArray(data) ? data : (data.data || []);
      const listaProcessar = Array.isArray(arrayDados) ? arrayDados : [arrayDados];

      if (listaProcessar.length === 0) {
        alert("O n8n não retornou nenhum registro.");
        setLoadingJson(false);
        return;
      }

      // 1. CARREGA LISTAS DE VALIDAÇÃO
      const frotasCadastradas = new Set(machines.map(m => String(m.frota).trim().toUpperCase()));
      
      const listaAtualDoSistema = expenses; 
      const assinaturasExistentes = new Set(listaAtualDoSistema.map(item => {
         const chave = `${item.frota}-${item.data}`;
         return chave.toUpperCase(); 
      }));

      // --- AUXILIARES ---
      const corrigirData = (dataBruta) => {
        if (!dataBruta) return null;
        if (dataBruta.includes('/')) {
           const partes = dataBruta.split('/'); 
           if (partes.length === 3) {
              const parteDiaHora = partes[0].trim().split(' ');
              const dia = parteDiaHora[0];
              const mes = partes[1];
              const ano = partes[2];
              if (dia && mes && ano && ano.length === 4) return `${ano}-${mes}-${dia}`; 
           }
        }
        try {
           const d = new Date(dataBruta);
           if (!isNaN(d)) return d.toISOString().split('T')[0];
        } catch (e) {}
        return null; 
      };

      const lerValor = (val) => {
         if (!val) return 0;
         if (typeof val === 'number') return val;
         if (typeof val === 'string') return Number(val.replace('R$', '').replace(/\s/g, '').replace(',', '.')) || 0;
         return 0;
      };

      const lerHorimetro = (val) => {
         if (!val) return 0;
         const limpo = String(val).replace(/[^\d.]/g, '');
         return Number(limpo) || 0;
      };

      const formattedData = [];
      let contadorNovos = 0;
      let contadorDuplicados = 0;
      let contadorIgnoradosFrota = 0; 

      listaProcessar.forEach((item, index) => {
        let rawFrota = item.frota || item.placa_veiculo || '000';
        let frotaMatch = String(rawFrota).match(/\d+/);
        let frotaLimpa = frotaMatch ? frotaMatch[0] : null;

        if (!frotaLimpa || !frotasCadastradas.has(frotaLimpa)) {
           contadorIgnoradosFrota++;
           return; 
        }

        const dataFormatada = corrigirData(item.data || item.data_registro);
        if (!dataFormatada) return; 

        const [anoItem, mesItem] = dataFormatada.split('-'); 
        if (anoItem !== jsonImportYear || parseInt(mesItem) !== parseInt(jsonImportMonth)) return;

        // 1. CORREÇÃO QTD (LITROS) / 100
        const rawQtd = Number(item.quantidade || item.litro_abastecido || 0);
        const qtd = rawQtd > 0 ? rawQtd / 100 : 0;
        
        const assinaturaNovoItem = `${frotaLimpa}-${dataFormatada}`.toUpperCase();
        if (assinaturasExistentes.has(assinaturaNovoItem)) {
           // Lógica de duplicidade opcional
        }

        // 2. CORREÇÃO HORÍMETRO / 100
        const rawHorimetro = lerHorimetro(item.horimetro || item.km_horimetro);
        const horimetroLido = rawHorimetro > 0 ? rawHorimetro / 100 : 0;

        // 3. CORREÇÃO VALOR (R$) / 100
        const rawValor = item.valor || item.preco_combustivel || item.valorTotal || item.total;
        const valorLido = lerValor(rawValor) / 100;

        formattedData.push({
          idTemp: index, 
          tipo: 'saida',
          frota: frotaLimpa,
          unknownFleet: false,
          data: dataFormatada,
          materia: 'OLEO DIESEL', 
          descricao: `Horímetro: ${horimetroLido}`, 
          classe: 'OLEO DIESEL',
          valor: valorLido,
          quantidade: qtd,
          horimetro: horimetroLido, // Campo numérico corrigido
          fornecedorNome: 'Posto Interno',
          origem: 'Integração n8n'
        });
        contadorNovos++;
      });

      if (formattedData.length === 0) {
         let msg = "Nenhum dado novo encontrado.";
         if (contadorIgnoradosFrota > 0) msg += `\n(Ignorados: ${contadorIgnoradosFrota} registros de frotas não cadastradas)`;
         if (contadorDuplicados > 0) msg += `\n(Duplicados: ${contadorDuplicados} já existiam)`;
         alert(msg);
      } else {
        setImportPreview(formattedData);
        setImportType('saida');
        console.log(`Sucesso! Novos: ${contadorNovos} | Ignorados (Frota): ${contadorIgnoradosFrota}`);
      }

    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setLoadingJson(false);
    }
  };
  // --- LÓGICA DO ALMOXARIFADO (CRUD + IMPORTAÇÃO) ---

  // 1. Abrir Modal
  const handleOpenAlmoxarifadoModal = (material = null) => {
    setEditingMaterial(material ? { ...material } : { codigo: '', descricao: '', classe: '' });
    setIsAlmoxarifadoModalOpen(true);
  };

  // 2. Salvar Manual
  const handleSaveMaterial = async () => {
    if (!editingMaterial.codigo || !editingMaterial.classe) {
      alert("Código e Classe são obrigatórios.");
      return;
    }
    setIsSaving(true);
    try {
      const dataToSave = {
        codigo: editingMaterial.codigo.trim(),
        descricao: editingMaterial.descricao || '',
        classe: editingMaterial.classe.trim().toUpperCase()
      };

      if (editingMaterial.id) {
        await updateDoc(doc(db, "almoxarifado", editingMaterial.id), dataToSave);
      } else {
        await addDoc(collection(db, "almoxarifado"), dataToSave);
      }
      setIsAlmoxarifadoModalOpen(false);
      setEditingMaterial(null);
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Excluir Material
  const handleDeleteMaterial = async (id) => {
    if (confirm("Deseja excluir este material?")) {
      try {
        await deleteDoc(doc(db, "almoxarifado", id));
      } catch (e) { alert("Erro: " + e.message); }
    }
  };

  // 4. Importação CSV (Colunas: Cód, Descrição, Classe)
  const handleAlmoxarifadoCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      
      // Remove cabeçalho se existir (opcional, assume que a primeira linha pode ser dados se for número)
      // Vamos assumir que tem cabeçalho e pular a linha 0
      const dataLines = lines.slice(1);
      
      let count = 0;
      const batch = writeBatch(db);
      
      dataLines.forEach((line) => {
        const sep = line.includes(';') ? ';' : ',';
        const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Sequência pedida: 0: Cód, 1: Descrição, 2: Classe
        if (cols.length >= 3 && cols[0]) {
           const ref = doc(collection(db, "almoxarifado")); // Gera ID novo
           batch.set(ref, {
             codigo: cols[0],
             descricao: cols[1],
             classe: cols[2].toUpperCase(),
             criadoEm: new Date()
           });
           count++;
        }
      });

      if (count > 0) {
        setIsSaving(true);
        try {
          await batch.commit();
          alert(`${count} materiais importados com sucesso!`);
        } catch (err) {
          alert("Erro na importação em lote: " + err.message);
        } finally {
          setIsSaving(false);
        }
      }
    };
    reader.readAsText(file);
  };
  // 5. Seleção e Exclusão em Lote (Almoxarifado)
  const toggleSelectMaterial = (id) => {
    setSelectedMateriais(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMateriais = (listaFiltrada) => {
    // Se todos os visíveis já estão selecionados, limpa. Senão, seleciona todos.
    const allSelected = listaFiltrada.length > 0 && listaFiltrada.every(item => selectedMateriais.includes(item.id));
    
    if (allSelected) {
      setSelectedMateriais([]);
    } else {
      setSelectedMateriais(listaFiltrada.map(item => item.id));
    }
  };

  const handleBulkDeleteMateriais = async () => {
    if (selectedMateriais.length === 0) return;

    if (confirm(`Tem certeza que deseja excluir ${selectedMateriais.length} materiais selecionados?`)) {
      setIsSaving(true);
      try {
        const batch = writeBatch(db);
        selectedMateriais.forEach(id => {
          batch.delete(doc(db, "almoxarifado", id));
        });
        await batch.commit();
        setSelectedMateriais([]); // Limpa a seleção
        alert("Materiais excluídos com sucesso!");
      } catch (error) {
        alert("Erro ao excluir em lote: " + error.message);
      } finally {
        setIsSaving(false);
      }
    }
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
                <p className="text-slate-500">Visão geral e indicadores de desempenho</p>
              </div>
              
              {/* ÁREA DE FILTROS */}
              <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
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
            </header>

            {/* NOVOS KPI CARDS COM TENDÊNCIA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* 1. CUSTO TOTAL */}
              <StatCard 
                title="Custo Total (Período)" 
                value={formatCurrency(processedData.kpiTotal.value)} 
                icon={DollarSign} 
                trend={
                  <span className={`font-bold ${processedData.kpiTotal.color}`}>
                    {processedData.kpiTotal.icon} {processedData.kpiTotal.text}
                  </span>
                }
              />

              {/* 2. COMBUSTÍVEL TOTAL */}
              <StatCard 
                title="Combustível Total" 
                value={formatCurrency(processedData.kpiFuel.value)} 
                icon={Truck} 
                trend={
                  <span className={`font-bold ${processedData.kpiFuel.color}`}>
                    {processedData.kpiFuel.icon} {processedData.kpiFuel.text}
                  </span>
                }
              />

              {/* 3. MANUTENÇÃO TOTAL */}
              <StatCard 
                title="Manutenção Total" 
                value={formatCurrency(processedData.kpiManut.value)} 
                icon={Settings} 
                trend={
                  <span className={`font-bold ${processedData.kpiManut.color}`}>
                    {processedData.kpiManut.icon} {processedData.kpiManut.text}
                  </span>
                }
              />

              {/* 4. CUSTO POR HORA */}
              <StatCard 
                title="Custo p/ Hora" 
                value={formatCurrency(processedData.kpiCustHora.value)} 
                icon={PieChart} 
                trend={
                  <div className="flex flex-col">
                    <span className={`font-bold ${processedData.kpiCustHora.color}`}>
                      {processedData.kpiCustHora.icon} {processedData.kpiCustHora.text}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Base: {processedData.totalHoras} hrs</span>
                  </div>
                }
              />
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              
              {/* TOP 5 MÁQUINAS */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Máquinas (Maior Custo)</h3>
                <div className="h-64">
                  {processedData.chartDataMaquina.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.chartDataMaquina} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                        <Bar dataKey="custo" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados neste período</div>
                  )}
                </div>
              </div>

              {/* NOVO GRÁFICO: COMPOSIÇÃO DE CUSTO */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Composição de Custo</h3>
                <div className="h-64 flex justify-center items-center">
                  {processedData.chartDataComposition.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={processedData.chartDataComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {processedData.chartDataComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} 
                              fill={
                                entry.name === 'Combustível' ? '#f97316' : 
                                entry.name === 'Manutenção' ? '#dc2626' : 
                                entry.name === 'M.O. Interna' ? '#b91c1c' :
                                entry.name === 'Pneus' ? '#475569' :
                                entry.name === 'Fixas' ? '#2563eb' :
                                '#94a3b8' // Gerais
                              } 
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '11px'}}/>
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
       case 'almoxarifado':
        const filteredMateriais = almoxarifadoItems.filter(item => 
           item.codigo.toLowerCase().includes(almoxarifadoSearch.toLowerCase()) ||
           item.descricao.toLowerCase().includes(almoxarifadoSearch.toLowerCase()) ||
           item.classe.toLowerCase().includes(almoxarifadoSearch.toLowerCase())
        );

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pb-2">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Almoxarifado</h2>
                  <p className="text-slate-500 font-medium mt-1">Classificação de Materiais e Peças</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* BOTÃO EXCLUIR EM LOTE (SÓ APARECE SE TIVER SELEÇÃO) */}
                  {selectedMateriais.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteMateriais}
                      className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm"
                    >
                      <Trash2 size={18} /> Excluir ({selectedMateriais.length})
                    </button>
                  )}

                  <button 
                    onClick={() => handleOpenAlmoxarifadoModal()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20"
                  >
                    <Plus size={18} strokeWidth={3} /> Novo Cadastro
                  </button>

                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleAlmoxarifadoCSVImport}
                      className="hidden" 
                      id="csv-almox-upload"
                    />
                    <label 
                      htmlFor="csv-almox-upload"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-slate-900/20"
                    >
                      <Upload size={18} /> Importar CSV
                    </label>
                  </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Buscar código, descrição ou classe..." 
                      value={almoxarifadoSearch}
                      onChange={(e) => setAlmoxarifadoSearch(e.target.value)}
                      className="pl-12 pr-4 py-2.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">
                    Total: {filteredMateriais.length}
                  </div>
               </div>

               <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        {/* Checkbox Cabeçalho */}
                        <th className="px-6 py-4 w-4">
                          <input 
                            type="checkbox" 
                            onChange={() => handleSelectAllMateriais(filteredMateriais)}
                            checked={filteredMateriais.length > 0 && filteredMateriais.every(m => selectedMateriais.includes(m.id))}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4">Cód. Matéria</th>
                        <th className="px-6 py-4">Descrição Matéria</th>
                        <th className="px-6 py-4">Classe</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredMateriais.length > 0 ? (
                        filteredMateriais.map((item) => (
                          <tr key={item.id} className={`hover:bg-orange-50/20 transition-colors ${selectedMateriais.includes(item.id) ? 'bg-orange-50/40' : ''}`}>
                            {/* Checkbox Linha */}
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedMateriais.includes(item.id)}
                                onChange={() => toggleSelectMaterial(item.id)}
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 font-mono">{item.codigo}</td>
                            <td className="px-6 py-4 text-slate-600">{item.descricao}</td>
                            <td className="px-6 py-4">
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                {item.classe}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                               <button onClick={() => handleOpenAlmoxarifadoModal(item)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><Edit size={18}/></button>
                               <button onClick={() => handleDeleteMaterial(item.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={18}/></button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="p-8 text-center text-slate-400">Nenhum material encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* Modal de Cadastro (Mantido igual) */}
            {isAlmoxarifadoModalOpen && editingMaterial && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {editingMaterial.id ? 'Editar Material' : 'Novo Material'}
                      </h3>
                      <button onClick={() => setIsAlmoxarifadoModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4 bg-slate-50/50">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Código da Matéria</label>
                          <input 
                            value={editingMaterial.codigo} 
                            onChange={(e) => setEditingMaterial({...editingMaterial, codigo: e.target.value})} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-bold font-mono"
                            placeholder="Ex: 100200"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Descrição</label>
                          <input 
                            value={editingMaterial.descricao} 
                            onChange={(e) => setEditingMaterial({...editingMaterial, descricao: e.target.value})} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500"
                            placeholder="Ex: Filtro de Ar"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Classe</label>
                          <input 
                            value={editingMaterial.classe} 
                            onChange={(e) => setEditingMaterial({...editingMaterial, classe: e.target.value})} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500"
                            placeholder="Ex: PEÇAS E ACESSORIOS"
                          />
                       </div>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsAlmoxarifadoModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                      <button onClick={handleSaveMaterial} disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                 </div>
              </div>
            )}
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
                  {/* Botão Nova Máquina (NOVO) */}
                  <button 
                    onClick={handleAddMachine}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 group hover:translate-y-[-1px]"
                  >
                    <Plus size={18} strokeWidth={3} /> Nova Máquina
                  </button>

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

              {/* ... (MANTENHA O BLOCO DO CARD DA TABELA IGUAL ESTAVA ANTES) ... */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                {/* ... Código da tabela (Search, Thead, Tbody) permanece igual ... */}
                 
                 {/* Apenas para referência: aqui estava a tabela. Mantenha o código original da tabela aqui. */}
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

            {/* MODAL DE EDIÇÃO / CRIAÇÃO (ATUALIZADO O TÍTULO) */}
            {isEditModalOpen && editingMachine && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {/* Título Dinâmico: Se tiver ID é Editar, senão é Nova Máquina */}
                        {editingMachine.id ? <Edit size={20} className="text-orange-600" /> : <Plus size={20} className="text-orange-600" />}
                        {editingMachine.id ? 'Editar Máquina' : 'Nova Máquina'}
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/50">
                      {/* Inputs com design arredondado */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Frota</label>
                          <input value={editingMachine.frota || ''} onChange={(e) => handleEditChange('frota', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-bold text-slate-700 bg-white" placeholder="Ex: TR-01" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo</label>
                          <input value={editingMachine.tipo || ''} onChange={(e) => handleEditChange('tipo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" placeholder="Caminhão" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nome da Máquina</label>
                        <input value={editingMachine.maquina || ''} onChange={(e) => handleEditChange('maquina', e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium bg-white" placeholder="Descrição completa" />
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
                      <button onClick={handleSaveEdit} className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:translate-y-[-1px]">Salvar</button>
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
              <div className="max-w-4xl mx-auto mt-8">
                <div className="text-center mb-10">
                   <h2 className="text-3xl font-black text-slate-800 mb-2">Central de Importação</h2>
                   <p className="text-slate-500">Escolha o método de importação de dados</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* OPÇÃO 1: ARQUIVO TXT (SAE) */}
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 hover:bg-orange-50/30 hover:border-orange-300 transition-all relative group flex flex-col items-center justify-center text-center h-64">
                    <input 
                      type="file" 
                      accept=".txt,.csv" 
                      onChange={handleSmartImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-orange-600" />
                    </div>
                    <h3 className="text-slate-800 font-bold text-lg mb-1">Arquivo TXT / CSV</h3>
                    <p className="text-sm text-slate-400">Relatórios SAE134 ou SAE127</p>
                  </div>

                  {/* OPÇÃO 2: INTEGRAÇÃO N8N */}
                  <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center h-auto min-h-[16rem] shadow-sm hover:shadow-md transition-all">
                    <div className="bg-purple-50 p-4 rounded-full mb-3 text-purple-600">
                      {/* Ícone de Raio/Automação */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                    </div>
                    <h3 className="text-slate-800 font-bold text-lg mb-1">Abastecimento n8n</h3>
                    <p className="text-sm text-slate-400 mb-4">Conectar via Webhook</p>
                    
                    {/* FILTROS (Enviados como parametros para o n8n) */}
                    <div className="flex gap-2 mb-4 w-full px-4">
                      <select 
                        value={jsonImportMonth} 
                        onChange={(e) => setJsonImportMonth(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-purple-500 bg-slate-50"
                      >
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select 
                        value={jsonImportYear} 
                        onChange={(e) => setJsonImportYear(e.target.value)}
                        className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-purple-500 bg-slate-50"
                      >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <button 
                      onClick={handleN8nImport}
                      disabled={loadingJson}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/20 transition-all hover:translate-y-[-2px] flex items-center gap-2 w-full justify-center"
                    >
                      {loadingJson ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processando...</>
                      ) : (
                        <><Download size={18} /> Importar do n8n</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // TELA DE PREVIEW E CONFIRMAÇÃO (MANTIDA IGUAL)
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
                
                {/* ALERTA DE FROTAS NÃO CADASTRADAS */}
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
                          <th className="px-6 py-3">Valor / Qtd</th>
                          <th className="px-6 py-3">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {importPreview.slice(0, 100).map((item, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50 ${item.unknownFleet ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-6 py-3 whitespace-nowrap">{formatDateBR(item.data)}</td>
                            
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
                                  {item.materia || item.descricao}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {item.classe}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 font-bold text-slate-800">
                              <div className="flex flex-col">
                                <span>{formatCurrency(item.valor)}</span>
                                {item.quantidade > 0 && (
                                  <span className="text-xs font-normal text-slate-500">{item.quantidade} Lt</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-xs text-slate-400">
                              Origem: {item.origem || 'TXT'}
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
        // Lógica auxiliar para o Modal de Conferência
        const getDadosConferencia = () => {
           // 1. Filtra pelo tipo da aba selecionada no modal (entrada ou saida)
           // 2. Filtra pela data (respeitando o filtro global selecionado na tela)
           const dadosFiltrados = expenses.filter(exp => {
              if (exp.tipo !== conferenciaTab) return false;

              // Filtro de Data (Reutilizando a lógica existente)
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
                   // Para simplificar no modal, mantemos lógica de Mês/Ano. 
                   // Se quiser Trimestre/Semestre exato, teria que replicar a lógica completa do useMemo.
                   // Assumindo Mês/Ano como principal:
                   matchesDate = expYear === filterYear && expMonth === filterMonth; 
                }
              }
              return matchesDate;
           });

           // 3. Agrupa por Classe e Soma
           const agrupado = dadosFiltrados.reduce((acc, curr) => {
              const classe = (curr.classe || 'SEM CLASSE').toUpperCase().trim();
              const valor = Number(curr.valor) || 0;
              acc[classe] = (acc[classe] || 0) + valor;
              return acc;
           }, {});

           // 4. Converte para array e ordena pelo maior valor
           return Object.entries(agrupado)
              .map(([classe, total]) => ({ classe, total }))
              .sort((a, b) => b.total - a.total);
        };

        const dadosConferencia = isConferenciaModalOpen ? getDadosConferencia() : [];
        const totalConferencia = dadosConferencia.reduce((acc, curr) => acc + curr.total, 0);

        return (
          <>
            <div className="space-y-6 animate-fadeIn">
              
              {/* HEADER E BOTÕES */}
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
                  {/* BOTÃO CONFERÊNCIA (NOVO) */}
                  <button 
                    onClick={() => { setConferenciaTab('entrada'); setIsConferenciaModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all hover:translate-y-[-2px]"
                  >
                    <ClipboardList size={20} /> Conferência
                  </button>

                  {/* BOTÃO DE EMERGÊNCIA */}
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

              {/* CARD DE FILTROS */}
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

              {/* TABELA DINÂMICA */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                 <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
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
                            
                            <td className={`px-6 py-4 text-right font-bold ${Number(exp.valor) < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                              {formatCurrency(exp.valor)}
                            </td>

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

            {/* --- MODAL DE CONFERÊNCIA (NOVO) --- */}
            {isConferenciaModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                    
                    {/* Header do Modal */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col bg-slate-50 gap-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <ClipboardList size={22} className="text-indigo-600"/> Conferência de Classes
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide font-bold">
                             Resumo por Classe ({filterMonth}/{filterYear})
                          </p>
                        </div>
                        <button onClick={() => setIsConferenciaModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full"><X size={20} /></button>
                      </div>

                      {/* Seletor de Abas do Modal */}
                      <div className="flex bg-slate-200 p-1 rounded-xl self-start">
                         <button 
                            onClick={() => setConferenciaTab('entrada')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${conferenciaTab === 'entrada' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                            <ArrowDownCircle size={14} /> Entradas
                         </button>
                         <button 
                            onClick={() => setConferenciaTab('saida')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${conferenciaTab === 'saida' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                            <ArrowUpCircle size={14} /> Saídas
                         </button>
                      </div>
                    </div>
                    
                    {/* Conteúdo da Tabela */}
                    <div className="overflow-y-auto flex-1 bg-white custom-scrollbar">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 font-bold">Classe</th>
                            <th className="px-6 py-3 text-right font-bold">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {dadosConferencia.map((item, idx) => (
                             <tr key={idx} className="hover:bg-slate-50">
                               <td className="px-6 py-3 font-medium text-slate-700">{item.classe}</td>
                               <td className="px-6 py-3 text-right font-bold text-slate-800">{formatCurrency(item.total)}</td>
                             </tr>
                           ))}
                           {dadosConferencia.length === 0 && (
                             <tr>
                               <td colSpan="2" className="p-8 text-center text-slate-400">Nenhum registro encontrado para este filtro.</td>
                             </tr>
                           )}
                        </tbody>
                        {dadosConferencia.length > 0 && (
                          <tfoot className="bg-slate-100 sticky bottom-0 border-t border-slate-200">
                             <tr>
                               <td className="px-6 py-3 font-black text-slate-600 uppercase text-right">Total Geral</td>
                               <td className="px-6 py-3 text-right font-black text-indigo-700 text-lg">{formatCurrency(totalConferencia)}</td>
                             </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setIsConferenciaModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors">Fechar</button>
                    </div>
                 </div>
              </div>
            )}

            {/* MODAL DE DETALHES (NOTA FISCAL) - MANTIDO DO CÓDIGO ORIGINAL */}
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
        case 'resumo':
        // --- 1. CATEGORIAS PARA CÁLCULO ---
        const R_CAT_FURTO_RESUMO = ["PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"];
        
        // --- 2. PREPARAÇÃO DOS FILTROS (CASCATA) ---
        // Lista única de Segmentos
        const uniqueSegmentos = [...new Set(machines.map(m => m.segmento).filter(Boolean))].sort();
        
        // Lista de Localizações (Filtrada pelo Segmento selecionado)
        const uniqueLocalizacoes = [...new Set(
          machines
            .filter(m => !resumoSegmento || m.segmento === resumoSegmento)
            .map(m => m.localizacao)
            .filter(Boolean)
        )].sort();

        // --- 3. FUNÇÃO DE DATA (Reutilizada) ---
        const isInPeriodResumo = (expData) => {
             if (!expData) return false;
             const dateParts = expData.includes('/') ? expData.split('/') : expData.split('-');
             const d = expData.includes('/') 
                ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
                : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
             
             const m = d.getMonth() + 1; 
             const y = String(d.getFullYear());

             if (y !== filterYear) return false;
             if (filterPeriod === 'Ano') return true;
             else if (filterPeriod === 'Mês') return String(m) === filterMonth;
             else if (filterPeriod === 'Trimestre') return String(Math.ceil(m / 3)) === filterMonth;
             else if (filterPeriod === 'Semestre') return String(Math.ceil(m / 6)) === filterMonth;
             return false;
        };

        // --- 4. PROCESSAMENTO DOS DADOS ---
        // Filtra máquinas pelos selects de Segmento e Localização
        const maquinasFiltradasResumo = machines.filter(m => {
           const matchSeg = !resumoSegmento || m.segmento === resumoSegmento;
           const matchLoc = !resumoLocalizacao || m.localizacao === resumoLocalizacao;
           return matchSeg && matchLoc;
        });

        const dadosResumo = maquinasFiltradasResumo.map(m => {
           let vlrCombustivel = 0;
           let vlrManutencaoGeral = 0; // Soma de Manut + Pneus + Fixas + Gerais

           // Filtra despesas da máquina no período
           const despesas = expenses.filter(exp => exp.frota === m.frota && isInPeriodResumo(exp.data));

           despesas.forEach(exp => {
              const valor = Number(exp.valor) || 0;
              const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();

              // Ignora Furto
              if (R_CAT_FURTO_RESUMO.some(c => termo.includes(c))) return;

              // Separa Combustível vs Resto
              if (termo === "OLEO DIESEL" || termo.includes("COMBUSTIVEL")) {
                 vlrCombustivel += valor;
              } else {
                 // Conforme solicitado: Manutenção, MO, Pneus, Gerais e Fixas entram aqui
                 vlrManutencaoGeral += valor;
              }
           });

           return {
              ...m,
              vlrCombustivel,
              vlrManutencaoGeral,
              totalDespesas: vlrCombustivel + vlrManutencaoGeral
           };
        });

        // Ordenar por Frota
        dadosResumo.sort((a, b) => {
            const numA = parseInt(a.frota.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.frota.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        // Totais Gerais
        const totalCombustivelResumo = dadosResumo.reduce((acc, curr) => acc + curr.vlrCombustivel, 0);
        const totalManutencaoResumo = dadosResumo.reduce((acc, curr) => acc + curr.vlrManutencaoGeral, 0);
        const totalGeralResumo = dadosResumo.reduce((acc, curr) => acc + curr.totalDespesas, 0);

        return (
          <div className="space-y-6 animate-fadeIn h-full flex flex-col">
            <header className="mb-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Resumo de Custos</h2>
                 <p className="text-slate-500 font-medium">Visão consolidada por Segmento e Localização</p>
               </div>
            </header>

            {/* --- BARRA DE FILTROS --- */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              
              {/* Filtros de Data */}
              <div className="md:col-span-4 flex gap-2">
                 <div className="w-1/3">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Período</label>
                   <select value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setFilterMonth('1'); }} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none text-sm">
                      {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                 </div>
                 {filterPeriod !== 'Ano' && (
                   <div className="flex-1">
                     <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{filterPeriod}</label>
                     <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none">
                        {filterPeriod === 'Mês' && MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        {filterPeriod === 'Trimestre' && (<><option value="1">1º Trimestre</option><option value="2">2º Trimestre</option><option value="3">3º Trimestre</option><option value="4">4º Trimestre</option></>)}
                        {filterPeriod === 'Semestre' && (<><option value="1">1º Semestre</option><option value="2">2º Semestre</option></>)}
                     </select>
                   </div>
                 )}
                 <div className="w-24">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ano</label>
                   <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>
              </div>

              {/* Filtro Segmento */}
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Segmento</label>
                <select 
                  value={resumoSegmento} 
                  onChange={(e) => { 
                    setResumoSegmento(e.target.value); 
                    setResumoLocalizacao(''); // Reseta localização ao mudar segmento
                  }} 
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Todos os Segmentos</option>
                  {uniqueSegmentos.map(seg => (
                    <option key={seg} value={seg}>{seg}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Localização (Dependente) */}
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Localização</label>
                <select 
                  value={resumoLocalizacao} 
                  onChange={(e) => setResumoLocalizacao(e.target.value)} 
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!resumoSegmento} // Desabilita se não tiver segmento selecionado (opcional)
                >
                  <option value="">Todas as Localizações</option>
                  {uniqueLocalizacoes.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* --- TABELA RESUMO --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
               {/* Header da Tabela (Estilo Verde conforme referência ou Laranja do sistema) */}
               <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-white uppercase tracking-wider text-sm">
                    {resumoSegmento ? `Resumo: ${resumoSegmento}` : 'Resumo Geral'} 
                    {resumoLocalizacao && ` - ${resumoLocalizacao}`}
                  </span>
               </div>

               <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-3">Frota</th>
                        <th className="px-6 py-3">Máquina</th>
                        <th className="px-6 py-3">Localização</th>
                        <th className="px-6 py-3 text-right">Combustível</th>
                        <th className="px-6 py-3 text-right">Manutenção (Geral)</th>
                        <th className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-100">Total Despesas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dadosResumo.length > 0 ? (
                        dadosResumo.map((row) => (
                          <tr key={row.id} className="hover:bg-orange-50/20 transition-colors">
                            <td className="px-6 py-3 font-bold text-slate-700">{row.frota}</td>
                            <td className="px-6 py-3 text-slate-600">{row.maquina}</td>
                            <td className="px-6 py-3 text-slate-500 text-xs">{row.localizacao}</td>
                            <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.vlrCombustivel)}</td>
                            <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.vlrManutencaoGeral)}</td>
                            <td className="px-6 py-3 text-right font-black text-slate-800 bg-slate-50/50">{formatCurrency(row.totalDespesas)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" className="p-10 text-center text-slate-400">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                      )}
                    </tbody>
                    
                    {/* RODAPÉ DE TOTAIS */}
                    {dadosResumo.length > 0 && (
                      <tfoot className="bg-slate-800 text-white sticky bottom-0 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-10">
                        <tr>
                          <td colSpan="3" className="px-6 py-4 font-bold text-right uppercase tracking-wider text-slate-300">Totais</td>
                          <td className="px-6 py-4 text-right font-bold border-l border-slate-600">{formatCurrency(totalCombustivelResumo)}</td>
                          <td className="px-6 py-4 text-right font-bold border-l border-slate-600">{formatCurrency(totalManutencaoResumo)}</td>
                          <td className="px-6 py-4 text-right font-black text-lg bg-slate-900 border-l border-slate-600">{formatCurrency(totalGeralResumo)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
               </div>
            </div>
          </div>
        );
case 'motores':
        // --- 1. DEFINIÇÕES LOCAIS ---
        const M_CAT_PECAS_SERV = [
          "MANUT. POR DESGASTE (MAQUINAS PESADAS)", "MANUT. PREVENTIVA (FROTA / MAQ)",
          "MANUT. CORRETIVA (FROTA / MAQ)", "REFORMA DE FROTA ( VEICULOS / EQUIP. )",
          "FRETES S/ COMPRAS", "MANUT/ PECAS E ACESSORIOS EQUIPAMENTOS",
          "MATERIAL DE USO E CONSUMO", "FERRAMENTAS", "MANUT. POR ACIDENTE (FROTA / MAQ)",
          "MANUTENCAO / PECAS E ACES. VEICULOS", "MANUT. MAQUINAS E EQUIPAMENTOS",
          "MANUT/ PECAS E ACESSORIOS MAQUINAS", "REFORMA ALTERNADOR (MAQUINAS)",
          "REFORMA MOTOR DE PARTIDA (MAQUINAS)", "DESPESAS DE VIAGENS E HOSPEDAGENS",
          "GAS GLP", "OXIGENIO / GAS P/ SOLDA", "MATERIAL DE SEGURANCA E PROTECAO",
          "TUBOS E CONEXOES", "SERVIÇOS DE GUINCHO", "LOCAÇÃO DE MAQUINAS E EQUIPAMENTOS",
          "SERVICOS DE TERCEIROS – INTERNO", "SERVICOS DE TERCEIROS – EXTERNO",
          "SERVICOS DE TERCEIROS (FROTA E MAQ)", "SERVICOS DE TERCEIROS (EQUIPAMENTOS)",
          "SERVICOS DE TERCEIROS"
        ];
        const M_CAT_PNEUS = ["PNEUS E CAMARAS", "PNEUS E CAMERAS – NOVOS", "PNEUS RESSOLADOS", "SERVICOS DE PNEUS / BORRACHARIA"];
        const M_CAT_MO_INTERNA = ["RAT CUSTO-ADM"];
        const M_CAT_FURTO = ["PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"];

        const CAT_MANUTENCAO_MOTORES = [
          ...M_CAT_PECAS_SERV,
          ...M_CAT_PNEUS,
          ...M_CAT_MO_INTERNA
        ];

        // --- 2. FILTRO DE DATA ---
        const isInPeriodMotores = (expData) => {
             if (!expData) return false;
             const dateParts = expData.includes('/') ? expData.split('/') : expData.split('-');
             const d = expData.includes('/') 
                ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
                : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
             const m = String(d.getMonth() + 1);
             const y = String(d.getFullYear());
             if (filterPeriod === 'Ano') return y === filterYear;
             return y === filterYear && m === filterMonth;
        };

        // --- 3. PROCESSAMENTO EXCLUSIVO DE MOTORES ---
        // Filtra máquinas que são MOTOR PURO
        const motoresData = machines
          .filter(m => {
             const tipo = (m.tipo || '').toUpperCase();
             const nome = (m.maquina || '').toUpperCase().trim();
             // SÓ MOSTRA SE for MOTOR e NÃO for "Motor da/do..."
             return tipo === 'MOTOR' && !nome.startsWith('MOTOR DA') && !nome.startsWith('MOTOR DO');
          })
          .map(m => {
             let vlrManutencao = 0;
             let vlrOutras = 0;

             const despesas = expenses.filter(exp => exp.frota === m.frota && isInPeriodMotores(exp.data));

             despesas.forEach(exp => {
                const val = Number(exp.valor) || 0;
                const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();

                if (M_CAT_FURTO.some(c => termo.includes(c))) return; 

                if (CAT_MANUTENCAO_MOTORES.some(cat => termo.includes(cat) || cat.includes(termo))) {
                   vlrManutencao += val;
                } else {
                   vlrOutras += val;
                }
             });

             return {
                ...m,
                vlrManutencao,
                vlrOutras,
                totalGeral: vlrManutencao + vlrOutras
             };
          });
        
        // Ordenação
        motoresData.sort((a, b) => a.frota.localeCompare(b.frota, undefined, {numeric: true}));

        // Totais
        const totalManutencaoMotores = motoresData.reduce((acc, curr) => acc + curr.vlrManutencao, 0);
        const totalOutrasMotores = motoresData.reduce((acc, curr) => acc + curr.vlrOutras, 0);
        const totalGeralMotores = motoresData.reduce((acc, curr) => acc + curr.totalGeral, 0);

        return (
          <div className="space-y-6 animate-fadeIn h-full flex flex-col">
            <header className="mb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Controle de Motores</h2>
                 <p className="text-slate-500 font-medium">Custos específicos de manutenção de motores</p>
               </div>

               {/* FILTROS DE DATA */}
               <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
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
            </header>

            {/* TABELA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
               <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-3">Frota</th>
                        <th className="px-6 py-3">Máquina (Motor)</th>
                        <th className="px-6 py-3">Localização</th>
                        <th className="px-6 py-3">Segmento</th>
                        <th className="px-6 py-3 text-right">Manutenção</th>
                        <th className="px-6 py-3 text-right">Outras Despesas</th>
                        <th className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-100">Total Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {motoresData.length > 0 ? (
                        motoresData.map((row) => (
                          <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-6 py-3 font-bold text-slate-700">{row.frota}</td>
                            <td className="px-6 py-3 text-slate-600">{row.maquina}</td>
                            <td className="px-6 py-3 text-slate-500 text-xs">{row.localizacao}</td>
                            <td className="px-6 py-3 text-slate-500 text-xs">{row.segmento}</td>
                            <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.vlrManutencao)}</td>
                            <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(row.vlrOutras)}</td>
                            <td className="px-6 py-3 text-right font-black text-slate-800 bg-slate-50/50">{formatCurrency(row.totalGeral)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="7" className="p-10 text-center text-slate-400">Nenhum motor encontrado ou sem despesas no período. <br/>Verifique se cadastrou a frota com Tipo = "MOTOR".</td></tr>
                      )}
                    </tbody>
                    
                    {/* RODAPÉ DE TOTAIS */}
                    {motoresData.length > 0 && (
                      <tfoot className="bg-slate-800 text-white sticky bottom-0 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-10">
                        <tr>
                          <td colSpan="4" className="px-6 py-4 font-bold text-right uppercase tracking-wider text-slate-300">Totais</td>
                          <td className="px-6 py-4 text-right font-bold border-l border-slate-600">{formatCurrency(totalManutencaoMotores)}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-300 border-l border-slate-600">{formatCurrency(totalOutrasMotores)}</td>
                          <td className="px-6 py-4 text-right font-black text-lg bg-slate-900 border-l border-slate-600">{formatCurrency(totalGeralMotores)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
               </div>
            </div>
          </div>
        );
      case 'fechamento':
        // --- 1. DEFINIÇÃO DAS CATEGORIAS ---
        const CAT_PECAS_SERV = [
          "MANUT. POR DESGASTE (MAQUINAS PESADAS)", "MANUT. PREVENTIVA (FROTA / MAQ)",
          "MANUT. CORRETIVA (FROTA / MAQ)", "REFORMA DE FROTA ( VEICULOS / EQUIP. )",
          "FRETES S/ COMPRAS", "MANUT/ PECAS E ACESSORIOS EQUIPAMENTOS",
          "MATERIAL DE USO E CONSUMO", "FERRAMENTAS", "MANUT. POR ACIDENTE (FROTA / MAQ)",
          "MANUTENCAO / PECAS E ACES. VEICULOS", "MANUT. MAQUINAS E EQUIPAMENTOS",
          "MANUT/ PECAS E ACESSORIOS MAQUINAS", "REFORMA ALTERNADOR (MAQUINAS)",
          "REFORMA MOTOR DE PARTIDA (MAQUINAS)", "DESPESAS DE VIAGENS E HOSPEDAGENS",
          "GAS GLP", "OXIGENIO / GAS P/ SOLDA", "MATERIAL DE SEGURANCA E PROTECAO",
          "TUBOS E CONEXOES", "SERVIÇOS DE GUINCHO", "LOCAÇÃO DE MAQUINAS E EQUIPAMENTOS",
          "SERVICOS DE TERCEIROS – INTERNO", "SERVICOS DE TERCEIROS – EXTERNO",
          "SERVICOS DE TERCEIROS (FROTA E MAQ)", "SERVICOS DE TERCEIROS (EQUIPAMENTOS)",
          "SERVICOS DE TERCEIROS"
        ];
        const CAT_PNEUS = ["PNEUS E CAMARAS", "PNEUS E CAMERAS – NOVOS", "PNEUS RESSOLADOS", "SERVICOS DE PNEUS / BORRACHARIA"];
        const CAT_FIXAS = ["SEGUROS", "DPVAT (SEGURO OBRIGATORIO)", "LICENCIAMENTO", "MENSALIDADES"];
        const CAT_GERAIS = ["LAVAGEM DE FROTAS", "RAT DESP FINANCEIRAS", "MOTO TAXI", "TAXA DE COBRANÇA", "OLEO DIESEL", "BENS PEQUENO VALOR (ATIVO PERMANENTE)"];
        const CAT_FURTO = ["PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"];
        const CAT_MO_INTERNA = ["RAT CUSTO-ADM"];

        // --- 2. FUNÇÃO AUXILIAR DE FILTRO DE DATA ---
        const isInPeriod = (expData) => {
             if (!expData) return false;
             const dateParts = expData.includes('/') ? expData.split('/') : expData.split('-');
             const d = expData.includes('/') 
                ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
                : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
             
             const m = String(d.getMonth() + 1);
             const y = String(d.getFullYear());

             if (filterPeriod === 'Ano') return y === filterYear;
             return y === filterYear && m === filterMonth;
        };

        // --- 3. CÁLCULO DO RATEIO (95102) ---
        const despesasRateio = expenses.filter(exp => exp.frota === '95102' && isInPeriod(exp.data));
        const totalValorRateio = despesasRateio.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

        // --- 4. PRÉ-PROCESSAMENTO DAS MÁQUINAS ---
        let preCalculatedMachines = machines
          .filter(m => {
             // REGRA: Mostrar TUDO, exceto "Motores Puros"
             const tipo = (m.tipo || '').toUpperCase();
             const nome = (m.maquina || '').toUpperCase().trim();
             // Se for MOTOR e NÃO for "Motor da/do", então ESCONDE (é do menu Motores)
             // Se for MOTOR e FOR "Motor da/do", MOSTRA
             // Se NÃO for MOTOR, MOSTRA
             const ehMotorPuro = tipo === 'MOTOR' && !nome.startsWith('MOTOR DA') && !nome.startsWith('MOTOR DO');
             return !ehMotorPuro;
          })
          .map(m => {
          let vlrCombustivel = 0, vlrManutencao = 0, vlrMO = 0, vlrPneus = 0, vlrFixas = 0, vlrGerais = 0;
          let vlrFurto = 0;
          let litrosAbastecidos = 0;
          
          const despesasNoPeriodo = expenses.filter(exp => exp.frota === m.frota && isInPeriod(exp.data));

          // Cálculo de Horas
          let horasTrabalhadas = 0;
          const historicoHorimetros = expenses
            .filter(exp => exp.frota === m.frota && Number(exp.horimetro) > 0)
            .map(exp => {
              const dParts = exp.data.includes('/') ? exp.data.split('/') : exp.data.split('-');
              const dataObj = exp.data.includes('/') 
                ? new Date(dParts[2], dParts[1] - 1, dParts[0]) 
                : new Date(dParts[0], dParts[1] - 1, dParts[2]);
              return { ...exp, dataObj, valorHorimetro: Number(exp.horimetro) };
            })
            .sort((a, b) => a.dataObj - b.dataObj);

          const registrosDoMes = historicoHorimetros.filter(h => isInPeriod(h.data));

          if (registrosDoMes.length > 0) {
             const ultimoDoMes = registrosDoMes[registrosDoMes.length - 1];
             const primeiroDoMes = registrosDoMes[0];
             const indexPrimeiro = historicoHorimetros.findIndex(h => h.id === primeiroDoMes.id);
             const registroAnterior = indexPrimeiro > 0 ? historicoHorimetros[indexPrimeiro - 1] : null;

             if (registroAnterior) {
                horasTrabalhadas = ultimoDoMes.valorHorimetro - registroAnterior.valorHorimetro;
             } else {
                horasTrabalhadas = ultimoDoMes.valorHorimetro - primeiroDoMes.valorHorimetro;
             }
             if (horasTrabalhadas < 0) horasTrabalhadas = 0;
          }

          despesasNoPeriodo.forEach(exp => {
            const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();
            const valor = Number(exp.valor) || 0;
            const qtd = Number(exp.quantidade) || 0;

            if (CAT_MO_INTERNA.includes(termo)) vlrMO += valor;
            else if (CAT_PNEUS.includes(termo)) vlrPneus += valor;
            else if (CAT_FIXAS.includes(termo)) vlrFixas += valor;
            else if (CAT_GERAIS.includes(termo)) {
              if (termo === "OLEO DIESEL") {
                 vlrCombustivel += valor; 
                 litrosAbastecidos += qtd;
              } else {
                 vlrGerais += valor;
              }
            } 
            else if (CAT_FURTO.includes(termo)) vlrFurto += valor;
            else if (CAT_PECAS_SERV.includes(termo)) vlrManutencao += valor;
            else vlrManutencao += valor; 
          });

          const totalManutencao = vlrManutencao + vlrMO + vlrPneus;

          return {
            ...m,
            vlrCombustivel, vlrManutencao, vlrMO, vlrPneus, vlrFixas, vlrGerais, vlrFurto,
            litrosAbastecidos, totalManutencao,
            horasTrabalhadas: horasTrabalhadas 
          };
        });

        const maquinasComManutencao = preCalculatedMachines.filter(m => m.totalManutencao > 0).length;
        const valorRateioPorMaquina = maquinasComManutencao > 0 ? (totalValorRateio / maquinasComManutencao) : 0;

        const fechamentoData = preCalculatedMachines.map(m => {
           let finalGerais = m.vlrGerais;
           if (m.totalManutencao > 0) {
              finalGerais += valorRateioPorMaquina;
           }
           const totalDespesas = m.vlrCombustivel + m.totalManutencao + m.vlrFixas + finalGerais;
           const horas = m.horasTrabalhadas || 0; 
           
           return {
             ...m,
             vlrGerais: finalGerais,
             totalDespesas,
             mediaLitrosHora: horas > 0 ? m.litrosAbastecidos / horas : 0,
             combustivelHora: horas > 0 ? m.vlrCombustivel / horas : 0,
             custoHora: horas > 0 ? totalDespesas / horas : 0,
             custoHoraSemComb: horas > 0 ? (totalDespesas - m.vlrCombustivel) / horas : 0
           };
        });

        fechamentoData.sort((a, b) => {
            const numA = parseInt(a.frota.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.frota.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        const filteredFechamentoData = fechamentoData.filter(item => {
           const search = fechamentoSearch.toLowerCase();
           return (
              (item.frota && item.frota.toLowerCase().includes(search)) ||
              (item.maquina && item.maquina.toLowerCase().includes(search)) ||
              (item.tipo && item.tipo.toLowerCase().includes(search)) ||
              (item.segmento && item.segmento.toLowerCase().includes(search))
           );
        });

        return (
           <div className="space-y-4 animate-fadeIn flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 px-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Fechamento Mensal</h2>
                <div className="flex items-center gap-2">
                   <p className="text-slate-500 text-sm">Relatório Analítico Consolidado</p>
                   {totalValorRateio > 0 && (
                     <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-bold">
                       Rateio (95102): {formatCurrency(totalValorRateio)} ÷ {maquinasComManutencao} máq.
                     </span>
                   )}
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative">
                   <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                   <input 
                      type="text" 
                      placeholder="Pesquisar frota..." 
                      value={fechamentoSearch}
                      onChange={(e) => setFechamentoSearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 w-48 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none"
                   />
                </div>

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
                
                <button 
                  onClick={() => handleExportFechamentoExcel(filteredFechamentoData)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all"
                >
                  <Download size={18}/> Excel
                </button>
              </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
               <div className="overflow-auto custom-scrollbar flex-1 w-full h-full"> 
                  <table className="w-full text-xs text-left text-slate-600 whitespace-nowrap border-collapse">
                    <thead className="text-xs text-slate-500 font-bold uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 bg-slate-100 sticky left-0 z-50 border-r border-slate-300 min-w-[80px] text-slate-700">Frota</th>
                        <th className="px-4 py-3 min-w-[150px] bg-slate-50">Máquina</th>
                        <th className="px-4 py-3 bg-slate-50">Tipo</th>
                        <th className="px-4 py-3 bg-slate-50">Localização</th>
                        <th className="px-4 py-3 border-r border-slate-100 bg-slate-50">Segmento</th>
                        
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right">Horas Trab.</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right">Litros</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-700 text-right border-r border-blue-100">Méd. L/H</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">R$ Comb/H</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-100 bg-slate-50">R$ Combustível</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">Manutenção</th>
                        <th className="px-4 py-3 text-right bg-slate-50">M.O. Interna</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Pneus</th>
                        <th className="px-4 py-3 text-right font-bold text-red-600 bg-red-50 border-r border-red-100">Total Manut.</th>
                        
                        <th className="px-4 py-3 text-right bg-slate-50">Fixas</th>
                        <th className="px-4 py-3 text-right border-r border-slate-100 bg-slate-50">Gerais</th>

                        <th className="px-4 py-3 text-right font-black text-slate-800 bg-slate-100">Total Geral</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-800 bg-orange-50">Custo/Hora</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 bg-orange-50 border-r border-orange-100">S/ Combust.</th>

                        <th className="px-4 py-3 text-right font-bold text-amber-900 bg-amber-200">Furto e Roubo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFechamentoData.map((row) => (
                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
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
                          <td className="px-4 py-2 text-right font-bold text-slate-600 bg-orange-50/20 border-r border-orange-100">{formatCurrency(row.custoHoraSemComb)}</td>

                          <td className="px-4 py-2 text-right font-bold text-amber-900 bg-amber-100">
                             {formatCurrency(row.vlrFurto)}
                          </td>
                        </tr>
                      ))}
                      
                      <tr className="bg-slate-800 text-white font-bold sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                          <td className="px-4 py-3 sticky left-0 bg-slate-800 z-50 border-r border-slate-600">TOTAIS</td>
                          <td colSpan="4" className="border-r border-slate-700"></td>
                          
                          <td className="px-4 py-3 text-right text-blue-200">{filteredFechamentoData.reduce((a,b)=>a+b.horasTrabalhadas,0)}</td>
                          <td className="px-4 py-3 text-right text-blue-200">{filteredFechamentoData.reduce((a,b)=>a+b.litrosAbastecidos,0)}</td>
                          <td className="border-r border-slate-700"></td>

                          <td className="border-r border-slate-700"></td>
                          <td className="px-4 py-3 text-right text-white border-r border-slate-700">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrCombustivel,0))}</td>

                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrManutencao,0))}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrMO,0))}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrPneus,0))}</td>
                          <td className="px-4 py-3 text-right text-red-300 border-r border-slate-700">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.totalManutencao,0))}</td>

                          <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrFixas,0))}</td>
                          <td className="px-4 py-3 text-right border-r border-slate-700">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrGerais,0))}</td>

                          <td className="px-4 py-3 text-right text-white bg-slate-900">{formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.totalDespesas,0))}</td>
                          <td colSpan="2" className="border-r border-slate-700"></td>

                          <td className="px-4 py-3 text-right text-amber-900 bg-amber-300">
                             {formatCurrency(filteredFechamentoData.reduce((a,b)=>a+b.vlrFurto,0))}
                          </td>
                      </tr>
                    </tbody>
                  </table>
               </div>
            </div>
           </div>
        );
case 'reports':
        // --- 1. DEFINIÇÃO DE CATEGORIAS ---
        const R_CAT_PNEUS = [
          "PNEUS E CAMARAS", "PNEUS E CAMERAS – NOVOS", 
          "PNEUS RESSOLADOS", "SERVICOS DE PNEUS / BORRACHARIA"
        ];
        const R_CAT_FIXAS = [
          "SEGUROS", "DPVAT (SEGURO OBRIGATORIO)", "LICENCIAMENTO", 
          "IPVA", "TAXA DE LICENCIAMENTO", "MENSALIDADES" // Incluído Mensalidades aqui
        ];
        const R_CAT_GERAIS = [
          "LAVAGEM DE FROTAS", "RAT DESP FINANCEIRAS", "MOTO TAXI", 
          "TAXA DE COBRANÇA", "BENS PEQUENO VALOR (ATIVO PERMANENTE)",
          "TAXAS DIVERSAS", "PEDAGIO", "ALIMENTACAO"
        ];
        const R_CAT_FURTO = ["PEÇAS E ACESSORIOS SUBST. DEVIDO A FURTO"];
        
        // NOVO: M.O. INTERNA
        const R_CAT_MO_INTERNA = ["RAT CUSTO-ADM"];

        // Lista base de manutenção
        const R_CAT_MANUTENCAO_LISTA = [
          "MANUT. POR DESGASTE (MAQUINAS PESADAS)", "MANUT. PREVENTIVA (FROTA / MAQ)",
          "MANUT. CORRETIVA (FROTA / MAQ)", "REFORMA DE FROTA ( VEICULOS / EQUIP. )",
          "MANUT/ PECAS E ACESSORIOS EQUIPAMENTOS", "FERRAMENTAS", 
          "MANUT. POR ACIDENTE (FROTA / MAQ)", "MANUTENCAO / PECAS E ACES. VEICULOS", 
          "MANUT. MAQUINAS E EQUIPAMENTOS", "MANUT/ PECAS E ACESSORIOS MAQUINAS", 
          "REFORMA ALTERNADOR (MAQUINAS)", "REFORMA MOTOR DE PARTIDA (MAQUINAS)",
          "TUBOS E CONEXOES", "SERVIÇOS DE GUINCHO", "SERVICOS DE TERCEIROS",
          "MATERIAL DE USO E CONSUMO", "MATERIAL DE SEGURANCA E PROTECAO",
          "LOCAÇÃO DE MAQUINAS E EQUIPAMENTOS", "GAS GLP", "OXIGENIO / GAS P/ SOLDA",
          "SERVICOS DE TERCEIROS – INTERNO", "SERVICOS DE TERCEIROS – EXTERNO",
          "SERVICOS DE TERCEIROS (FROTA E MAQ)", "SERVICOS DE TERCEIROS (EQUIPAMENTOS)"
        ];

        // Listas para Selects Principais
        const tiposDisponiveis = [...new Set(machines.map(m => m.tipo).filter(Boolean))].sort();
        const segmentosDisponiveis = [...new Set(machines.map(m => m.segmento).filter(Boolean))].sort();

        // --- 2. FUNÇÃO GERADORA DO DASHBOARD ---
        const handleGenerateReport = () => {
          setGeneratedReport(null);
          setReportSummary(null);
          setIsManutencaoReportOpen(false);
          setIsDetailsModalOpen(false);
          setManutencaoModalFilter(''); 

          let frotasAlvo = [];

          if (reportEspecie === 'maquina') {
            const frotaDigitada = reportFilterValue.trim();
            if (!frotaDigitada) {
               frotasAlvo = machines.map(m => m.frota);
            } else {
               frotasAlvo = machines
                 .filter(m => m.frota.includes(frotaDigitada))
                 .map(m => m.frota);
            }
          } else if (reportEspecie === 'tipo') {
             frotasAlvo = machines.filter(m => m.tipo === reportFilterValue).map(m => m.frota);
          } else if (reportEspecie === 'segmento') {
             frotasAlvo = machines.filter(m => m.segmento === reportFilterValue).map(m => m.frota);
          }

          if (frotasAlvo.length === 0) {
            alert("Nenhum registro encontrado para este filtro.");
            return;
          }

          // Função de Data
          const isInPeriodReport = (expData) => {
             if (!expData) return false;
             const dateParts = expData.includes('/') ? expData.split('/') : expData.split('-');
             const d = expData.includes('/') 
                ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) 
                : new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
             
             const m = d.getMonth() + 1; 
             const y = String(d.getFullYear());

             if (y !== filterYear) return false;
             if (filterPeriod === 'Ano') return true;
             else if (filterPeriod === 'Mês') return String(m) === filterMonth;
             else if (filterPeriod === 'Trimestre') return String(Math.ceil(m / 3)) === filterMonth;
             else if (filterPeriod === 'Semestre') return String(Math.ceil(m / 6)) === filterMonth;
             return false;
          };

          // --- CÁLCULO DO RATEIO GLOBAL ---
          const despesasRateio = expenses.filter(exp => exp.frota === '95102' && isInPeriodReport(exp.data));
          const totalValorRateio = despesasRateio.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
          
          let contadorMaquinasComManutencao = 0;
          
          machines.forEach(m => {
             const despesasDaMaquina = expenses.filter(exp => exp.frota === m.frota && isInPeriodReport(exp.data));
             const teveManutencao = despesasDaMaquina.some(exp => {
                const val = Number(exp.valor) || 0;
                if (val === 0) return false;
                const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();
                
                const isFurto = R_CAT_FURTO.some(c => termo.includes(c));
                const isFixas = R_CAT_FIXAS.some(c => termo.includes(c));
                const isGerais = R_CAT_GERAIS.some(c => termo.includes(c));
                const isCombustivel = termo === "OLEO DIESEL" || termo.includes("COMBUSTIVEL");
                
                // M.O Interna É manutenção para fins de rateio? Sim.
                const isMO = R_CAT_MO_INTERNA.some(c => termo.includes(c));
                const isPneus = R_CAT_PNEUS.some(c => termo.includes(c));

                if (isPneus || isMO) return true;
                if (isFurto || isFixas || isGerais || isCombustivel) return false;
                return true;
             });
             if (teveManutencao) contadorMaquinasComManutencao++;
          });

          const valorRateioPorMaquina = contadorMaquinasComManutencao > 0 
              ? totalValorRateio / contadorMaquinasComManutencao 
              : 0;

          // --- PROCESSAMENTO ---
          let somaTotal = 0, somaCombustivel = 0, somaManutencao = 0, somaOutros = 0, somaHoras = 0;
          let listaManutencao = [];
          let categoriasChart = {};

          const maquinasDoRelatorio = machines.filter(m => frotasAlvo.includes(m.frota));

          maquinasDoRelatorio.forEach(m => {
              let maquinaTeveManutencao = false;

              // A. Calcular Horas
              let horasDaMaquina = 0;
              const historicoHorimetros = expenses
                  .filter(exp => exp.frota === m.frota && Number(exp.horimetro) > 0)
                  .map(exp => {
                    const dParts = exp.data.includes('/') ? exp.data.split('/') : exp.data.split('-');
                    const dataObj = exp.data.includes('/') ? new Date(dParts[2], dParts[1] - 1, dParts[0]) : new Date(dParts[0], dParts[1] - 1, dParts[2]);
                    return { ...exp, dataObj, valorHorimetro: Number(exp.horimetro) };
                  })
                  .sort((a, b) => a.dataObj - b.dataObj);

              const registrosDoPeriodo = historicoHorimetros.filter(h => isInPeriodReport(h.data));
              if (registrosDoPeriodo.length > 0) {
                 const ultimo = registrosDoPeriodo[registrosDoPeriodo.length - 1];
                 const indexPrimeiro = historicoHorimetros.findIndex(h => h.id === registrosDoPeriodo[0].id);
                 const anterior = indexPrimeiro > 0 ? historicoHorimetros[indexPrimeiro - 1] : null;
                 if (anterior) horasDaMaquina = ultimo.valorHorimetro - anterior.valorHorimetro;
                 else horasDaMaquina = ultimo.valorHorimetro - registrosDoPeriodo[0].valorHorimetro;
                 if (horasDaMaquina < 0) horasDaMaquina = 0;
              }
              somaHoras += horasDaMaquina;

              // B. Somar Despesas
              const despesas = expenses.filter(exp => exp.frota === m.frota && isInPeriodReport(exp.data));
              
              despesas.forEach(exp => {
                  const val = Number(exp.valor) || 0;
                  const termo = (exp.classe || exp.materia || exp.descricao || '').toUpperCase().trim();

                  if (R_CAT_FURTO.some(cat => termo.includes(cat))) return;

                  // 1. M.O. INTERNA (NOVO - Entra no Card de Manutenção, mas separado no gráfico)
                  if (R_CAT_MO_INTERNA.some(cat => termo.includes(cat))) {
                     somaManutencao += val;
                     listaManutencao.push(exp);
                     categoriasChart['M.O. Interna'] = (categoriasChart['M.O. Interna'] || 0) + val;
                     somaTotal += val;
                     maquinaTeveManutencao = true;
                  }
                  // 2. PNEUS
                  else if (R_CAT_PNEUS.some(cat => termo.includes(cat))) {
                     somaManutencao += val;
                     listaManutencao.push(exp);
                     categoriasChart['Manutenção (Pneus)'] = (categoriasChart['Manutenção (Pneus)'] || 0) + val;
                     somaTotal += val;
                     maquinaTeveManutencao = true;
                  }
                  // 3. FIXAS
                  else if (R_CAT_FIXAS.some(cat => termo.includes(cat))) {
                     categoriasChart['Despesas Fixas'] = (categoriasChart['Despesas Fixas'] || 0) + val;
                     somaOutros += val;
                     somaTotal += val;
                  }
                  // 4. GERAIS / COMBUSTÍVEL
                  else if (R_CAT_GERAIS.some(cat => termo.includes(cat)) || termo === "OLEO DIESEL" || termo.includes("COMBUSTIVEL")) {
                      if (termo === "OLEO DIESEL" || termo.includes("COMBUSTIVEL")) {
                          somaCombustivel += val;
                          categoriasChart['Combustível'] = (categoriasChart['Combustível'] || 0) + val;
                          somaTotal += val;
                      } else {
                          categoriasChart['Despesas Gerais'] = (categoriasChart['Despesas Gerais'] || 0) + val;
                          somaOutros += val;
                          somaTotal += val;
                      }
                  }
                  // 5. MANUTENÇÃO (Geral)
                  else {
                      somaManutencao += val;
                      listaManutencao.push(exp);
                      categoriasChart['Manutenção'] = (categoriasChart['Manutenção'] || 0) + val;
                      somaTotal += val;
                      maquinaTeveManutencao = true;
                  }
              });

              if (maquinaTeveManutencao && valorRateioPorMaquina > 0) {
                 somaOutros += valorRateioPorMaquina;
                 somaTotal += valorRateioPorMaquina;
                 categoriasChart['Rateio (Almox/Frete)'] = (categoriasChart['Rateio (Almox/Frete)'] || 0) + valorRateioPorMaquina;
              }
          });

          setReportSummary({
              total: somaTotal,
              combustivel: somaCombustivel,
              manutencao: somaManutencao,
              outros: somaOutros,
              horas: somaHoras,
              custoHora: somaHoras > 0 ? somaTotal / somaHoras : 0
          });

          const chartData = Object.keys(categoriasChart).map(key => ({
              name: key,
              value: categoriasChart[key]
          })).sort((a,b) => b.value - a.value);

          setReportChartData(chartData);
          setGeneratedReport(listaManutencao);
        };

        const frotasNoModal = generatedReport 
          ? [...new Set(generatedReport.map(i => i.frota))].sort() 
          : [];

        const listaFiltradaModal = generatedReport
          ? generatedReport.filter(item => manutencaoModalFilter === '' || item.frota === manutencaoModalFilter)
          : [];

        const totalValorFiltradoModal = listaFiltradaModal.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

        return (
          <div className="space-y-6 animate-fadeIn h-full flex flex-col">
            <header className="mb-2">
               <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relatório Dashboard</h2>
               <p className="text-slate-500 font-medium">Visão consolidada da frota</p>
            </header>

            {/* BARRA DE FILTROS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Filtrar Por</label>
                <select value={reportEspecie} onChange={(e) => { setReportEspecie(e.target.value); setReportFilterValue(''); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="maquina">Máquina</option>
                  <option value="tipo">Tipo de Máquina</option>
                  <option value="segmento">Segmento</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{reportEspecie === 'maquina' ? 'Digite a Frota' : `Selecione o ${reportEspecie}`}</label>
                {reportEspecie === 'maquina' ? (
                  <input type="text" placeholder="Ex: 2072" value={reportFilterValue} onChange={(e) => setReportFilterValue(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none focus:border-orange-500" />
                ) : (
                  <select value={reportFilterValue} onChange={(e) => setReportFilterValue(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-orange-500">
                    <option value="">Selecione...</option>
                    {(reportEspecie === 'tipo' ? tiposDisponiveis : segmentosDisponiveis).map(item => (<option key={item} value={item}>{item}</option>))}
                  </select>
                )}
              </div>
              <div className="md:col-span-3 flex gap-2">
                 <div className="w-1/3">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Período</label>
                   <select value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setFilterMonth('1'); }} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none text-sm">
                      {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                 </div>
                 {filterPeriod !== 'Ano' && (
                   <div className="flex-1">
                     <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{filterPeriod}</label>
                     <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none">
                        {filterPeriod === 'Mês' && MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        {filterPeriod === 'Trimestre' && (<><option value="1">1º Trimestre</option><option value="2">2º Trimestre</option><option value="3">3º Trimestre</option><option value="4">4º Trimestre</option></>)}
                        {filterPeriod === 'Semestre' && (<><option value="1">1º Semestre</option><option value="2">2º Semestre</option></>)}
                     </select>
                   </div>
                 )}
                 <div className="w-24">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ano</label>
                   <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>
              </div>
              <div className="md:col-span-2">
                <button onClick={handleGenerateReport} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2">
                  <PieChart size={18} /> Gerar
                </button>
              </div>
            </div>

            {/* DASHBOARD */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {!reportSummary ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl mt-4">
                  <LayoutDashboard size={64} strokeWidth={1} />
                  <p className="mt-4 font-medium">Selecione os filtros acima para gerar o dashboard</p>
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn pb-10">
                   {/* CARDS */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                      <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Custo Total</p><h3 className="text-2xl font-black text-slate-800">{formatCurrency(reportSummary.total)}</h3></div>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><DollarSign size={24} /></div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Combustível</p><h3 className="text-2xl font-black text-slate-800">{formatCurrency(reportSummary.combustivel)}</h3></div>
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Truck size={24} /></div>
                      </div>
                      <div onClick={() => setIsManutencaoReportOpen(true)} className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-red-100 flex items-center justify-between cursor-pointer hover:shadow-lg hover:border-red-200 transition-all group">
                        <div><p className="text-xs font-bold text-slate-400 uppercase mb-1 group-hover:text-red-500 transition-colors">Manutenção (Ver Detalhes)</p><h3 className="text-2xl font-black text-slate-800 group-hover:text-red-600 transition-colors">{formatCurrency(reportSummary.manutencao)}</h3></div>
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all"><Settings size={24} /></div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between">
                        <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Custo / Hora</p><h3 className="text-2xl font-black text-slate-800">{formatCurrency(reportSummary.custoHora)}</h3><p className="text-[10px] text-slate-400 mt-1 font-bold">Base: {reportSummary.horas} Horas</p></div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><PieChart size={24} /></div>
                      </div>
                   </div>
                   {/* GRÁFICOS */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Composição de Custos</h3>
                      <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={reportChartData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fontWeight: 'bold'}} />
                          <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                          <Bar dataKey="value" fill="#ea580c" radius={[0, 6, 6, 0]} barSize={30}>
                             {reportChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} 
                                  fill={
                                    entry.name.includes('Combustível') ? '#f97316' : 
                                    entry.name.includes('Manutenção') ? '#dc2626' : 
                                    entry.name.includes('M.O.') ? '#b91c1c' : // Cor específica para MO
                                    entry.name.includes('Rateio') ? '#facc15' : 
                                    entry.name.includes('Fixas') ? '#2563eb' :
                                    entry.name.includes('Gerais') ? '#475569' :
                                    '#94a3b8'
                                  } 
                                />
                             ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              )}
            </div>

            {/* MODAL LISTA DE MANUTENÇÃO (COM FILTRO) */}
            {isManutencaoReportOpen && generatedReport && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-red-50 gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-red-700 flex items-center gap-2">
                          <Settings size={22}/> Detalhamento de Manutenção
                        </h3>
                        <p className="text-sm text-red-400 font-bold mt-1">
                           Total Listado: {formatCurrency(totalValorFiltradoModal)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                         <div className="relative">
                            <Filter size={16} className="absolute left-3 top-2.5 text-red-400" />
                            <select 
                               value={manutencaoModalFilter}
                               onChange={(e) => setManutencaoModalFilter(e.target.value)}
                               className="pl-9 pr-8 py-2 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-200 shadow-sm cursor-pointer hover:bg-red-50 transition-colors"
                            >
                               <option value="">Todas as Frotas</option>
                               {frotasNoModal.map(frota => (
                                  <option key={frota} value={frota}>Frota {frota}</option>
                               ))}
                            </select>
                         </div>
                         <button onClick={() => setIsManutencaoReportOpen(false)} className="text-red-400 hover:text-red-700 hover:bg-red-100 p-2 rounded-full"><X size={20} /></button>
                      </div>
                    </div>

                    <div className="p-0 overflow-y-auto bg-white flex-1 custom-scrollbar">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                          <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Frota</th>
                            <th className="px-6 py-3">Descrição / Peça</th>
                            <th className="px-6 py-3">Classe</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {listaFiltradaModal.map((item) => (
                              <tr key={item.id} className="hover:bg-red-50/20">
                                <td className="px-6 py-3 whitespace-nowrap text-slate-500">{formatDateBR(item.data)}</td>
                                <td className="px-6 py-3 font-bold text-slate-700">{item.frota}</td>
                                <td className="px-6 py-3 text-slate-600 font-medium">{item.materia || item.descricao}</td>
                                <td className="px-6 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{item.classe}</span></td>
                                <td className="px-6 py-3 text-right font-bold text-red-600">{formatCurrency(Number(item.valor) || 0)}</td>
                                <td className="px-6 py-3 text-center">
                                  <button 
                                    onClick={() => openDetailsModal(item)}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 mx-auto"
                                  >
                                    <FileText size={14}/> Ver Nota
                                  </button>
                                </td>
                              </tr>
                           ))}
                           {listaFiltradaModal.length === 0 && (
                              <tr>
                                 <td colSpan="6" className="p-8 text-center text-slate-400">Nenhum registro para esta frota.</td>
                              </tr>
                           )}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                       <button onClick={() => setIsManutencaoReportOpen(false)} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">Fechar</button>
                    </div>
                 </div>
              </div>
            )}

            {/* MODAL DE DETALHES */}
            {isDetailsModalOpen && viewingDetail && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <FileText size={22} className="text-orange-600"/> Detalhes do Lançamento
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide font-bold">
                           TIPO: {viewingDetail.tipo === 'entrada' ? 'ENTRADA (NOTA FISCAL)' : 'SAÍDA / CONSUMO'}
                        </p>
                      </div>
                      <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full"><X size={20} /></button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto bg-white">
                        {viewingDetail.tipo === 'entrada' ? (
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
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                             <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Data</p><p className="font-bold text-slate-800">{viewingDetail.data || '-'}</p></div>
                             <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Frota</p><p className="font-bold text-slate-800 text-lg">{viewingDetail.frota || '-'}</p></div>
                             {viewingDetail.codLancamento && (<div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Cód. Lançamento</p><p className="font-medium text-slate-700">{viewingDetail.codLancamento}</p></div>)}
                             <div className="col-span-3 h-px bg-slate-100 my-2"></div>
                             <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Matéria / Descrição</p><p className="font-bold text-slate-800 text-lg">{viewingDetail.materia || viewingDetail.descricao || '-'}</p></div>
                             {viewingDetail.codMateria && (<div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Cód. Matéria</p><p className="font-medium text-slate-700">{viewingDetail.codMateria}</p></div>)}
                             <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Quantidade</p><p className="font-bold text-slate-800">{viewingDetail.quantidade || 1}</p></div>
                             {viewingDetail.valorEntrada && (<div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Valor Unit./Entrada</p><p className="font-medium text-slate-700">{formatCurrency(Number(viewingDetail.valorEntrada))}</p></div>)}
                             <div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Valor Total</p><p className="font-bold text-red-600 text-lg">{formatCurrency(Number(viewingDetail.valor) || 0)}</p></div>
                             <div className="col-span-3 h-px bg-slate-100 my-2"></div>
                             {viewingDetail.recebedor && (<div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Recebedor</p><p className="font-medium text-slate-700">{viewingDetail.recebedor}</p></div>)}
                             {viewingDetail.almoxarifado && (<div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Almoxarifado</p><p className="font-medium text-slate-700">{viewingDetail.almoxarifado}</p></div>)}
                             {viewingDetail.origem && (<div className="col-span-1"><p className="text-xs font-bold text-slate-400 uppercase">Origem</p><p className="font-medium text-slate-700">{viewingDetail.origem}</p></div>)}
                          </div>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setIsDetailsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors">Fechar Detalhes</button>
                    </div>
                 </div>
              </div>
            )}
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
          <NavItem id="resumo" label={isSidebarOpen ? "Resumo" : ""} icon={ClipboardList} />
          <NavItem id="motores" label={isSidebarOpen ? "Motores" : ""} icon={Settings} />
          
          <div className="my-4 border-t border-orange-500/30 mx-4"></div>
          <p className={`px-6 text-xs font-semibold text-orange-200 uppercase mb-2 ${!isSidebarOpen && 'hidden'}`}>Dados</p>
          
          <NavItem id="database" label={isSidebarOpen ? "Base de Dados" : ""} icon={Database} />
          <NavItem id="almoxarifado" label={isSidebarOpen ? "Almoxarifado" : ""} icon={ClipboardList} />
          <NavItem id="import" label={isSidebarOpen ? "Importar" : ""} icon={Upload} />
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