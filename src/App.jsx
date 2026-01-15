import React, { useState, useMemo } from 'react';
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
  Tractor // Importando o ícone de máquina
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

/**
 * MOCK DATA & CONSTANTS
 * Dados iniciais para demonstração caso o usuário não tenha arquivos prontos.
 */
const INITIAL_MACHINES = [
  { frota: 'TR-01', maquina: 'Trator John Deere 7J', tipo: 'Trator', localizacao: 'Fazenda Santa Rita', segmento: 'Agrícola' },
  { frota: 'CV-05', maquina: 'Caminhão Volvo VM', tipo: 'Caminhão', localizacao: 'Logística Central', segmento: 'Transporte' },
  { frota: 'ES-02', maquina: 'Escavadeira CAT 320', tipo: 'Escavadeira', localizacao: 'Obra Rodovia Sul', segmento: 'Construção' },
  { frota: 'PL-10', maquina: 'Plantadeira Case', tipo: 'Plantadeira', localizacao: 'Fazenda Santa Rita', segmento: 'Agrícola' },
  { frota: 'TR-02', maquina: 'Trator Valtra A950', tipo: 'Trator', localizacao: 'Fazenda Boa Vista', segmento: 'Agrícola' },
];

const INITIAL_EXPENSES = [
  { id: 1, data: '2023-10-01', frota: 'TR-01', descricao: 'Manutenção Preventiva', valor: 2500.00, categoria: 'Manutenção' },
  { id: 2, data: '2023-10-02', frota: 'TR-01', descricao: 'Abastecimento Diesel', valor: 850.50, categoria: 'Combustível' },
  { id: 3, data: '2023-10-03', frota: 'CV-05', descricao: 'Troca de Pneus', valor: 4200.00, categoria: 'Peças' },
  { id: 4, data: '2023-10-05', frota: 'ES-02', descricao: 'Reparo Hidráulico', valor: 1200.00, categoria: 'Manutenção' },
  { id: 5, data: '2023-10-10', frota: 'PL-10', descricao: 'Lubrificação Geral', valor: 350.00, categoria: 'Manutenção' },
];

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#ea580c', '#c2410c', '#9a3412'];

// Utilitário de formatação de moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Componente: Card de Estatística
const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      {trend && <p className="text-xs text-green-600 mt-1 flex items-center">{trend}</p>}
    </div>
    <div className="p-3 bg-orange-50 rounded-lg">
      <Icon className="w-6 h-6 text-orange-600" />
    </div>
  </div>
);

