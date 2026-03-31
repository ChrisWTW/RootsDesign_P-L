import React, { useState, useMemo, useEffect, Component } from 'react';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Tooltip as ReTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  LayoutDashboard, 
  Briefcase, 
  Receipt, 
  Building2, 
  PieChart, 
  Plus, 
  Search, 
  Bell, 
  TrendingUp, 
  Wallet, 
  FileText,
  Users,
  ArrowRight,
  ArrowDown,
  X,
  Download,
  LogOut,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer
} from './firebase';

// --- Error Boundary ---
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  props: {children: React.ReactNode};
  state: {hasError: boolean, error: any} = { hasError: false, error: null };
  constructor(props: {children: React.ReactNode}) {
    super(props);
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-rose-50 p-8 text-center">
          <AlertCircle size={64} className="text-rose-500 mb-4" />
          <h1 className="text-2xl font-black text-rose-900 mb-2">發生錯誤</h1>
          <p className="text-rose-700 mb-6 max-w-md">
            應用程式遇到非預期錯誤。請嘗試重新整理頁面。
          </p>
          <pre className="bg-white p-4 rounded-xl text-xs text-left overflow-auto max-w-full border border-rose-200 shadow-sm">
            {JSON.stringify(this.state.error, null, 2)}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-rose-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-rose-700 transition-colors"
          >
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 自訂 CSS 樣式 (流體動畫與隱藏滾動條) ---
const customStyles = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 10s infinite alternate;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .glass-panel {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.03);
  }
  .glass-modal {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
`;

// --- 輔助函式 ---
const formatMoney = (amount: number) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// 產生當天日期 (格式: MMDD)
const getTodayString = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

// --- 獨立元件區 ---
const StatusBadge = ({ status }: { status: string }) => {
  let style = { background: 'rgba(0,0,0,0.05)', color: '#000' };
  if (status === '已完工' || status === '已核銷' || status === '已到貨') {
    style = { background: '#000', color: '#fff' };
  } else if (status === '進行中' || status === '確認報價') {
    style = { background: '#005bbb', color: '#fff' };
  } else if (status === '待撥款' || status === '待開立' || status === '待核銷') {
    style = { background: '#ff3b30', color: '#fff' };
  }
  return (
    <span className="px-3 py-1.5 text-xs font-bold rounded-full tracking-wider shadow-sm transition-transform hover:scale-105" style={style}>
      {status}
    </span>
  );
};

const TableView = ({ title, buttonText, headers, renderRow, data, onAdd, onRowClick }: any) => (
  <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
    <div className="p-6 lg:p-8 border-b border-black/5 flex justify-between items-center bg-white/20">
      <h2 className="text-2xl font-black text-black tracking-tight">{title}</h2>
      <button 
        onClick={onAdd}
        className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform flex items-center shadow-lg"
      >
        <Plus size={18} className="mr-1.5" strokeWidth={3} /> {buttonText}
      </button>
    </div>
    <div className="overflow-x-auto no-scrollbar p-6">
      <table className="w-full text-left whitespace-nowrap border-separate border-spacing-y-2">
        <thead>
          <tr>
            {headers.map((h: any, i: number) => (
              <th key={i} className={`px-4 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider ${h.align || ''}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-400 font-bold bg-white/30 rounded-2xl">
                目前尚無資料，或沒有符合搜尋條件的項目
              </td>
            </tr>
          ) : (
            data.map((row: any, idx: number) => (
              <tr 
                key={idx} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`bg-white/50 hover:bg-white/80 transition-colors shadow-sm rounded-2xl group ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {renderRow(row, idx)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// --- 主應用程式 ---
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 系統狀態
  const [projects, setProjects] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [taxDeductions, setTaxDeductions] = useState<any[]>([]);

  // Modal 狀態
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isAssetModalOpen, setAssetModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // Google Drive Tokens
  const [driveTokens, setDriveTokens] = useState<any>(null);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Error Handler
  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // Test Connection
  useEffect(() => {
    if (isAuthReady && user) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error: any) {
          if (error.message.includes('offline')) {
            console.error("Firebase connection failed: Client is offline.");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady, user]);

  // Firestore Data Listeners
  useEffect(() => {
    if (!isAuthReady || !user) {
      setProjects([]);
      setExpenses([]);
      setAssets([]);
      return;
    }

    const qProjects = query(collection(db, 'projects'), where('uid', '==', user.uid));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'projects'));

    const qExpenses = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'expenses'));

    const qAssets = query(collection(db, 'assets'), where('uid', '==', user.uid));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'assets'));

    const qTax = query(collection(db, 'taxDeductions'), where('uid', '==', user.uid));
    const unsubTax = onSnapshot(qTax, (snapshot) => {
      setTaxDeductions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'taxDeductions'));

    return () => {
      unsubProjects();
      unsubExpenses();
      unsubAssets();
      unsubTax();
    };
  }, [isAuthReady, user]);

  // 根據年度篩選
  const yearFilteredProjects = useMemo(() => projects.filter(p => p.year === selectedYear), [projects, selectedYear]);
  const yearFilteredExpenses = useMemo(() => expenses.filter(e => e.year === selectedYear), [expenses, selectedYear]);
  const yearFilteredAssets = useMemo(() => assets.filter(a => a.year === selectedYear), [assets, selectedYear]);

  // 動態計算財務數據
  const financials = useMemo(() => {
    const completedProjects = yearFilteredProjects.filter(p => p.status === '已完成');
    const approvedExpenses = yearFilteredExpenses.filter(e => e.status === '已核銷');

    const revenue = completedProjects.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const netRevenue = completedProjects.reduce((sum, p) => sum + (Number(p.netAmount) || 0), 0);
    const expenseTotal = approvedExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
    const taxPayable = completedProjects.reduce((sum, p) => sum + (Number(p.taxAmount) || 0), 0);
    
    // 實收淨利 = (未稅金額 * 70%) - 外包金額
    const netProfit = completedProjects.reduce((sum, p) => {
      const pNet = (Number(p.netAmount) || 0) * 0.7 - (Number(p.outsourcedAmount) || 0);
      return sum + pNet;
    }, 0) - expenseTotal;

    const legalReserve = netProfit > 0 ? netProfit * 0.1 : 0;
    const distributableDividend = netProfit > 0 ? netProfit - legalReserve : 0;

    // 業務獎金與實作貢獻計算
    const salesCommissions: any = { Tim: 0, Chris: 0, Sam: 0 };
    const implementationTotals: any = { Tim: 0, Chris: 0, Sam: 0 };

    completedProjects.forEach(p => {
      const net = Number(p.netAmount) || 0;
      const rep = p.salesRep;
      
      // 業務獎金: 5% (基本) + 5% (新客戶)
      if (salesCommissions[rep] !== undefined) {
        salesCommissions[rep] += net * 0.05;
        if (p.isNewClient === '是') {
          salesCommissions[rep] += net * 0.05;
        }
      }

      // 實作貢獻
      if (p.implementers) {
        Object.keys(p.implementers).forEach(name => {
          if (implementationTotals[name] !== undefined) {
            implementationTotals[name] += Number(p.implementers[name].amount) || 0;
          }
        });
      }
    });

    return {
      revenue,
      salesNet: netRevenue,
      salesTax: taxPayable,
      expenseTotal,
      taxPayable,
      netProfit,
      legalReserve,
      distributableDividend,
      salesCommissions,
      implementationTotals
    };
  }, [yearFilteredProjects, yearFilteredExpenses]);

  // 近 5 年營收比較數據
  const fiveYearData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
    
    return years.map(y => {
      const yearProjects = projects.filter(p => p.year === y && p.status === '已完成');
      const yearExpenses = expenses.filter(e => e.year === y && e.status === '已核銷');
      const yearTaxDeduction = taxDeductions.find(t => t.year === y);
      const totalTaxDeduction = yearTaxDeduction ? 
        Object.values(yearTaxDeduction.values || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;

      const revenue = yearProjects.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const expenseTotal = yearExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
      const netProfit = yearProjects.reduce((sum, p) => {
        const pNet = (Number(p.netAmount) || 0) * 0.7 - (Number(p.outsourcedAmount) || 0);
        return sum + pNet;
      }, 0) - expenseTotal;

      return {
        year: y,
        revenue,
        netProfit,
        taxDeduction: totalTaxDeduction
      };
    });
  }, [projects, expenses, taxDeductions]);

  // 固定股東比例
  const shareholders = [
    { name: 'T', ratio: 35 },
    { name: 'C', ratio: 35 },
    { name: 'S', ratio: 30 },
  ];

  // 全域搜尋篩選器
  const filterData = (dataList: any[]) => {
    if (!searchQuery) return dataList;
    const lowerQuery = searchQuery.toLowerCase();
    return dataList.filter(item => 
      Object.values(item).some(val => String(val).toLowerCase().includes(lowerQuery))
    );
  };

  const filteredProjects = filterData(projects);
  const filteredExpenses = filterData(expenses);
  const filteredAssets = filterData(assets);

  // --- Modal 元件：案件編輯/新增 ---
  const ProjectModal = () => {
    const [client, setClient] = useState(editingProject?.client || '');
    const [services, setServices] = useState<string[]>(editingProject?.service?.split(', ') || []);
    const [netAmount, setNetAmount] = useState(editingProject?.netAmount?.toString() || '');
    const [taxAmount, setTaxAmount] = useState(editingProject?.taxAmount?.toString() || '');
    const [totalAmount, setTotalAmount] = useState(editingProject?.totalAmount?.toString() || '');
    const [salesRep, setSalesRep] = useState(editingProject?.salesRep || 'Tim');
    const [isNewClient, setIsNewClient] = useState(editingProject?.isNewClient || '否');
    const [otherRep, setOtherRep] = useState('');
    const [isInvoiceIssued, setIsInvoiceIssued] = useState(editingProject?.isInvoiceIssued || '否');
    const [status, setStatus] = useState(editingProject?.status || '進行中');
    const [year, setYear] = useState(editingProject?.year || selectedYear);
    
    // 編號由R26001進行流水號編碼
    const defaultProjectNumber = useMemo(() => {
      if (editingProject) return editingProject.projectNumber;
      const yearProjects = projects.filter(p => p.year === year);
      if (yearProjects.length === 0) return `R${String(year).slice(-2)}001`;
      const lastNum = yearProjects.reduce((max, p) => {
        const num = parseInt(p.projectNumber.replace(/[A-Z]/g, ''));
        return num > max ? num : max;
      }, 0);
      return `R${lastNum + 1}`;
    }, [projects, editingProject, year]);

    const [projectNumber, setProjectNumber] = useState(editingProject?.projectNumber || defaultProjectNumber);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // 實作人員
    const [implementers, setImplementers] = useState(editingProject?.implementers || {
      Tim: { contribution: 0, amount: 0 },
      Chris: { contribution: 0, amount: 0 },
      Sam: { contribution: 0, amount: 0 }
    });

    const [outsourcedStaff, setOutsourcedStaff] = useState(editingProject?.outsourcedStaff || '');
    const [outsourcedAmount, setOutsourcedAmount] = useState(editingProject?.outsourcedAmount?.toString() || '');
    const [projectProgress, setProjectProgress] = useState(editingProject?.projectProgress || '');

    const serviceOptions = ['掃描', '逆向', '設計', '模型製作', '量產需求', '外購'];
    const salesOptions = ['Tim', 'Chris', 'Sam', '其他(備註)'];
    const invoiceOptions = ['是', '否'];

    const handleToggleService = (s: string) => {
      setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    const handleNetAmountChange = (val: string) => {
      const net = Number(val) || 0;
      const tax = Math.round(net * 0.05);
      const total = net + tax;
      setNetAmount(val);
      setTaxAmount(tax.toString());
      setTotalAmount(total.toString());
      
      // 更新實作人員金額
      const newImps = { ...implementers };
      Object.keys(newImps).forEach(name => {
        newImps[name].amount = Math.round(net * 0.3 * (newImps[name].contribution / 100));
      });
      setImplementers(newImps);
    };

    const handleContributionChange = (name: string, val: number) => {
      const contribution = Math.min(100, Math.max(0, val));
      const net = Number(netAmount) || 0;
      const amount = Math.round(net * 0.3 * (contribution / 100));
      
      setImplementers({
        ...implementers,
        [name]: { contribution, amount }
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const finalSalesRep = salesRep === '其他(備註)' ? otherRep : salesRep;
      const projectData = {
        date: editingProject?.date || getTodayString(),
        year,
        projectNumber,
        client,
        service: services.join(', ') || '未選擇',
        status,
        netAmount: Number(netAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        salesRep: finalSalesRep,
        isNewClient,
        implementers,
        outsourcedStaff,
        outsourcedAmount: Number(outsourcedAmount) || 0,
        projectProgress,
        isInvoiceIssued,
        uid: user.uid,
        createdAt: editingProject?.createdAt || new Date().toISOString()
      };

      try {
        if (editingProject) {
          await updateDoc(doc(db, 'projects', editingProject.id), projectData);
        } else {
          await setDoc(doc(collection(db, 'projects')), projectData);
        }
        setProjectModalOpen(false);
        setEditingProject(null);
      } catch (err) {
        handleFirestoreError(err, editingProject ? 'update' : 'create', 'projects');
      }
    };

    const handleRemove = async () => {
      if (editingProject) {
        try {
          await deleteDoc(doc(db, 'projects', editingProject.id));
          setProjectModalOpen(false);
          setEditingProject(null);
          setShowConfirmDelete(false);
        } catch (err) {
          handleFirestoreError(err, 'delete', 'projects');
        }
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-2xl rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black">{editingProject ? '更新案件' : '新增案件'}</h2>
            <button onClick={() => { setProjectModalOpen(false); setEditingProject(null); }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">案件編號</label>
                <input required type="text" value={projectNumber} onChange={e => setProjectNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">歸屬年度</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                    {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">狀態</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                    <option value="進行中">進行中</option>
                    <option value="已完成">已完成</option>
                    <option value="暫停">暫停</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">客戶名稱</label>
              <input required type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-bold" placeholder="輸入客戶名稱" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">服務項目 (可複選)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {serviceOptions.map(opt => (
                  <label key={opt} className={`flex items-center p-2.5 rounded-xl border cursor-pointer transition-colors ${services.includes(opt) ? 'bg-black text-white border-black' : 'bg-white/50 border-black/10 text-slate-600 hover:bg-white/80'}`}>
                    <input type="checkbox" className="hidden" checked={services.includes(opt)} onChange={() => handleToggleService(opt)} />
                    <span className="text-sm font-bold mx-auto">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">未稅金額</label>
                <input required type="number" value={netAmount} onChange={e => handleNetAmountChange(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-black text-lg" placeholder="NT$" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">稅金 (5%)</label>
                <input readOnly type="number" value={taxAmount} className="w-full rounded-xl border border-black/10 bg-slate-100 px-4 py-2.5 focus:outline-none font-black text-lg text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">含稅總額</label>
                <input readOnly type="number" value={totalAmount} className="w-full rounded-xl border border-black/10 bg-slate-100 px-4 py-2.5 focus:outline-none font-black text-lg text-slate-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">業務</label>
                <select value={salesRep} onChange={e => setSalesRep(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                  {salesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {salesRep === '其他(備註)' && (
                  <input required type="text" value={otherRep} onChange={e => setOtherRep(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-bold mt-2" placeholder="請填寫業務備註" />
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">新客戶</label>
                <select value={isNewClient} onChange={e => setIsNewClient(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">是否開立發票</label>
                <select value={isInvoiceIssued} onChange={e => setIsInvoiceIssued(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                  {invoiceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-black/5 pt-5">
              <label className="block text-sm font-bold text-slate-700 mb-3">實作人員與貢獻 (分配 30% 未稅金額)</label>
              <div className="space-y-3">
                {['Tim', 'Chris', 'Sam'].map(name => (
                  <div key={name} className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
                    <div className="font-bold text-slate-600">{name}</div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        value={implementers[name].contribution} 
                        onChange={e => handleContributionChange(name, parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold"
                        placeholder="貢獻 %"
                      />
                      <span className="font-bold text-slate-400">%</span>
                    </div>
                    <div className="text-right font-black text-black hidden sm:block">
                      {formatMoney(implementers[name].amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-black/5 pt-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">外包人員</label>
                <input type="text" value={outsourcedStaff} onChange={e => setOutsourcedStaff(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="輸入外包人員" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">外包金額</label>
                <input type="number" value={outsourcedAmount} onChange={e => setOutsourcedAmount(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-black" placeholder="NT$" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">專案進度更新 (60%)</label>
              <textarea 
                value={projectProgress} 
                onChange={e => setProjectProgress(e.target.value)} 
                className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold h-24" 
                placeholder="輸入專案進度..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              {editingProject && (
                <div className="flex-1 flex flex-col gap-2 order-3 sm:order-1">
                  {!showConfirmDelete ? (
                    <button type="button" onClick={() => setShowConfirmDelete(true)} className="w-full bg-rose-500 text-white rounded-xl py-3.5 font-black text-lg hover:bg-rose-600 transition-colors shadow-lg">
                      移除案件
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={handleRemove} className="flex-1 bg-rose-600 text-white rounded-xl py-3.5 font-black text-sm hover:bg-rose-700 transition-colors shadow-lg">
                        確認刪除
                      </button>
                      <button type="button" onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-sm hover:bg-slate-300 transition-colors">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={() => { setProjectModalOpen(false); setEditingProject(null); }} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-lg hover:bg-slate-300 transition-colors order-2">
                取消
              </button>
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:scale-[1.02] transition-transform shadow-lg order-1 sm:order-3">
                {editingProject ? '更新案件' : '建立案件'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- Modal 元件：報支編輯/新增 ---
  const ExpenseModal = () => {
    const [category, setCategory] = useState(editingExpense?.category || '辦公需求');
    const [notes, setNotes] = useState(editingExpense?.summary || '');
    const [amount, setAmount] = useState(editingExpense?.total?.toString() || '');
    const [payer, setPayer] = useState(editingExpense?.payer || 'Tim');
    const [invoice, setInvoice] = useState(editingExpense?.invoice || '有');
    const [isInvoiceIssued, setIsInvoiceIssued] = useState(editingExpense?.isInvoiceIssued || '否');
    const [status, setStatus] = useState(editingExpense?.status || '待核銷');
    const [year, setYear] = useState(editingExpense?.year || selectedYear);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const catOptions = ['辦公需求', '膳雜費', '專案採購(耗材)', '專案採購(代購)', '專案採購(工具)', '其他'];
    const payerOptions = ['Tim', 'Chris', 'Sam'];
    const invoiceOptions = ['有', '無'];
    const issuedOptions = ['是', '否'];

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const expenseData = {
        date: editingExpense?.date || getTodayString(),
        year,
        category,
        summary: notes || '無備註',
        payer,
        total: Number(amount) || 0,
        status,
        invoice,
        isInvoiceIssued,
        uid: user.uid,
        createdAt: editingExpense?.createdAt || new Date().toISOString()
      };

      try {
        if (editingExpense) {
          await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
        } else {
          await setDoc(doc(collection(db, 'expenses')), expenseData);
        }
        setExpenseModalOpen(false);
        setEditingExpense(null);
      } catch (err) {
        handleFirestoreError(err, editingExpense ? 'update' : 'create', 'expenses');
      }
    };

    const handleRemove = async () => {
      if (editingExpense) {
        try {
          await deleteDoc(doc(db, 'expenses', editingExpense.id));
          setExpenseModalOpen(false);
          setEditingExpense(null);
          setShowConfirmDelete(false);
        } catch (err) {
          handleFirestoreError(err, 'delete', 'expenses');
        }
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black">{editingExpense ? '更新報支' : '新增報支與進項'}</h2>
            <button onClick={() => { setExpenseModalOpen(false); setEditingExpense(null); }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">類別</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {catOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">歸屬年度</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">狀態</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  <option value="待核銷">待核銷</option>
                  <option value="已核銷">已核銷</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">金額</label>
                <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-black text-lg" placeholder="NT$" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">備註 (摘要)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 transition-all font-bold" placeholder="輸入報支說明" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">付款人員</label>
                <select value={payer} onChange={e => setPayer(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {payerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">發票</label>
                <select value={invoice} onChange={e => setInvoice(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {invoiceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">是否開立</label>
                <select value={isInvoiceIssued} onChange={e => setIsInvoiceIssued(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {issuedOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              {editingExpense && (
                <div className="flex-1 flex flex-col gap-2 order-3 sm:order-1">
                  {!showConfirmDelete ? (
                    <button type="button" onClick={() => setShowConfirmDelete(true)} className="w-full bg-rose-500 text-white rounded-xl py-3.5 font-black text-lg hover:bg-rose-600 transition-colors shadow-lg">
                      移除報支
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={handleRemove} className="flex-1 bg-rose-600 text-white rounded-xl py-3.5 font-black text-sm hover:bg-rose-700 transition-colors shadow-lg">
                        確認刪除
                      </button>
                      <button type="button" onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-sm hover:bg-slate-300 transition-colors">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={() => { setExpenseModalOpen(false); setEditingExpense(null); }} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-lg hover:bg-slate-300 transition-colors order-2">
                取消
              </button>
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:scale-[1.02] transition-transform shadow-lg order-1 sm:order-3">
                {editingExpense ? '更新報支' : '提交報支'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- CSV Export ---
  const generateCSV = () => {
    const summaryHeaders = ['年度財務摘要', '金額'];
    const summaryRows = [
      ['總營業額', financials.revenue],
      ['未稅金額', financials.salesNet],
      ['稅金總額', financials.salesTax],
      ['年度報支總額', financials.expenseTotal],
      ['年度淨利', financials.netProfit],
      ['法定盈餘公積', financials.legalReserve],
      ['可分配股利', financials.distributableDividend],
      ['', ''],
      ['業務獎金摘要', ''],
      ...Object.entries(financials.salesCommissions).map(([name, amount]) => [name, amount]),
      ['', ''],
      ['實作貢獻摘要', ''],
      ...Object.entries(financials.implementationTotals).map(([name, amount]) => [name, amount]),
      ['', ''],
      ['', ''],
    ];

    const projectHeaders = ['案件明細', '', '', '', '', '', '', '', ''];
    const headers = ['日期', '編號', '客戶', '服務', '未稅金額', '稅金', '總額', '業務', '進度'];
    const rows = yearFilteredProjects.map(p => [
      p.date, 
      p.projectNumber, 
      p.client, 
      p.service, 
      p.netAmount, 
      p.taxAmount, 
      p.totalAmount, 
      p.salesRep, 
      p.projectProgress
    ]);

    const csvRows = [
      ...summaryRows,
      projectHeaders,
      headers, 
      ...rows
    ].map(row => 
      row.map(field => {
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      }).join(',')
    );

    return '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `源創系統_${selectedYear}_年度報表.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Google Drive Export ---
  const handleExportToDrive = async () => {
    if (!user) {
      alert('請先登入系統');
      return;
    }

    let tokens = driveTokens;
    if (!tokens) {
      try {
        const response = await fetch('/api/auth/google/url');
        if (!response.ok) throw new Error('無法獲取認證網址');
        const { url } = await response.json();
        
        // Open popup for Google Auth
        const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
        
        const handleMessage = async (event: MessageEvent) => {
          // Validate origin
          if (!event.origin.includes(window.location.hostname) && !event.origin.includes('run.app')) {
            // In development, origin might be different, but we check for common patterns
          }

          if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
            const newTokens = event.data.tokens;
            setDriveTokens(newTokens);
            window.removeEventListener('message', handleMessage);
            // Perform export with new tokens
            await performExport(newTokens);
          }
        };
        window.addEventListener('message', handleMessage);
        return;
      } catch (error) {
        console.error('Failed to initiate Google Auth:', error);
        alert('無法啟動 Google 認證，請確認瀏覽器未封鎖彈出視窗');
        return;
      }
    }

    await performExport(tokens);
  };

  const performExport = async (tokens: any) => {
    const csvContent = generateCSV();

    try {
      const response = await fetch('/api/export/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens,
          filename: `源創系統_${selectedYear}_年度報表.csv`,
          content: csvContent,
          mimeType: 'text/csv'
        })
      });
      const result = await response.json();
      if (result.success) {
        alert(`報表已成功匯出至 Google 雲端硬碟！\n檔案連結：${result.link}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('匯出失敗，請檢查權限或重新登入 Google');
      setDriveTokens(null); // Clear tokens on error to force re-auth
    }
  };
  
  // --- 畫面元件區 ---
  const DashboardView = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { title: '總營業額', value: financials.revenue, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { title: '年度淨利', value: financials.netProfit, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { title: '預估應納稅額', value: financials.taxPayable, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { title: '可分配紅利', value: financials.distributableDividend, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }
        ].map((kpi, idx) => (
          <div key={idx} className={`glass-panel rounded-[2rem] p-6 border ${kpi.border} transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${kpi.bg} opacity-50 group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-colors duration-500`}>
                <kpi.icon size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.title}</p>
                <h3 className="text-2xl md:text-3xl font-black text-black tracking-tighter">{formatMoney(kpi.value)}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="glass-panel rounded-[2.5rem] p-6 lg:p-8 flex flex-col min-h-[400px] border border-white/60">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-black tracking-tight">近期案件</h3>
            <button onClick={() => setActiveTab('projects')} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              <ArrowRight size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {filterData(yearFilteredProjects).length === 0 && <p className="text-slate-400 text-center font-bold mt-10">尚無案件</p>}
            {filterData(yearFilteredProjects).slice(0, 4).map((proj, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl hover:bg-white/80 transition-all hover:shadow-md border border-transparent hover:border-white/60">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-2xl bg-black flex items-center justify-center text-white font-black text-[10px] shadow-md">
                    {proj.date}
                  </div>
                  <div>
                    <p className="text-sm font-black text-black">{proj.client}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{proj.service} • {proj.salesRep}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-sm font-black text-black">{formatMoney(proj.totalAmount)}</p>
                  <StatusBadge status={proj.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2.5rem] p-6 lg:p-8 flex flex-col min-h-[400px] border border-white/60">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-black tracking-tight">最新報支</h3>
            <button onClick={() => setActiveTab('expenses')} className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              <ArrowRight size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {filterData(yearFilteredExpenses).length === 0 && <p className="text-slate-400 text-center font-bold mt-10">尚無報支記錄</p>}
            {filterData(yearFilteredExpenses).slice(0, 4).map((exp, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl hover:bg-white/80 transition-all hover:shadow-md border border-transparent hover:border-white/60">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-black font-black text-[10px] shadow-sm">
                    {exp.date}
                  </div>
                  <div>
                    <p className="text-sm font-black text-black">{exp.summary}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{exp.payer} • {exp.category}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-sm font-black text-rose-500">-{formatMoney(exp.total)}</p>
                  <StatusBadge status={exp.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ProjectsView = () => (
    <TableView 
      title="案件與銷項" 
      buttonText="新增案件"
      onAdd={() => { setEditingProject(null); setProjectModalOpen(true); }}
      onRowClick={(proj: any) => { setEditingProject(proj); setProjectModalOpen(true); }}
      data={filterData(yearFilteredProjects)}
      headers={[
        { label: '日期' }, { label: '編號' }, { label: '客戶名稱' }, { label: '服務項目' }, { label: '業務' },
        { label: '未稅金額', align: 'text-right' }, { label: '稅金', align: 'text-right' }, { label: '含稅總額', align: 'text-right' }, 
        { label: '實收淨利', align: 'text-right' }, { label: '狀態', align: 'text-center' }
      ]}
      renderRow={(proj: any) => {
        const netRealizedProfit = (Number(proj.netAmount) || 0) * 0.7 - (Number(proj.outsourcedAmount) || 0);
        return (
          <>
            <td className="px-4 py-4 rounded-l-2xl font-bold">{proj.date}</td>
            <td className="px-4 py-4 font-black text-black/40 group-hover:text-black transition-colors">{proj.projectNumber}</td>
            <td className="px-4 py-4 font-bold">{proj.client}</td>
            <td className="px-4 py-4 text-slate-600 font-medium">{proj.service}</td>
            <td className="px-4 py-4 text-slate-800 font-bold">{proj.salesRep}</td>
            <td className="px-4 py-4 font-black text-right">{formatMoney(proj.netAmount)}</td>
            <td className="px-4 py-4 font-black text-right text-slate-400">{formatMoney(proj.taxAmount)}</td>
            <td className="px-4 py-4 font-black text-right">{formatMoney(proj.totalAmount)}</td>
            <td className="px-4 py-4 font-black text-right text-blue-600">{formatMoney(netRealizedProfit)}</td>
            <td className="px-4 py-4 rounded-r-2xl text-center"><StatusBadge status={proj.status} /></td>
          </>
        );
      }}
    />
  );

  const ExpensesView = () => (
    <TableView 
      title="費用報支" 
      buttonText="新增報支"
      onAdd={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
      onRowClick={(exp: any) => { setEditingExpense(exp); setExpenseModalOpen(true); }}
      data={filterData(yearFilteredExpenses)}
      headers={[
        { label: '日期' }, { label: '類別' }, { label: '摘要(備註)' }, { label: '付款人' }, { label: '發票' }, { label: '已開立' },
        { label: '總額', align: 'text-right' }, { label: '狀態', align: 'text-center' }, { label: '操作', align: 'text-center' }
      ]}
      renderRow={(exp: any) => (
        <>
          <td className="px-4 py-4 rounded-l-2xl font-bold">{exp.date}</td>
          <td className="px-4 py-4 font-medium text-slate-500">{exp.category}</td>
          <td className="px-4 py-4 font-bold">{exp.summary}</td>
          <td className="px-4 py-4 font-medium text-blue-600">{exp.payer}</td>
          <td className="px-4 py-4 font-bold text-slate-500">{exp.invoice}</td>
          <td className="px-4 py-4 font-bold text-slate-500">{exp.isInvoiceIssued || '否'}</td>
          <td className="px-4 py-4 font-black text-right">{formatMoney(exp.total)}</td>
          <td className="px-4 py-4 text-center"><StatusBadge status={exp.status} /></td>
          <td className="px-4 py-4 rounded-r-2xl text-center">
            {exp.status === '待核銷' ? (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await updateDoc(doc(db, 'expenses', exp.id), { status: '已核銷' });
                  } catch (err) {
                    handleFirestoreError(err, 'update', 'expenses');
                  }
                }}
                className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
              >
                核准
              </button>
            ) : <span className="text-slate-300">-</span>}
          </td>
        </>
      )}
    />
  );

  const AssetsView = () => (
    <TableView 
      title="資產與攤提" 
      buttonText="登記資產"
      onAdd={() => { setEditingAsset(null); setAssetModalOpen(true); }}
      onRowClick={(asset: any) => { setEditingAsset(asset); setAssetModalOpen(true); }}
      data={filterData(yearFilteredAssets)}
      headers={[
        { label: '名稱' }, { label: '購入日' }, { label: '金額', align: 'text-right' }, 
        { label: '年限' }, { label: '月攤提', align: 'text-right' }, { label: '帳面殘值', align: 'text-right' }
      ]}
      renderRow={(asset: any) => {
        const monthlyAmort = Math.round((asset.cost - asset.residualValue) / (asset.usefulLife * 12));
        // 簡易殘值計算 (假設已過 1 年)
        const residual = Math.max(asset.residualValue, asset.cost - monthlyAmort * 12);
        return (
          <>
            <td className="px-4 py-4 rounded-l-2xl font-bold text-black">{asset.name}</td>
            <td className="px-4 py-4 font-medium text-slate-500">{asset.purchaseDate}</td>
            <td className="px-4 py-4 font-black text-right">{formatMoney(asset.cost)}</td>
            <td className="px-4 py-4 font-medium">{asset.usefulLife} 年</td>
            <td className="px-4 py-4 font-black text-right text-rose-600">{formatMoney(monthlyAmort)}</td>
            <td className="px-4 py-4 rounded-r-2xl font-black text-right text-black">{formatMoney(residual)}</td>
          </>
        );
      }}
    />
  );

  // --- Modal 元件：資產編輯/新增 ---
  const AssetModal = () => {
    const [name, setName] = useState(editingAsset?.name || '');
    const [cost, setCost] = useState(editingAsset?.cost?.toString() || '');
    const [purchaseDate, setPurchaseDate] = useState(editingAsset?.purchaseDate || getTodayString());
    const [usefulLife, setUsefulLife] = useState(editingAsset?.usefulLife?.toString() || '5');
    const [residualValue, setResidualValue] = useState(editingAsset?.residualValue?.toString() || '0');
    const [category, setCategory] = useState(editingAsset?.category || '辦公設備');
    const [year, setYear] = useState(editingAsset?.year || selectedYear);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const catOptions = ['辦公設備', '運輸設備', '生產設備', '無形資產', '其他'];

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const assetData = {
        name,
        cost: Number(cost) || 0,
        purchaseDate,
        year,
        usefulLife: Number(usefulLife) || 1,
        residualValue: Number(residualValue) || 0,
        category,
        status: editingAsset?.status || '使用中',
        uid: user.uid,
        createdAt: editingAsset?.createdAt || new Date().toISOString()
      };

      try {
        if (editingAsset) {
          await updateDoc(doc(db, 'assets', editingAsset.id), assetData);
        } else {
          await setDoc(doc(collection(db, 'assets')), assetData);
        }
        setAssetModalOpen(false);
        setEditingAsset(null);
      } catch (err) {
        handleFirestoreError(err, editingAsset ? 'update' : 'create', 'assets');
      }
    };

    const handleRemove = async () => {
      if (editingAsset) {
        try {
          await deleteDoc(doc(db, 'assets', editingAsset.id));
          setAssetModalOpen(false);
          setEditingAsset(null);
          setShowConfirmDelete(false);
        } catch (err) {
          handleFirestoreError(err, 'delete', 'assets');
        }
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black">{editingAsset ? '更新資產' : '登記新資產'}</h2>
            <button onClick={() => { setAssetModalOpen(false); setEditingAsset(null); }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">資產名稱</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="例如：MacBook Pro" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">購入金額</label>
                <input required type="number" value={cost} onChange={e => setCost(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-black" placeholder="NT$" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">購入日期 (MMDD)</label>
                <input required type="text" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="MMDD" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">耐用年限 (年)</label>
                <input required type="number" value={usefulLife} onChange={e => setUsefulLife(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">預估殘值</label>
                <input required type="number" value={residualValue} onChange={e => setResidualValue(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">資產類別</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {catOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">歸屬年度</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              {editingAsset && (
                <div className="flex-1 flex flex-col gap-2 order-3 sm:order-1">
                  {!showConfirmDelete ? (
                    <button type="button" onClick={() => setShowConfirmDelete(true)} className="w-full bg-rose-500 text-white rounded-xl py-3.5 font-black text-lg hover:bg-rose-600 transition-colors shadow-lg">
                      移除資產
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={handleRemove} className="flex-1 bg-rose-600 text-white rounded-xl py-3.5 font-black text-sm hover:bg-rose-700 transition-colors shadow-lg">
                        確認刪除
                      </button>
                      <button type="button" onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-sm hover:bg-slate-300 transition-colors">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={() => { setAssetModalOpen(false); setEditingAsset(null); }} className="flex-1 bg-slate-200 text-slate-700 rounded-xl py-3.5 font-black text-lg hover:bg-slate-300 transition-colors order-2">
                取消
              </button>
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:scale-[1.02] transition-transform shadow-lg order-1 sm:order-3">
                {editingAsset ? '更新資產' : '登記資產'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const FinancialsView = () => {
    const currentYearTax = taxDeductions.find(t => t.year === selectedYear);
    const initialTaxValues = currentYearTax?.values || {
      '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0, '11-12': 0
    };

    const [localTaxValues, setLocalTaxValues] = useState(initialTaxValues);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state if the year or fetched data changes
    useEffect(() => {
      setLocalTaxValues(initialTaxValues);
    }, [selectedYear, currentYearTax]);

    const handleConfirmTax = async () => {
      if (!user) return;
      setIsSaving(true);
      try {
        if (currentYearTax) {
          await updateDoc(doc(db, 'taxDeductions', currentYearTax.id), { values: localTaxValues });
        } else {
          await setDoc(doc(collection(db, 'taxDeductions')), {
            year: selectedYear,
            values: localTaxValues,
            uid: user.uid
          });
        }
        alert('稅金抵扣資料已更新');
      } catch (err) {
        handleFirestoreError(err, 'update', 'taxDeductions');
      } finally {
        setIsSaving(false);
      }
    };

    const totalTaxDeduction = Object.values(currentYearTax?.values || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

    const pieData = shareholders.map((sh, idx) => {
      const dividend = (financials.distributableDividend * sh.ratio) / 100;
      const repName = sh.name === 'T' ? 'Tim' : sh.name === 'C' ? 'Chris' : 'Sam';
      const bonus = financials.salesCommissions[repName] || 0;
      const imp = financials.implementationTotals[repName] || 0;
      return {
        name: sh.name,
        value: dividend + bonus + imp,
        dividend,
        bonus,
        imp,
        color: idx === 0 ? '#000000' : idx === 1 ? '#005bbb' : '#ff3b30'
      };
    });

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-black/5">
            <p className="font-black text-lg mb-2">{data.name} 股東明細</p>
            <div className="space-y-1 text-sm font-bold">
              <div className="flex justify-between gap-8">
                <span className="text-slate-500">分紅 (Dividend):</span>
                <span>{formatMoney(data.dividend)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-slate-500">業務獎金 (Bonus):</span>
                <span>{formatMoney(data.bonus)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-slate-500">實作貢獻 (Imp):</span>
                <span>{formatMoney(data.imp)}</span>
              </div>
              <div className="border-t border-black/10 pt-1 mt-1 flex justify-between gap-8 font-black text-black">
                <span>總額 (Total):</span>
                <span>{formatMoney(data.value)}</span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* 財務匯總卡片 */}
          <div className="glass-panel rounded-3xl flex flex-col">
            <div className="p-8 border-b border-black/5 bg-white/20">
              <h2 className="text-2xl font-black text-black tracking-tight">財務匯總與 401</h2>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {[
                  { label: '總營業額 (已完成)', value: financials.revenue, highlight: false },
                  { label: '(A) 銷項淨利', value: financials.salesNet, highlight: false },
                  { label: '(B) 銷項稅額', value: financials.salesTax, highlight: false },
                  { label: '(C) 進項金額 (已核銷)', value: financials.expenseTotal, highlight: false },
                  { label: '(D) 實際抵扣稅額', value: totalTaxDeduction, highlight: false },
                  { label: '(E) 應納稅額 (預估)', value: Math.max(0, (financials.taxPayable as number) - (totalTaxDeduction as number)), highlight: true, color: 'text-rose-600' },
                ].map((item, i) => (
                  <div key={i} className={`flex justify-between items-center py-3 ${item.highlight ? 'bg-white/60 px-4 rounded-2xl shadow-sm mt-4' : 'border-b border-black/5'}`}>
                    <span className={`font-bold ${item.highlight ? 'text-black' : 'text-slate-500'}`}>{item.label}</span>
                    <span className={`font-black ${item.highlight ? (item.color || 'text-black') + ' text-lg' : 'text-black'}`}>
                      {formatMoney(item.value)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <span className="font-bold text-slate-500">(F) 年度淨利</span>
                  <span className="font-black text-emerald-600 text-xl">{formatMoney(financials.netProfit)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <span className="font-bold text-slate-500">(G) 公積提列 (10%)</span>
                  <span className="font-black text-black">{formatMoney(financials.legalReserve)}</span>
                </div>
                <div className="flex justify-between items-center py-5 bg-black text-white px-6 rounded-2xl mt-6 shadow-xl transform transition-transform hover:scale-[1.02]">
                  <span className="font-bold tracking-widest uppercase text-sm">(H) 可分配紅利</span>
                  <span className="font-black text-2xl tracking-tight">{formatMoney(financials.distributableDividend)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 股東紅利分配 */}
          <div className="glass-panel rounded-3xl flex flex-col">
            <div className="p-8 border-b border-black/5 bg-white/20 flex justify-between items-center">
              <h2 className="text-2xl font-black text-black tracking-tight">股東分配</h2>
              <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
                <ArrowDown size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="w-full h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3">
                {shareholders.map((sh, idx) => {
                  const repName = sh.name === 'T' ? 'Tim' : sh.name === 'C' ? 'Chris' : 'Sam';
                  const dividend = (financials.distributableDividend * sh.ratio) / 100;
                  const bonus = financials.salesCommissions[repName] || 0;
                  const imp = financials.implementationTotals[repName] || 0;
                  const total = dividend + bonus + imp;

                  return (
                    <div key={idx} className="p-4 bg-white/50 rounded-2xl hover:bg-white/80 transition-colors shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-4 ${idx === 0 ? 'bg-black' : idx === 1 ? 'bg-[#005bbb]' : 'bg-[#ff3b30]'}`}></div>
                          <span className="font-black text-lg">{sh.name} 股東</span>
                        </div>
                        <span className="font-black text-xl">{formatMoney(total)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="bg-white/40 p-2 rounded-xl">
                          <p className="mb-1">Dividend ({sh.ratio}%)</p>
                          <p className="text-black text-xs font-black">{formatMoney(dividend)}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded-xl">
                          <p className="mb-1">Bonus</p>
                          <p className="text-black text-xs font-black">{formatMoney(bonus)}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded-xl">
                          <p className="mb-1">Imp</p>
                          <p className="text-black text-xs font-black">{formatMoney(imp)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 報稅抵扣稅金與營收圖表 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="glass-panel rounded-3xl p-8 lg:col-span-1">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Receipt size={20} /> 每期報稅抵扣稅金
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'].map(period => (
                <div key={period}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{period} 月期</label>
                  <input 
                    type="number" 
                    value={localTaxValues[period] || ''} 
                    onChange={e => setLocalTaxValues({ ...localTaxValues, [period]: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/50 font-black text-sm"
                    placeholder="NT$"
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={handleConfirmTax}
              disabled={isSaving}
              className="w-full mt-4 bg-black text-white rounded-xl py-2.5 font-bold text-sm hover:scale-[1.02] transition-transform shadow-md disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : '確認更新稅金'}
            </button>
            <div className="mt-6 p-4 bg-black text-white rounded-2xl flex justify-between items-center">
              <span className="font-bold text-sm">年度抵扣總額</span>
              <span className="font-black text-lg">{formatMoney(totalTaxDeduction as number)}</span>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 lg:col-span-2">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <TrendingUp size={20} /> 近 5 年營收比較
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fiveYearData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                  <ReTooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                    formatter={(value: number) => formatMoney(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold'}} />
                  <Line type="monotone" dataKey="revenue" name="總營收" stroke="#000000" strokeWidth={4} dot={{r: 6, fill: '#000', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                  <Line type="monotone" dataKey="netProfit" name="淨利" stroke="#005bbb" strokeWidth={4} dot={{r: 6, fill: '#005bbb', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                  <Line type="monotone" dataKey="taxDeduction" name="抵扣稅總額" stroke="#ff3b30" strokeWidth={4} dot={{r: 6, fill: '#ff3b30', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const navigation = [
    { id: 'dashboard', name: '總覽', icon: LayoutDashboard },
    { id: 'projects', name: '案件', icon: Briefcase },
    { id: 'expenses', name: '報支', icon: Receipt },
    { id: 'assets', name: '資產', icon: Building2 },
    { id: 'financials', name: '財務', icon: PieChart },
  ];

  return (
    <ErrorBoundary>
      <div className="flex flex-col md:flex-row h-screen font-sans relative z-10 text-slate-800 selection:bg-black selection:text-white bg-slate-50 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      
      {/* 流體背景 (Fluid Background) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-rose-300/20 mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-300/20 mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px]"></div>
      </div>

      {/* Modals 插入點 */}
      {isProjectModalOpen && <ProjectModal />}
      {isExpenseModalOpen && <ExpenseModal />}
      {isAssetModalOpen && <AssetModal />}

      {/* Desktop Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/60 flex-col hidden md:flex m-4 rounded-3xl shadow-xl overflow-hidden z-20">
        <div className="p-8 flex items-center">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/20 rotate-3">
            Y
          </div>
          <h1 className="ml-4 text-2xl font-black tracking-tighter">源創系統</h1>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-black text-white shadow-lg translate-x-1' 
                    : 'hover:bg-white/80 text-slate-500 hover:text-black hover:translate-x-1'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-bold tracking-tight">{item.name}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-6 space-y-4">
          {user ? (
            <div className="bg-white/50 p-3 rounded-2xl border border-white/60">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-black rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold">
                  {user.displayName?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{user.displayName || '使用者'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator</p>
                </div>
                <button onClick={() => auth.signOut()} className="p-2 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={handleDownloadCSV}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-800 text-white p-2.5 rounded-xl hover:bg-black transition-colors shadow-sm text-xs font-bold"
                >
                  <Download size={14} />
                  <span>下載年度報表 (CSV)</span>
                </button>
                <button 
                  onClick={handleExportToDrive}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-xs font-bold"
                >
                  <PieChart size={14} />
                  <span>匯出至 Google 試算表</span>
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="w-full flex items-center justify-center space-x-3 bg-black text-white p-4 rounded-2xl hover:scale-105 transition-transform shadow-lg"
            >
              <LogIn size={20} />
              <span className="font-bold">登入系統</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center space-y-1 transition-all duration-300 ${
                isActive ? 'text-black scale-110' : 'text-slate-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col overflow-hidden z-20 pb-20 md:pb-0">
        <header className="pt-4 px-4 md:pt-6 md:px-8">
          <div className="glass-panel rounded-3xl px-6 py-4 flex items-center justify-between shadow-sm border border-white/60">
            <div className="flex items-center w-full max-w-2xl">
              <div className="flex items-center space-x-3 mr-6">
                <div className="md:hidden w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-sm">Y</div>
                <h2 className="text-lg font-black tracking-tight whitespace-nowrap">
                  {selectedYear} <span className="text-slate-400 font-bold ml-1">年度</span>
                </h2>
              </div>
              
              <div className="flex-1 flex items-center space-x-4">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="hidden sm:block bg-white/50 border border-white/60 rounded-full px-4 py-2 font-black text-xs focus:outline-none focus:ring-2 focus:ring-black/20 transition-all cursor-pointer shadow-sm"
                >
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => (
                    <option key={y} value={y}>{y} 年度</option>
                  ))}
                </select>

                <div className="flex-1 flex items-center bg-white/50 border border-white/60 rounded-full px-4 py-2 focus-within:bg-white focus-within:shadow-md transition-all">
                  <Search size={16} className="text-slate-400" strokeWidth={3} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋案件、客戶、業務..." 
                    className="bg-transparent border-none focus:outline-none text-xs font-bold ml-2 w-full text-black placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-4">
              <button className="hidden sm:flex w-9 h-9 rounded-full bg-white/50 items-center justify-center hover:bg-white transition-colors relative shadow-sm border border-white/60">
                <Bell size={16} strokeWidth={2.5} className="text-black" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
              </button>
              {user && (
                <div className="md:hidden flex space-x-2">
                  <button 
                    onClick={handleDownloadCSV}
                    className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-sm"
                    title="下載 CSV"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={handleExportToDrive}
                    className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm"
                    title="匯出至 Google 試算表"
                  >
                    <PieChart size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 no-scrollbar">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'projects' && <ProjectsView />}
            {activeTab === 'expenses' && <ExpensesView />}
            {activeTab === 'assets' && <AssetsView />}
            {activeTab === 'financials' && <FinancialsView />}
          </div>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