// Componente Principal
export default function FechamentoMaquinas() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Estado Global dos Dados
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [rawTxtContent, setRawTxtContent] = useState('');
  
  // Lógica de Processamento e Associações
  const processedData = useMemo(() => {
    // Une despesas com dados da máquina
    const enrichedExpenses = expenses.map(exp => {
      const machine = machines.find(m => m.frota === exp.frota);
      return {
        ...exp,
        maquinaNome: machine ? machine.maquina : 'Máquina não encontrada',
        segmento: machine ? machine.segmento : 'Indefinido',
        localizacao: machine ? machine.localizacao : 'Indefinido',
        tipo: machine ? machine.tipo : 'Indefinido'
      };
    });

    // Cálculos para Dashboard
    const totalCusto = enrichedExpenses.reduce((acc, curr) => acc + curr.valor, 0);
    
    // Custo por Segmento
    const custoPorSegmento = enrichedExpenses.reduce((acc, curr) => {
      acc[curr.segmento] = (acc[curr.segmento] || 0) + curr.valor;
      return acc;
    }, {});
    
    const chartDataSegmento = Object.keys(custoPorSegmento).map(key => ({
      name: key,
      value: custoPorSegmento[key]
    }));

    // Custo por Máquina (Top 5)
    const custoPorMaquina = enrichedExpenses.reduce((acc, curr) => {
      const nome = curr.maquinaNome;
      acc[nome] = (acc[nome] || 0) + curr.valor;
      return acc;
    }, {});

    const chartDataMaquina = Object.keys(custoPorMaquina)
      .map(key => ({ name: key, custo: custoPorMaquina[key] }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    return { enrichedExpenses, totalCusto, chartDataSegmento, chartDataMaquina };
  }, [machines, expenses]);

  // Handlers de Importação (Simulação)
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Simples parser de CSV (assume cabeçalho na linha 1)
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        // Pular cabeçalho, processar linhas
        const newMachines = lines.slice(1).map(line => {
          const [frota, maquina, tipo, localizacao, segmento] = line.split(',');
          return { 
            frota: frota?.trim(), 
            maquina: maquina?.trim(), 
            tipo: tipo?.trim(), 
            localizacao: localizacao?.trim(), 
            segmento: segmento?.trim() 
          };
        }).filter(m => m.frota); // Remove linhas vazias/inválidas
        
        setMachines(newMachines);
        alert(`${newMachines.length} máquinas importadas com sucesso!`);
      };
      reader.readAsText(file);
    }
  };

  const handleTXTImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setRawTxtContent(text);
        
        // Simulação de parser TXT (Formato fictício: DATA|FROTA|DESC|VALOR|CAT)
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const newExpenses = lines.map((line, index) => {
          const parts = line.split('|'); // Assume separador pipe
          if(parts.length < 4) return null;
          return {
            id: Date.now() + index,
            data: parts[0]?.trim(),
            frota: parts[1]?.trim(),
            descricao: parts[2]?.trim(),
            valor: parseFloat(parts[3]?.trim()) || 0,
            categoria: parts[4]?.trim() || 'Geral'
          };
        }).filter(item => item !== null);

        setExpenses(prev => [...prev, ...newExpenses]);
        alert(`${newExpenses.length} lançamentos importados e processados!`);
      };
      reader.readAsText(file);
    }
  };

  // Renderização do Conteúdo
  const renderContent = () => {
    switch(activeMenu) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Gerencial</h2>
                <p className="text-slate-500">Visão geral dos custos operacionais</p>
              </div>
              <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Exportar PDF
              </button>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Custo Total (Mês)" value={formatCurrency(processedData.totalCusto)} icon={DollarSign} trend="+12% vs mês anterior" />
              <StatCard title="Máquinas Ativas" value={machines.length} icon={Truck} />
              <StatCard title="Total Lançamentos" value={processedData.enrichedExpenses.length} icon={FileText} />
              <StatCard title="Média por Máquina" value={formatCurrency(processedData.totalCusto / (machines.length || 1))} icon={PieChart} />
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Chart 1: Top Spenders */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Máquinas (Maior Custo)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData.chartDataMaquina} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="custo" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Cost by Segment */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribuição por Segmento</h3>
                <div className="h-64 flex justify-center items-center">
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
                </div>
              </div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Base de Dados</h2>
                <p className="text-slate-500">Cadastro da frota e equipamentos</p>
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVImport}
                  className="hidden" 
                  id="csv-upload"
                />
                <label 
                  htmlFor="csv-upload"
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Upload size={16} /> Importar CSV
                </label>
              </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="Buscar máquina, frota..." className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Frota</th>
                      <th className="px-6 py-3">Máquina</th>
                      <th className="px-6 py-3">Tipo</th>
                      <th className="px-6 py-3">Localização</th>
                      <th className="px-6 py-3">Segmento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m, idx) => (
                      <tr key={idx} className="bg-white border-b hover:bg-orange-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{m.frota}</td>
                        <td className="px-6 py-4">{m.maquina}</td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-600 py-1 px-2 rounded text-xs border border-slate-200">{m.tipo}</span>
                        </td>
                        <td className="px-6 py-4">{m.localizacao}</td>
                        <td className="px-6 py-4">{m.segmento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="max-w-2xl mx-auto text-center mt-12">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Importar Despesas</h2>
              <p className="text-slate-500 mb-8">Faça o upload do arquivo .txt contendo os lançamentos financeiros. O sistema associará automaticamente os custos às máquinas cadastradas.</p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".txt" 
                  onChange={handleTXTImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-slate-400 mb-4" />
                  <p className="text-slate-700 font-medium">Clique para selecionar ou arraste o arquivo aqui</p>
                  <p className="text-xs text-slate-400 mt-2">Formato esperado: DATA | FROTA | DESCRIÇÃO | VALOR | CATEGORIA</p>
                </div>
              </div>

              {rawTxtContent && (
                <div className="mt-8 text-left">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Preview do Arquivo Processado</h3>
                  <div className="bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg h-40 overflow-y-auto">
                    {rawTxtContent}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'lancamentos':
        return (
          <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Lançamentos</h2>
                <p className="text-slate-500">Detalhe das despesas importadas e processadas</p>
              </div>
            </header>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Frota</th>
                      <th className="px-6 py-3">Máquina (Vinculada)</th>
                      <th className="px-6 py-3">Descrição</th>
                      <th className="px-6 py-3">Categoria</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.enrichedExpenses.map((exp) => (
                      <tr key={exp.id} className="bg-white border-b hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">{exp.data}</td>
                        <td className="px-6 py-4 font-medium text-orange-600">{exp.frota}</td>
                        <td className="px-6 py-4">
                          {exp.maquinaNome === 'Máquina não encontrada' ? (
                            <span className="flex items-center text-red-500 text-xs"><AlertCircle size={12} className="mr-1"/> N/A</span>
                          ) : (
                            <span className="text-slate-700">{exp.maquinaNome}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{exp.descricao}</td>
                        <td className="px-6 py-4">
                           <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-semibold">{exp.categoria}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(exp.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      case 'fechamento':
        return (
           <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Fechamento Mensal</h2>
                <p className="text-slate-500">Análise consolidada para tomada de decisão</p>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <CheckCircle size={16}/> Finalizar Período
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Truck className="text-orange-500" size={20}/>
                      Custo Total por Frota
                   </h3>
                   <div className="space-y-4">
                      {processedData.chartDataMaquina.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                           <span className="text-sm font-medium text-slate-700">{item.name}</span>
                           <span className="text-sm font-bold text-slate-900">{formatCurrency(item.custo)}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <PieChart className="text-orange-500" size={20}/>
                      Resumo por Segmento
                   </h3>
                    <div className="space-y-4">
                      {processedData.chartDataSegmento.map((item, idx) => (
                        <div key={idx}>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">{item.name}</span>
                              <span className="font-medium">{formatCurrency(item.value)}</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{
                                    width: `${(item.value / processedData.totalCusto) * 100}%`, 
                                    backgroundColor: COLORS[idx % COLORS.length]
                                }}
                              ></div>
                           </div>
                        </div>
                      ))}
                   </div>
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center text-slate-400 text-sm">
            <span>Sistema</span>
            <span className="mx-2">/</span>
            <span className="capitalize text-slate-800 font-medium">{activeMenu.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold border border-orange-200">
                SA
             </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Global Styles for Animations */}
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}