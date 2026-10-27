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
          <pre className="bg-white p-4 rounded-xl text-xs text-left overflow-auto max-w-full border border-rose-200 shadow-sm font-mono whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
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

// --- 自訂 CSS 樣式 (輕量化) ---
const customStyles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .glass-panel {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  }
  .glass-modal {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
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
  if (status === '已完工' || status === '已完成' || status === '已核銷' || status === '已到貨') {
    style = { background: '#000', color: '#fff' };
  } else if (status === '進行中' || status === '確認報價') {
    style = { background: '#005bbb', color: '#fff' };
  } else if (status === '待撥款' || status === '待開立' || status === '待核銷') {
    style = { background: '#ff3b30', color: '#fff' };
  }
  return (
    <span className="px-3 py-1.5 text-xs font-bold rounded-full tracking-wider shadow-sm whitespace-nowrap inline-block" style={style}>
      {status}
    </span>
  );
};

const TableView = ({ title, buttonText, headers, renderRow, renderMobileCard, data, onAdd, onRowClick, topContent }: any) => (
  <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden">
    <div className="p-4 sm:p-6 lg:p-8 border-b border-black/5 flex justify-between items-center bg-white/20">
      <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">{title}</h2>
      <button 
        onClick={onAdd}
        className="bg-black text-white px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors flex items-center shadow-lg"
      >
        <Plus size={16} className="mr-1 sm:mr-1.5" strokeWidth={3} /> {buttonText}
      </button>
    </div>
    <div className="p-3 sm:p-4 md:p-6 space-y-4">
      {topContent}
      {/* 手機卡片化檢視 (iPhone / Mobile View) */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold bg-white/30 rounded-2xl">
            目前尚無資料，或沒有符合搜尋條件的項目
          </div>
        ) : (
          data.map((row: any, idx: number) => (
            <div 
              key={idx}
              onClick={() => onRowClick && onRowClick(row)}
              className="bg-white/70 hover:bg-white/95 shadow-sm rounded-2xl p-4 border border-black/5 space-y-2.5 cursor-pointer"
            >
              {renderMobileCard ? renderMobileCard(row, idx) : (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-black">{row.client || row.summary || row.name}</span>
                  <StatusBadge status={row.status} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 電腦表格化檢視 (Desktop View) */}
      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr>
              {headers.map((h: any, i: number) => (
                <th key={i} className={`px-3 py-3 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider ${h.align || ''} ${h.className || ''}`}>
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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed', error);
      let errMsg = error?.message || '未知錯誤';
      if (error?.code === 'auth/unauthorized-domain') {
        errMsg = '未經授權的網域！請確保在 Firebase Console 的「Authentication -> Settings -> Authorized domains」中加入您目前的網址 (例如 127.0.0.1 或 github.io 網域)，或嘗試使用 localhost。';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errMsg = '彈出視窗已關閉。請確認沒有被瀏覽器阻擋，或重新點擊登入。';
      }
      alert('登入失敗: ' + errMsg);
    }
  };

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
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setProjects(loaded);
      loaded.forEach((p: any) => {
        if (p.implementers && p.id) {
          const net = Number(p.netAmount) || 0;
          const poolRate = p.implementationPoolRate !== undefined && p.implementationPoolRate !== '' ? Number(p.implementationPoolRate) : 30;
          let needsSync = false;
          const syncedImps: any = { ...p.implementers };
          const totalProjScore = Object.keys(p.implementers).reduce((s, n) => s + (Number(p.implementers[n]?.score) || 0), 0);
          Object.keys(p.implementers).forEach(name => {
            const contrib = Number(p.implementers[name]?.contribution) || 0;
            const pScore = Number(p.implementers[name]?.score) || 0;
            const expectedAmount = totalProjScore > 0
              ? Math.round(net * (poolRate / 100) * (pScore / totalProjScore))
              : Math.round(net * (poolRate / 100) * (contrib / 100));
            if (Number(p.implementers[name]?.amount) !== expectedAmount) {
              syncedImps[name] = { ...p.implementers[name], contribution: contrib, amount: expectedAmount };
              needsSync = true;
            }
          });
          if (needsSync) {
            updateDoc(doc(db, 'projects', p.id), { implementers: syncedImps }).catch(e => console.error(e));
          }
        }
      });
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

  // 外包總額計算輔助函式 (相容舊版單一欄位與新版陣列欄位)
  const getProjectOutsourcedTotal = (p: any) => {
    if (Array.isArray(p.outsourcedItems) && p.outsourcedItems.length > 0) {
      return p.outsourcedItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    }
    return Number(p.outsourcedAmount) || 0;
  };

  // 連結報支總金額計算 (支援同一個專案連結多張報支)
  const getProjectLinkedExpensesTotal = (projectNumber: string) => {
    if (!projectNumber) return 0;
    return expenses
      .filter(e => e.linkedProjectNumber === projectNumber)
      .reduce((sum: number, e: any) => sum + (Number(e.total) || 0), 0);
  };

  // 業務獎金計算 (非'無'時，舊客戶扣5%，新客戶扣15%，可自訂基本與新客加碼%)
  const getProjectSalesBonus = (p: any) => {
    if (!p.salesRep || p.salesRep === '無') return 0;
    const net = Number(p.netAmount) || 0;
    const baseRate = p.baseBonusRate !== undefined && p.baseBonusRate !== '' ? Number(p.baseBonusRate) : 5;
    const newClientRate = p.newClientBonusRate !== undefined && p.newClientBonusRate !== '' ? Number(p.newClientBonusRate) : 10;
    const totalRate = baseRate + (p.isNewClient === '是' ? newClientRate : 0);
    return Math.round(net * (totalRate / 100));
  };

  // 案件實收淨利計算 (未稅扣除額 - 業務獎金扣除 - 外包金額 - 連結報支金額)
  const getProjectNetProfit = (p: any) => {
    const poolRate = p.implementationPoolRate !== undefined && p.implementationPoolRate !== '' ? Number(p.implementationPoolRate) : 30;
    const deductionRate = (100 - poolRate) / 100;
    const netDeduction = (Number(p.netAmount) || 0) * deductionRate;
    const salesBonus = getProjectSalesBonus(p);
    const outsourced = getProjectOutsourcedTotal(p);
    const linkedExpensesTotal = getProjectLinkedExpensesTotal(p.projectNumber);
    return netDeduction - salesBonus - outsourced - linkedExpensesTotal;
  };

  // 根據年度篩選與自動排序 (進行中與待核銷排上方)
  const yearFilteredProjects = useMemo(() => {
    const list = projects.filter(p => p.year === selectedYear);
    return list.sort((a, b) => {
      const statusOrder: Record<string, number> = { '進行中': 1, '暫停': 2, '已完成': 3 };
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (b.projectNumber || '').localeCompare(a.projectNumber || '');
    });
  }, [projects, selectedYear]);

  const yearFilteredExpenses = useMemo(() => {
    const list = expenses.filter(e => e.year === selectedYear);
    return list.sort((a, b) => {
      const statusOrder: Record<string, number> = { '待核銷': 1, '已核銷': 2 };
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (b.expenseNumber || b.date || '').localeCompare(a.expenseNumber || a.date || '');
    });
  }, [expenses, selectedYear]);

  const yearFilteredAssets = useMemo(() => assets.filter(a => a.year === selectedYear), [assets, selectedYear]);

  // 動態計算財務數據
  const financials = useMemo(() => {
    const completedProjects = yearFilteredProjects.filter(p => p.status === '已完成');
    const approvedExpenses = yearFilteredExpenses.filter(e => e.status === '已核銷');

    const revenue = completedProjects.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const netRevenue = completedProjects.reduce((sum, p) => sum + (Number(p.netAmount) || 0), 0);
    const expenseTotal = approvedExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
    const taxPayable = completedProjects.reduce((sum, p) => sum + (Number(p.taxAmount) || 0), 0);
    
    // 實收淨利 = 完成案件實收淨利 - 未連結至專案的獨立已核銷費用
    const completedProjectsProfit = completedProjects.reduce((sum, p) => sum + getProjectNetProfit(p), 0);
    const unlinkedApprovedExpensesTotal = approvedExpenses
      .filter(e => !e.linkedProjectNumber)
      .reduce((sum, e) => sum + (Number(e.total) || 0), 0);
    const netProfit = completedProjectsProfit - unlinkedApprovedExpensesTotal;

    const legalReserve = netProfit > 0 ? netProfit * 0.1 : 0;
    const distributableDividend = netProfit > 0 ? netProfit - legalReserve : 0;

    // 業務獎金與實作貢獻計算
    const salesCommissions: any = { Tim: 0, Chris: 0, Sam: 0 };
    const implementationTotals: any = { Tim: 0, Chris: 0, Sam: 0 };

    completedProjects.forEach(p => {
      const rep = p.salesRep === 'T' ? 'Tim' : p.salesRep === 'C' ? 'Chris' : p.salesRep === 'S' ? 'Sam' : p.salesRep;
      const salesBonus = getProjectSalesBonus(p);
      
      // 業務獎金: 為每一筆"已完成"的專案中，業務可得的金額 (舊客扣5%，新客扣15%)
      if (salesCommissions[rep] !== undefined) {
        salesCommissions[rep] += salesBonus;
      }

      // 實作貢獻: 為每一筆"已完成"的專案中各自分配的金額總和
      if (p.implementers) {
        Object.keys(p.implementers).forEach(name => {
          const normName = name === 'T' ? 'Tim' : name === 'C' ? 'Chris' : name === 'S' ? 'Sam' : name;
          if (implementationTotals[normName] !== undefined) {
            const savedAmount = Number(p.implementers[name]?.amount);
            if (!(Number(p.implementers[name]?.contribution) > 0) && !isNaN(savedAmount) && p.implementers[name]?.amount !== undefined && p.implementers[name]?.amount !== null) {
              implementationTotals[normName] += savedAmount;
            } else {
              const contrib = Number(p.implementers[name]?.contribution) || 0;
              const poolRate = p.implementationPoolRate !== undefined && p.implementationPoolRate !== '' ? Number(p.implementationPoolRate) : 30;
              const net = Number(p.netAmount) || 0;
              const totalProjScore = Object.keys(p.implementers).reduce((s, n) => s + (Number(p.implementers[n]?.score) || 0), 0);
              const pScore = Number(p.implementers[name]?.score) || 0;
              implementationTotals[normName] += totalProjScore > 0
                ? Math.round(net * (poolRate / 100) * (pScore / totalProjScore))
                : Math.round(net * (poolRate / 100) * (contrib / 100));
            }
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
  }, [yearFilteredProjects, yearFilteredExpenses, expenses]);

  // 近 5 年營收比較數據
  const fiveYearData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
    
    return years.map(y => {
      const yearProjects = projects.filter(p => p.year === y && p.status === '已完成');
      const yearExpenses = expenses.filter(e => e.year === y && e.status === '已核銷');
      const yearTaxDeduction = taxDeductions.find(t => t.year === y && !t.values?.isGovernanceDoc);
      const totalTaxDeduction = yearTaxDeduction ? 
        Object.values(yearTaxDeduction.values || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;

      const revenue = yearProjects.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const expenseTotal = yearExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
      const netProfit = yearProjects.reduce((sum, p) => sum + getProjectNetProfit(p), 0) - 
        yearExpenses.filter(e => !e.linkedProjectNumber).reduce((sum, e) => sum + (Number(e.total) || 0), 0);

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

  const defaultImplementationItems = [
    { id: '1', name: '外出', ratio: 2, note: '現場場勘、取件與客戶端外勤作業' },
    { id: '2', name: '掃描', ratio: 2, note: '3D 掃描作業與點雲資料擷取' },
    { id: '3', name: '繪圖', ratio: 7, note: '2D/3D 工程圖面繪製與建模' },
    { id: '4', name: '設計', ratio: 5, note: '產品機構設計、逆向曲面建構' },
    { id: '5', name: '採購', ratio: 1, note: '耗材、外購件詢價與廠商發包聯繫' },
    { id: '6', name: '實作', ratio: 3, note: '模型製作、打樣組裝與後處理' },
    { id: '7', name: '專案討論', ratio: 2, note: '內部技術會議、客戶需求對焦討論' },
    { id: '8', name: '修正作業', ratio: 2, note: '設變修改、公差調整與最終驗收修正' }
  ];
  const currentGovDoc = taxDeductions.find(t => t.values?.isGovernanceDoc === true);
  const activeImplementationItems: any[] = Array.isArray(currentGovDoc?.values?.governance?.implementationItems) && currentGovDoc.values.governance.implementationItems.length > 0
    ? currentGovDoc.values.governance.implementationItems
    : defaultImplementationItems;

  // --- Modal 元件：案件編輯/新增 ---
  const ProjectModal = () => {
    const [client, setClient] = useState(editingProject?.client || '');
    const [services, setServices] = useState<string[]>(editingProject?.service?.split(', ') || []);
    const [netAmount, setNetAmount] = useState(editingProject?.netAmount?.toString() || '');
    const [taxAmount, setTaxAmount] = useState(editingProject?.taxAmount?.toString() || '');
    const [totalAmount, setTotalAmount] = useState(editingProject?.totalAmount?.toString() || '');
    const [salesRep, setSalesRep] = useState(editingProject?.salesRep || 'Tim');
    const [isNewClient, setIsNewClient] = useState(editingProject?.isNewClient || '否');
    const [baseBonusRate, setBaseBonusRate] = useState(editingProject?.baseBonusRate !== undefined ? editingProject.baseBonusRate.toString() : '5');
    const [newClientBonusRate, setNewClientBonusRate] = useState(editingProject?.newClientBonusRate !== undefined ? editingProject.newClientBonusRate.toString() : '10');
    const [implementationPoolRate, setImplementationPoolRate] = useState<number>(
      editingProject?.implementationPoolRate !== undefined && editingProject?.implementationPoolRate !== '' 
        ? Number(editingProject.implementationPoolRate) 
        : 30
    );
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
    const [implementers, setImplementers] = useState(() => {
      const raw = editingProject?.implementers || { Tim: { contribution: 0, amount: 0 }, Chris: { contribution: 0, amount: 0 }, Sam: { contribution: 0, amount: 0 } };
      const net = Number(editingProject?.netAmount) || 0;
      const poolRate = editingProject?.implementationPoolRate !== undefined && editingProject?.implementationPoolRate !== '' ? Number(editingProject.implementationPoolRate) : 30;
      const initImps: any = {};
      const hasSel = ['Tim', 'Chris', 'Sam'].some(n => Array.isArray(raw[n]?.selectedItems));
      const scores: Record<string, number> = { Tim: 0, Chris: 0, Sam: 0 };
      ['Tim', 'Chris', 'Sam'].forEach(name => {
        const sel: string[] = Array.isArray(raw[name]?.selectedItems) ? raw[name].selectedItems : [];
        scores[name] = sel.reduce((sum, itemId) => {
          const found = activeImplementationItems.find((it: any) => String(it.id) === String(itemId) || it.name === itemId);
          return sum + (Number(found?.ratio) || 0);
        }, 0);
      });
      const totalScore = scores.Tim + scores.Chris + scores.Sam;
      ['Tim', 'Chris', 'Sam'].forEach(name => {
        if (hasSel) {
          const pScore = scores[name];
          const contrib = totalScore > 0 ? Math.round((pScore / totalScore) * 1000) / 10 : 0;
          initImps[name] = {
            selectedItems: Array.isArray(raw[name]?.selectedItems) ? raw[name].selectedItems : [],
            score: pScore,
            contribution: contrib,
            amount: totalScore > 0 ? Math.round(net * (poolRate / 100) * (pScore / totalScore)) : 0
          };
        } else {
          const contrib = Number(raw[name]?.contribution) || 0;
          initImps[name] = {
            contribution: contrib,
            amount: contrib > 0 ? Math.round(net * (poolRate / 100) * (contrib / 100)) : (Number(raw[name]?.amount) || 0)
          };
        }
      });
      return initImps;
    });
    const _unusedDefaultImps = ({
      Tim: { contribution: 0, amount: 0 },
      Chris: { contribution: 0, amount: 0 },
      Sam: { contribution: 0, amount: 0 }
    });

    // 外包廠商動態清單
    const initialOutsourcedItems = useMemo(() => {
      if (editingProject?.outsourcedItems && Array.isArray(editingProject.outsourcedItems) && editingProject.outsourcedItems.length > 0) {
        return editingProject.outsourcedItems;
      }
      if (editingProject?.outsourcedStaff || editingProject?.outsourcedAmount) {
        return [{ id: '1', vendor: editingProject.outsourcedStaff || '', amount: Number(editingProject.outsourcedAmount) || 0 }];
      }
      return [{ id: '1', vendor: '', amount: 0 }];
    }, [editingProject]);

    const [outsourcedItems, setOutsourcedItems] = useState<any[]>(initialOutsourcedItems);
    const [projectProgress, setProjectProgress] = useState(editingProject?.projectProgress || '');

    // 查詢連結至此案件的報支與資產
    const linkedExpenses = useMemo(() => {
      if (!projectNumber) return [];
      return expenses.filter(e => e.linkedProjectNumber === projectNumber);
    }, [expenses, projectNumber]);

    const linkedAssets = useMemo(() => {
      if (!projectNumber) return [];
      return assets.filter(a => a.linkedProjectNumber === projectNumber);
    }, [assets, projectNumber]);

    const serviceOptions = ['掃描', '逆向', '設計', '模型製作', '量產需求', '外購'];
    const salesOptions = ['Tim', 'Chris', 'Sam', '無', '其他(備註)'];
    const invoiceOptions = ['是', '否'];

    const recalculateImplementers = (
      netVal = netAmount,
      outsourcedList = outsourcedItems,
      poolRate = implementationPoolRate,
      imps = implementers,
      rep = salesRep,
      newClient = isNewClient,
      bRate = baseBonusRate,
      ncRate = newClientBonusRate
    ) => {
      const net = Number(netVal) || 0;
      const currentOutsourced = outsourcedList.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
      const currentLinkedExpSum = linkedExpenses.reduce((s: number, e: any) => s + (Number(e.total) || 0), 0);
      const deductionRate = (100 - poolRate) / 100;
      
      const bonusRate = rep === '無' ? 0 : ((Number(bRate) || 5) + (newClient === '是' ? (Number(ncRate) || 10) : 0));
      const sBonus = Math.round(net * (bonusRate / 100));

      const profit = Math.max(0, net * deductionRate - sBonus - currentOutsourced - currentLinkedExpSum);
      
      const newImps: any = {};
      Object.keys(imps).forEach(name => {
        const contrib = Number(imps[name]?.contribution) || 0;
        newImps[name] = {
          contribution: (() => {
            const hasSel = ['Tim', 'Chris', 'Sam'].some(n => Array.isArray(imps[n]?.selectedItems));
            if (!hasSel) return contrib;
            const scores: Record<string, number> = { Tim: 0, Chris: 0, Sam: 0 };
            ['Tim', 'Chris', 'Sam'].forEach(n => {
              const sel: string[] = Array.isArray(imps[n]?.selectedItems) ? imps[n].selectedItems : [];
              scores[n] = sel.reduce((sum, itemId) => {
                const found = activeImplementationItems.find((it: any) => String(it.id) === String(itemId) || it.name === itemId);
                return sum + (Number(found?.ratio) || 0);
              }, 0);
            });
            const totalScore = scores.Tim + scores.Chris + scores.Sam;
            const pScore = scores[name] || 0;
            return totalScore > 0 ? Math.round((pScore / totalScore) * 1000) / 10 : 0;
          })(),
          amount: (() => {
            const hasSel = ['Tim', 'Chris', 'Sam'].some(n => Array.isArray(imps[n]?.selectedItems));
            if (!hasSel) return Math.round(net * (poolRate / 100) * (contrib / 100));
            const scores: Record<string, number> = { Tim: 0, Chris: 0, Sam: 0 };
            ['Tim', 'Chris', 'Sam'].forEach(n => {
              const sel: string[] = Array.isArray(imps[n]?.selectedItems) ? imps[n].selectedItems : [];
              scores[n] = sel.reduce((sum, itemId) => {
                const found = activeImplementationItems.find((it: any) => String(it.id) === String(itemId) || it.name === itemId);
                return sum + (Number(found?.ratio) || 0);
              }, 0);
            });
            const totalScore = scores.Tim + scores.Chris + scores.Sam;
            const pScore = scores[name] || 0;
            return totalScore > 0 ? Math.round(net * (poolRate / 100) * (pScore / totalScore)) : 0;
          })(),
          score: (() => {
            if (!Array.isArray(imps[name]?.selectedItems)) return imps[name]?.score;
            return imps[name].selectedItems.reduce((sum: number, itemId: string) => {
              const found = activeImplementationItems.find((it: any) => String(it.id) === String(itemId) || it.name === itemId);
              return sum + (Number(found?.ratio) || 0);
            }, 0);
          })(),
          selectedItems: imps[name]?.selectedItems
        };
      });
      return newImps;
    };

    const handleToggleService = (s: string) => {
      setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    const handleAddOutsourced = () => {
      const newList = [...outsourcedItems, { id: Date.now().toString(), vendor: '', amount: 0 }];
      setOutsourcedItems(newList);
      setImplementers(recalculateImplementers(netAmount, newList, implementationPoolRate, implementers));
    };

    const handleRemoveOutsourced = (id: string) => {
      const newList = outsourcedItems.filter(item => item.id !== id);
      setOutsourcedItems(newList);
      setImplementers(recalculateImplementers(netAmount, newList, implementationPoolRate, implementers));
    };

    const handleOutsourcedItemChange = (id: string, field: string, val: any) => {
      const newList = outsourcedItems.map(item => item.id === id ? { ...item, [field]: val } : item);
      setOutsourcedItems(newList);
      setImplementers(recalculateImplementers(netAmount, newList, implementationPoolRate, implementers));
    };

    const handlePoolRateChange = (rate: number) => {
      setImplementationPoolRate(rate);
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, rate, implementers));
    };

    const handleNetAmountChange = (val: string) => {
      const net = Number(val) || 0;
      const tax = Math.round(net * 0.05);
      const total = net + tax;
      setNetAmount(val);
      setTaxAmount(tax.toString());
      setTotalAmount(total.toString());
      setImplementers(recalculateImplementers(val, outsourcedItems, implementationPoolRate, implementers));
    };

    const handleSalesRepChange = (rep: string) => {
      setSalesRep(rep);
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, implementers, rep, isNewClient, baseBonusRate, newClientBonusRate));
    };

    const handleIsNewClientChange = (val: string) => {
      setIsNewClient(val);
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, implementers, salesRep, val, baseBonusRate, newClientBonusRate));
    };

    const handleBaseBonusRateChange = (val: string) => {
      setBaseBonusRate(val);
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, implementers, salesRep, isNewClient, val, newClientBonusRate));
    };

    const handleNewClientBonusRateChange = (val: string) => {
      setNewClientBonusRate(val);
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, implementers, salesRep, isNewClient, baseBonusRate, val));
    };

    const handleToggleImplementerItem = (name: string, itemId: string) => {
      const nextImps: any = {};
      ['Tim', 'Chris', 'Sam'].forEach(n => {
        const currentSelected: string[] = Array.isArray(implementers[n]?.selectedItems) ? implementers[n].selectedItems : [];
        nextImps[n] = {
          ...implementers[n],
          selectedItems: n === name
            ? (currentSelected.includes(itemId) ? currentSelected.filter(id => id !== itemId) : [...currentSelected, itemId])
            : currentSelected
        };
      });
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, nextImps));
    };

    const handleContributionChange = (name: string, val: number) => {
      const contribution = Math.min(100, Math.max(0, val));
      const updatedImps = {
        ...implementers,
        [name]: { ...implementers[name], contribution }
      };
      setImplementers(recalculateImplementers(netAmount, outsourcedItems, implementationPoolRate, updatedImps));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const finalSalesRep = salesRep === '其他(備註)' ? otherRep : salesRep;
      
      const validOutsourcedItems = outsourcedItems.filter(i => i.vendor.trim() !== '' || Number(i.amount) > 0);
      const totalOutsourcedAmount = validOutsourcedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const vendorSummary = validOutsourcedItems.map(item => item.vendor).filter(Boolean).join(', ');

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
        baseBonusRate: Number(baseBonusRate) || 0,
        newClientBonusRate: Number(newClientBonusRate) || 0,
        implementationPoolRate,
        implementers,
        outsourcedItems: validOutsourcedItems,
        outsourcedStaff: vendorSummary,
        outsourcedAmount: totalOutsourcedAmount,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-2xl rounded-3xl p-4 sm:p-6 md:p-8 my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden">
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
                <input required type="text" value={projectNumber} onChange={e => setProjectNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" />
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
              <input required type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="輸入客戶名稱" />
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
                <input required type="number" value={netAmount} onChange={e => handleNetAmountChange(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-black text-lg" placeholder="NT$" />
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

            {/* 實收淨利即時試算卡片 */}
            {(() => {
              const currentOutsourced = outsourcedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
              const currentLinkedExpSum = linkedExpenses.reduce((s, e) => s + (Number(e.total) || 0), 0);
              const deductionRate = (100 - implementationPoolRate) / 100;
              const currentNetDeduction = (Number(netAmount) || 0) * deductionRate;
              
              const bonusRate = salesRep === '無' ? 0 : ((Number(baseBonusRate) || 5) + (isNewClient === '是' ? (Number(newClientBonusRate) || 10) : 0));
              const currentSalesBonus = Math.round((Number(netAmount) || 0) * (bonusRate / 100));

              const liveNetProfit = currentNetDeduction - currentSalesBonus - currentOutsourced - currentLinkedExpSum;

              return (
                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white shadow-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-400" /> 專案實收淨利即時試算
                    </span>
                    <span className={`text-2xl font-black ${liveNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatMoney(liveNetProfit)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <span className="text-slate-400 block mb-0.5">未稅 {100 - implementationPoolRate}% 扣除額</span>
                      <span className="text-white font-black text-xs">{formatMoney(currentNetDeduction)}</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <span className="text-sky-300 block mb-0.5">業務獎金扣除 ({bonusRate}%)</span>
                      <span className="text-sky-400 font-black text-xs">-{formatMoney(currentSalesBonus)}</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <span className="text-rose-300 block mb-0.5">外包扣除 (-)</span>
                      <span className="text-rose-400 font-black text-xs">-{formatMoney(currentOutsourced)}</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                      <span className="text-amber-300 block mb-0.5">連結報支扣除 (-)</span>
                      <span className="text-amber-400 font-black text-xs">-{formatMoney(currentLinkedExpSum)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 業務與獎金 % 數區塊 */}
            <div className="p-4 bg-white/40 rounded-2xl border border-black/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">業務</label>
                  <select value={salesRep} onChange={e => handleSalesRepChange(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                    {salesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {salesRep === '其他(備註)' && (
                    <input required type="text" value={otherRep} onChange={e => setOtherRep(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold mt-2" placeholder="請填寫業務備註" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">新客戶</label>
                  <select value={isNewClient} onChange={e => handleIsNewClientChange(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-black/5 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">業務基本獎金 % 數</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      value={baseBonusRate} 
                      onChange={e => handleBaseBonusRateChange(e.target.value)} 
                      className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 font-black" 
                      placeholder="5" 
                    />
                    <span className="font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">新客加碼獎金 % 數</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      value={newClientBonusRate} 
                      onChange={e => handleNewClientBonusRateChange(e.target.value)} 
                      className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 font-black" 
                      placeholder="10" 
                    />
                    <span className="font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-black/5 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <label className="block text-sm font-bold text-slate-700">
                  實作人員與貢獻 (未稅 {implementationPoolRate}% 獎金池：{formatMoney(Math.round((Number(netAmount) || 0) * (implementationPoolRate / 100)))} • 專案總分：{['Tim', 'Chris', 'Sam'].reduce((s, n) => s + (Number(implementers[n]?.score) || 0), 0)} 分)
                </label>
                <div className="grid grid-cols-3 sm:flex bg-white/60 p-1 rounded-xl border border-black/10 text-xs font-bold w-full sm:w-auto shadow-sm">
                  <button 
                    type="button"
                    onClick={() => handlePoolRateChange(0)}
                    className={`px-3 py-1 rounded-lg transition-colors ${implementationPoolRate === 0 ? 'bg-black text-white shadow-sm font-black' : 'text-slate-500 hover:text-black'}`}
                  >
                    0% 獎金池
                  </button>
                  <button 
                    type="button"
                    onClick={() => handlePoolRateChange(30)}
                    className={`px-3 py-1 rounded-lg transition-colors ${implementationPoolRate === 30 ? 'bg-black text-white shadow-sm font-black' : 'text-slate-500 hover:text-black'}`}
                  >
                    30% 獎金池
                  </button>
                  <button 
                    type="button"
                    onClick={() => handlePoolRateChange(50)}
                    className={`px-3 py-1 rounded-lg transition-colors ${implementationPoolRate === 50 ? 'bg-black text-white shadow-sm font-black' : 'text-slate-500 hover:text-black'}`}
                  >
                    50% 獎金池
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {['Tim', 'Chris', 'Sam'].map(name => (
                  <div key={name} className="bg-white/50 p-3 sm:p-4 rounded-2xl border border-black/5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-800 text-sm sm:text-base">{name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${(Number(implementers[name]?.score) || 0) > 0 || (Number(implementers[name]?.contribution) || 0) > 0 ? 'bg-black text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {Number(implementers[name]?.score) || 0} / {['Tim', 'Chris', 'Sam'].reduce((s, n) => s + (Number(implementers[n]?.score) || 0), 0)} 分 ({implementers[name]?.contribution || 0}%)
                        </span>
                      </div>
                      <div className="font-black text-black text-sm sm:text-base shrink-0">
                        {formatMoney(implementers[name]?.amount || 0)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeImplementationItems.map((item: any) => {
                        const selList: string[] = Array.isArray(implementers[name]?.selectedItems) ? implementers[name].selectedItems : [];
                        const isSelected = selList.includes(String(item.id)) || selList.includes(item.name);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleImplementerItem(name, String(item.id))}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${isSelected ? 'bg-black text-white border-black shadow-sm' : 'bg-white/80 text-slate-600 border-black/10 hover:bg-white hover:text-black'}`}
                          >
                            {item.name} ({item.ratio}分)
                          </button>
                        );
                      })}
                    </div>
                    <div className="hidden">
                    <div className="col-span-3 sm:col-span-4 font-bold text-slate-700 text-sm sm:text-base">{name}</div>
                    <div className="col-span-5 sm:col-span-4 flex items-center space-x-1.5 min-w-0">
                      <input 
                        type="number" 
                        value={implementers[name].contribution} 
                        onChange={e => handleContributionChange(name, parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-sm"
                        placeholder="貢獻 %"
                      />
                      <span className="font-bold text-slate-400 text-xs sm:text-sm">%</span>
                    </div>
                    <div className="col-span-4 sm:col-span-4 text-right font-black text-black text-sm truncate">
                      {formatMoney(implementers[name].amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 外包廠商多筆新增區塊 */}
            <div className="border-t border-black/5 pt-5">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-slate-700">外包廠商與金額 (可新增多家)</label>
                <button 
                  type="button" 
                  onClick={handleAddOutsourced}
                  className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-full hover:bg-black transition-colors flex items-center space-x-1 shadow-sm"
                >
                  <Plus size={14} /> <span>新增外包廠商</span>
                </button>
              </div>

              <div className="space-y-3">
                {outsourcedItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 bg-white/40 p-3 rounded-2xl border border-black/5 shadow-sm">
                    <input 
                      type="text" 
                      value={item.vendor} 
                      onChange={e => handleOutsourcedItemChange(item.id, 'vendor', e.target.value)} 
                      className="w-full sm:flex-1 min-w-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 font-bold text-sm" 
                      placeholder="外包廠商名稱" 
                    />
                    <input 
                      type="number" 
                      value={item.amount || ''} 
                      onChange={e => handleOutsourcedItemChange(item.id, 'amount', Number(e.target.value) || 0)} 
                      className="flex-1 sm:flex-none sm:w-36 min-w-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 font-black text-sm text-right" 
                      placeholder="NT$" 
                    />
                    {outsourcedItems.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveOutsourced(item.id)}
                        className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 連結之銷項與費用明細 (支援同專案連結多張報支) */}
            <div className="border-t border-black/5 pt-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700">連結報支與進項明細 ({linkedExpenses.length} 筆)</label>
                  <p className="text-[11px] font-bold text-slate-400">已連結報支扣除總計：{formatMoney(linkedExpenses.reduce((s, e) => s + (Number(e.total) || 0), 0))}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingExpense({ linkedProjectNumber: projectNumber });
                    setExpenseModalOpen(true);
                  }}
                  className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-full hover:bg-amber-700 transition-colors flex items-center space-x-1 shadow-sm"
                >
                  <Plus size={14} /> <span>連結新報支</span>
                </button>
              </div>

              {linkedExpenses.length === 0 && linkedAssets.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 bg-white/30 p-3 rounded-2xl text-center border border-dashed border-black/10">
                  目前尚無連結至此專案的報支或資產
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {linkedExpenses.map(e => (
                    <div key={e.id} className="flex justify-between items-center gap-2 p-3 bg-amber-50/70 hover:bg-amber-100/70 transition-colors rounded-2xl border border-amber-200/80 text-xs font-bold">
                      <div className="col-span-5 sm:col-span-4 flex items-center space-x-1.5 min-w-0">
                        <span className="font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg shrink-0">{e.expenseNumber || '報支'}</span>
                        <span className="text-slate-800 truncate">{e.summary}</span>
                        <span className="text-slate-400 hidden sm:inline shrink-0">({e.payer} • {e.category})</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-black text-rose-600">-{formatMoney(e.total)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.status === '已核銷' ? 'bg-black text-white' : 'bg-rose-500 text-white'}`}>
                          {e.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {linkedAssets.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-purple-50/70 hover:bg-purple-100/70 transition-colors rounded-2xl border border-purple-200/80 text-xs font-bold">
                      <div className="col-span-5 sm:col-span-4 flex items-center space-x-1.5 min-w-0">
                        <span className="font-black bg-purple-200 text-purple-900 px-2 py-0.5 rounded-lg">{a.assetNumber || '資產'}</span>
                        <span className="text-slate-800">{a.name}</span>
                        <span className="text-slate-400">({a.category})</span>
                      </div>
                      <span className="font-black text-purple-700">{formatMoney(a.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
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
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:bg-slate-800 transition-colors shadow-lg order-1 sm:order-3">
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

    // 自動編號: S-XX(年)-XXX(流水號)
    const defaultExpenseNumber = useMemo(() => {
      if (editingExpense?.expenseNumber) return editingExpense.expenseNumber;
      const yearExpenses = expenses.filter(e => e.year === year);
      if (yearExpenses.length === 0) return `S-${String(year).slice(-2)}-001`;
      const lastNum = yearExpenses.reduce((max, e) => {
        const match = (e.expenseNumber || '').match(/\d+$/);
        const num = match ? parseInt(match[0], 10) : 0;
        return num > max ? num : max;
      }, 0);
      return `S-${String(year).slice(-2)}-${String(lastNum + 1).padStart(3, '0')}`;
    }, [expenses, editingExpense, year]);

    const [expenseNumber, setExpenseNumber] = useState(editingExpense?.expenseNumber || defaultExpenseNumber);
    const [linkedProjectNumber, setLinkedProjectNumber] = useState(editingExpense?.linkedProjectNumber || '');

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
        expenseNumber,
        linkedProjectNumber,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-lg rounded-3xl p-4 sm:p-6 md:p-8 my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black">{editingExpense ? '更新報支' : '新增報支與進項'}</h2>
            <button onClick={() => { setExpenseModalOpen(false); setEditingExpense(null); }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">報支單號</label>
                <input required type="text" value={expenseNumber} onChange={e => setExpenseNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">歸屬年度</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">類別</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {catOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                <label className="block text-sm font-bold text-slate-700 mb-1">連結案件 (可選)</label>
                <select value={linkedProjectNumber} onChange={e => setLinkedProjectNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                  <option value="">無連結案件</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.projectNumber}>
                      {p.projectNumber} - {p.client} ({p.service})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">金額</label>
                <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-black text-lg" placeholder="NT$" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">備註 (摘要)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="輸入報支說明" />
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
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:bg-slate-800 transition-colors shadow-lg order-1 sm:order-3">
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


  // --- 畫面元件區 ---
  const DashboardView = () => (
    <div className="space-y-6 md:space-y-10">
      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { title: '總營業額', value: financials.revenue, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { title: '年度淨利', value: financials.netProfit, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { title: '預估應納稅額', value: financials.taxPayable, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { title: '可分配紅利', value: financials.distributableDividend, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }
        ].map((kpi, idx) => (
          <div key={idx} className={`glass-panel rounded-[2rem] p-6 border ${kpi.border} relative overflow-hidden shadow-sm`}>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${kpi.bg} opacity-40`}></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-4`}>
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
              <div key={idx} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl hover:bg-white/80 transition-colors border border-black/5">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 mr-2">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-black flex items-center justify-center text-white font-black text-[10px] shadow-md">
                    {proj.date}
                  </div>
                  <div>
                    <p className="text-sm font-black text-black truncate">{proj.client}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{proj.service} • {proj.salesRep}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 shrink-0">
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
              <div key={idx} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl hover:bg-white/80 transition-colors border border-black/5">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 mr-2">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-black font-black text-[10px] shadow-sm">
                    {exp.date}
                  </div>
                  <div>
                    <p className="text-sm font-black text-black truncate">{exp.summary}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{exp.payer} • {exp.category}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 shrink-0">
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
      renderMobileCard={(proj: any) => {
        const netRealizedProfit = getProjectNetProfit(proj);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400">{proj.projectNumber}</span>
                {proj.salesRep && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{proj.salesRep}</span>}
              </div>
              <StatusBadge status={proj.status} />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-base text-black truncate">{proj.client}</h3>
              <span className="font-black text-sm text-black whitespace-nowrap">{formatMoney(proj.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-black/5">
              <span className="text-slate-500 font-medium">實收淨利: <strong className="text-emerald-600 font-black">{formatMoney(netRealizedProfit)}</strong></span>
              <span className="text-slate-400 font-medium">{proj.date}</span>
            </div>
          </div>
        );
      }}
      headers={[
        { label: '編號' },
        { label: '客戶名稱' },
        { label: '含稅總額', align: 'text-right' },
        { label: '實收淨利', align: 'text-right' },
        { label: '狀態', align: 'text-center' },
        { label: '日期', className: 'hidden sm:table-cell' },
        { label: '服務項目', className: 'hidden md:table-cell' },
        { label: '業務', className: 'hidden lg:table-cell' },
        { label: '外包廠商', className: 'hidden xl:table-cell' },
        { label: '連結銷項/費用', className: 'hidden xl:table-cell' }
      ]}
      renderRow={(proj: any) => {
        const netRealizedProfit = getProjectNetProfit(proj);
        
        const linkedExps = expenses.filter(e => e.linkedProjectNumber === proj.projectNumber);
        const linkedAsts = assets.filter(a => a.linkedProjectNumber === proj.projectNumber);
        const linkedExpsSum = getProjectLinkedExpensesTotal(proj.projectNumber);
        
        const outsourcedSummary = proj.outsourcedStaff || 
          (Array.isArray(proj.outsourcedItems) ? proj.outsourcedItems.map((i: any) => i.vendor).filter(Boolean).join(', ') : '') || '-';

        return (
          <>
            {/* 1. 編號 */}
            <td className="px-3 py-4 rounded-l-2xl font-black text-black/40 group-hover:text-black transition-colors text-xs md:text-sm">{proj.projectNumber}</td>
            
            {/* 2. 客戶名稱 (專案名稱) */}
            <td className="px-3 py-4 font-bold text-slate-900 text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{proj.client}</td>
            
            {/* 3. 含稅總額 (金額) */}
            <td className="px-3 py-4 font-black text-right text-xs md:text-sm">{formatMoney(proj.totalAmount)}</td>
            
            {/* 4. 實收淨利 */}
            <td className="px-3 py-4 font-black text-right text-emerald-600 text-xs md:text-sm">{formatMoney(netRealizedProfit)}</td>
            
            {/* 5. 狀態 */}
            <td className="px-3 py-4 text-center rounded-r-2xl sm:rounded-r-none"><StatusBadge status={proj.status} /></td>
            
            {/* 6. 日期 */}
            <td className="px-3 py-4 font-bold text-xs text-slate-500 hidden sm:table-cell">{proj.date}</td>
            
            {/* 7. 服務項目 */}
            <td className="px-3 py-4 text-slate-600 font-medium text-xs hidden md:table-cell">{proj.service}</td>
            
            {/* 8. 業務 */}
            <td className="px-3 py-4 text-slate-800 font-bold text-xs hidden lg:table-cell">{proj.salesRep}</td>
            
            {/* 9. 外包廠商 (移至最後) */}
            <td className="px-3 py-4 text-slate-600 font-medium text-xs hidden xl:table-cell">{outsourcedSummary}</td>
            
            {/* 10. 連結銷項/費用 (移至最後) */}
            <td className="px-3 py-4 text-xs font-bold rounded-r-2xl hidden xl:table-cell">
              {linkedExps.length === 0 && linkedAsts.length === 0 ? (
                <span className="text-slate-300">-</span>
              ) : (
                <div className="flex flex-col gap-1 max-w-[220px]">
                  {linkedExps.length > 0 && (
                    <div className="flex items-center justify-between text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200">
                      <span>{linkedExps.length} 筆報支</span>
                      <span className="font-black">-{formatMoney(linkedExpsSum)}</span>
                    </div>
                  )}
                  {linkedExps.slice(0, 2).map(e => (
                    <span key={e.id} className="text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded-lg border border-blue-100 truncate text-[10px]" title={`${e.expenseNumber || 'S'}-${e.summary}-${e.total}`}>
                      {e.expenseNumber || 'S'}-{e.summary}-{e.total}
                    </span>
                  ))}
                  {linkedExps.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-bold pl-1">+ 還有 {linkedExps.length - 2} 筆...</span>
                  )}
                </div>
              )}
            </td>
          </>
        );
      }}
    />
  );

  const ExpensesView = () => (
    <TableView 
      title="費用報支" 
      buttonText="新增報支"
      topContent={(() => {
        const totalExp = yearFilteredExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
        const pendingList = yearFilteredExpenses.filter(e => e.status === '待核銷');
        const pendingExp = pendingList.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
        const approvedExp = totalExp - pendingExp;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/70 border border-black/5 rounded-2xl p-4 shadow-sm flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{selectedYear} 年度報支總和</p>
                <p className="text-[11px] font-bold text-slate-400">共 {yearFilteredExpenses.length} 筆報支</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-black tracking-tight">{formatMoney(totalExp)}</p>
            </div>
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
              <div>
                <p className="text-xs font-black text-rose-600 uppercase tracking-wider">未核銷報支總和</p>
                <p className="text-[11px] font-bold text-rose-400">待核銷 {pendingList.length} 筆</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">{formatMoney(pendingExp)}</p>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-1">
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">已核銷報支總和</p>
                <p className="text-[11px] font-bold text-emerald-500">已核銷 {yearFilteredExpenses.length - pendingList.length} 筆</p>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">{formatMoney(approvedExp)}</p>
            </div>
          </div>
        );
      })()}
      onAdd={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
      onRowClick={(exp: any) => { setEditingExpense(exp); setExpenseModalOpen(true); }}
      data={filterData(yearFilteredExpenses)}
      renderMobileCard={(exp: any) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">{exp.expenseNumber || '-'}</span>
              {exp.linkedProjectNumber && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">{exp.linkedProjectNumber}</span>}
            </div>
            <StatusBadge status={exp.status} />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base text-black truncate">{exp.summary}</h3>
            <span className="font-black text-sm text-black whitespace-nowrap">{formatMoney(exp.total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-black/5">
            <span className="text-slate-500 font-medium">付款人: <strong className="text-blue-600">{exp.payer}</strong> ({exp.category})</span>
            <span className="text-slate-400 font-medium">{exp.date}</span>
          </div>
        </div>
      )}
      headers={[
        { label: '日期' }, { label: '單號' }, { label: '連結案件' }, { label: '類別' }, { label: '摘要(備註)' }, { label: '付款人' }, { label: '發票' }, { label: '已開立' },
        { label: '總額', align: 'text-right' }, { label: '狀態', align: 'text-center' }, { label: '操作', align: 'text-center' }
      ]}
      renderRow={(exp: any) => (
        <>
          <td className="px-4 py-4 rounded-l-2xl font-bold">{exp.date}</td>
          <td className="px-4 py-4 font-black text-slate-700">{exp.expenseNumber || '-'}</td>
          <td className="px-4 py-4 font-bold text-blue-600">{exp.linkedProjectNumber || '-'}</td>
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
                className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
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
      renderMobileCard={(asset: any) => {
        const monthlyAmort = Math.round((asset.cost - asset.residualValue) / (asset.usefulLife * 12));
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700">{asset.assetNumber || '-'}</span>
                {asset.linkedProjectNumber && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">{asset.linkedProjectNumber}</span>}
              </div>
              <span className="text-xs font-bold text-slate-400">{asset.category}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-base text-black truncate">{asset.name}</h3>
              <span className="font-black text-sm text-black whitespace-nowrap">{formatMoney(asset.cost)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-black/5">
              <span className="text-slate-500 font-medium">月攤提: <strong className="text-rose-600 font-black">{formatMoney(monthlyAmort)}</strong></span>
              <span className="text-slate-400 font-medium">耐用 {asset.usefulLife} 年</span>
            </div>
          </div>
        );
      }}
      headers={[
        { label: '單號' }, { label: '名稱' }, { label: '連結案件' }, { label: '購入日' }, { label: '金額', align: 'text-right' }, 
        { label: '年限' }, { label: '月攤提', align: 'text-right' }, { label: '帳面殘值', align: 'text-right' }
      ]}
      renderRow={(asset: any) => {
        const monthlyAmort = Math.round((asset.cost - asset.residualValue) / (asset.usefulLife * 12));
        // 簡易殘值計算 (假設已過 1 年)
        const residual = Math.max(asset.residualValue, asset.cost - monthlyAmort * 12);
        return (
          <>
            <td className="px-4 py-4 rounded-l-2xl font-black text-slate-700">{asset.assetNumber || '-'}</td>
            <td className="px-4 py-4 font-bold text-black">{asset.name}</td>
            <td className="px-4 py-4 font-bold text-purple-600">{asset.linkedProjectNumber || '-'}</td>
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

    // 自動編號: T-XX(年)-XXX(流水號)
    const defaultAssetNumber = useMemo(() => {
      if (editingAsset?.assetNumber) return editingAsset.assetNumber;
      const yearAssets = assets.filter(a => a.year === year);
      if (yearAssets.length === 0) return `T-${String(year).slice(-2)}-001`;
      const lastNum = yearAssets.reduce((max, a) => {
        const match = (a.assetNumber || '').match(/\d+$/);
        const num = match ? parseInt(match[0], 10) : 0;
        return num > max ? num : max;
      }, 0);
      return `T-${String(year).slice(-2)}-${String(lastNum + 1).padStart(3, '0')}`;
    }, [assets, editingAsset, year]);

    const [assetNumber, setAssetNumber] = useState(editingAsset?.assetNumber || defaultAssetNumber);
    const [linkedProjectNumber, setLinkedProjectNumber] = useState(editingAsset?.linkedProjectNumber || '');

    const catOptions = ['辦公設備', '運輸設備', '生產設備', '無形資產', '其他'];

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const assetData = {
        name,
        assetNumber,
        linkedProjectNumber,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 overflow-y-auto">
        <div className="glass-modal w-full max-w-lg rounded-3xl p-4 sm:p-6 md:p-8 my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black">{editingAsset ? '更新資產' : '登記新資產'}</h2>
            <button onClick={() => { setAssetModalOpen(false); setEditingAsset(null); }} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">資產單號</label>
                <input required type="text" value={assetNumber} onChange={e => setAssetNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">歸屬年度</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">資產名稱</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold" placeholder="例如：MacBook Pro" />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">連結案件 (可選)</label>
                <select value={linkedProjectNumber} onChange={e => setLinkedProjectNumber(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold text-slate-800">
                  <option value="">無連結案件</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.projectNumber}>
                      {p.projectNumber} - {p.client} ({p.service})
                    </option>
                  ))}
                </select>
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
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">資產類別</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/50 font-bold">
                  {catOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
              <button type="submit" className="flex-[2] bg-black text-white rounded-xl py-3.5 font-black text-lg hover:bg-slate-800 transition-colors shadow-lg order-1 sm:order-3">
                {editingAsset ? '更新資產' : '登記資產'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const FinancialsView = () => {
    const currentYearTax = taxDeductions.find(t => t.year === selectedYear && !t.values?.isGovernanceDoc);
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
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-black/5">
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
      <div className="space-y-6 lg:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* 財務匯總卡片 */}
          <div className="glass-panel rounded-3xl flex flex-col">
            <div className="p-5 sm:p-8 border-b border-black/5 bg-white/20">
              <h2 className="text-2xl font-black text-black tracking-tight">財務匯總與 401</h2>
            </div>
            <div className="p-5 sm:p-8">
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
                <div className="flex justify-between items-center py-5 bg-black text-white px-6 rounded-2xl mt-6 shadow-xl">
                  <span className="font-bold tracking-widest uppercase text-sm">(H) 可分配紅利</span>
                  <span className="font-black text-2xl tracking-tight">{formatMoney(financials.distributableDividend)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 股東紅利分配 */}
          <div className="glass-panel rounded-3xl flex flex-col">
            <div className="p-5 sm:p-8 border-b border-black/5 bg-white/20 flex justify-between items-center">
              <h2 className="text-2xl font-black text-black tracking-tight">股東分配</h2>
              <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-slate-100 transition-colors">
                <ArrowDown size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="p-5 sm:p-8 flex flex-col items-center">
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
          <div className="glass-panel rounded-3xl p-5 sm:p-8 lg:col-span-1">
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
              className="w-full mt-4 bg-black text-white rounded-xl py-2.5 font-bold text-sm hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : '確認更新稅金'}
            </button>
            <div className="mt-6 p-4 bg-black text-white rounded-2xl flex justify-between items-center">
              <span className="font-bold text-sm">年度抵扣總額</span>
              <span className="font-black text-lg">{formatMoney(totalTaxDeduction as number)}</span>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 sm:p-8 lg:col-span-2">
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

  const GovernanceView = () => {
    const govDoc = taxDeductions.find(t => t.values?.isGovernanceDoc === true);
    const defaultGovernance = {
      updatedAt: new Date().toISOString().slice(0, 10),
      basisMeeting: '公司初始章程設定',
      roles: {
        execution: {
          title: '執行 (Execution)',
          owner: 'Tim',
          duties: '專案技術可行性評估與排程控管\n3D 掃描、逆向工程與模型品質把關\n外包製程對接、驗收與交付管理'
        },
        operations: {
          title: '營運 (Operations)',
          owner: 'Chris',
          duties: '客戶開發、需求洽談與報價合約管理\n專案進度追蹤與跨部門資源協調\n公司營運制度維護與品牌對外窗口'
        },
        finance: {
          title: '財務 (Finance)',
          owner: 'Sam',
          duties: '專案收款、費用報支核銷與發票管理\n每期 401 營業稅申報與進銷項抵扣控管\n年度固定支出、資產攤提與股東分潤結算'
        }
      },
      profitRules: {
        shareholderRatioNote: 'T 股東 (Tim) 50% • C 股東 (Chris) 30% • S 股東 (Sam) 20%',
        poolRuleNote: '依案件「未稅金額」選擇提撥 0% / 30% / 50% 作為實作人員獎金池；對應未稅扣除額為 100% / 70% / 50%，再扣除業務獎金、外包與連結報支後為案件實收淨利。',
        oldClientBonusRate: 5,
        newClientBonusRate: 15,
        salesBonusNote: '舊客成交抽成未稅金額 5%；新客成交加碼 10%（合計抽成未稅金額 15%），由該案業務獲得並自專案實收淨利中扣除。'
      },
      implementationItems: defaultImplementationItems,
      fixedAndAssetRules: {
        annualRent: 0,
        annualRentNote: '依實際租約按月/按年提列',
        annualMisc: 0,
        annualMiscNote: '含水電、網路、軟體訂閱與辦公耗材預估',
        legalReserveRate: 10,
        legalReserveNote: '年度淨利為正時，優先提列 10% 為公司法定盈餘公積，剩餘 90% 為股東可分配紅利。',
        assetAllocationNote: '公司設備資產依購入成本減除殘值後，按耐用年限逐月計算攤提\n連結至特定專案之耗材/代購報支，直接自該專案實收淨利扣除\n未連結特定專案之一般辦公/雜支報支（已核銷），自公司年度總淨利扣除'
      }
    };

    const savedGovernance = govDoc?.values?.governance || defaultGovernance;
    const savedMeetings: any[] = Array.isArray(govDoc?.values?.meetings) ? govDoc.values.meetings : [];

    const [subTab, setSubTab] = useState<'all' | 'operations' | 'meetings'>('all');
    const [isEditingGov, setIsEditingGov] = useState(false);
    const [govDraft, setGovDraft] = useState<any>(savedGovernance);
    const [isSavingGov, setIsSavingGov] = useState(false);

    // 會議紀錄狀態
    const [expandedMeetingIds, setExpandedMeetingIds] = useState<Record<string, boolean>>({});
    const [isMeetingFormOpen, setIsMeetingFormOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<any>(null);
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
    const [meetingSubject, setMeetingSubject] = useState('');
    const [meetingContent, setMeetingContent] = useState('');
    const [confirmDeleteMeetingId, setConfirmDeleteMeetingId] = useState<string | null>(null);

    useEffect(() => {
      if (!isEditingGov) {
        setGovDraft(govDoc?.values?.governance || defaultGovernance);
      }
    }, [govDoc, isEditingGov]);

    const saveGovernanceAndMeetings = async (newGovernance: any, newMeetings: any[]) => {
      if (!user) return;
      setIsSavingGov(true);
      try {
        const payload = {
          year: 2060,
          uid: user.uid,
          values: {
            isGovernanceDoc: true,
            governance: newGovernance,
            meetings: newMeetings
          }
        };
        if (govDoc) {
          await updateDoc(doc(db, 'taxDeductions', govDoc.id), payload);
        } else {
          await setDoc(doc(collection(db, 'taxDeductions')), payload);
        }
      } catch (err) {
        handleFirestoreError(err, govDoc ? 'update' : 'create', 'taxDeductions');
      } finally {
        setIsSavingGov(false);
      }
    };

    const handleSaveGovDraft = async () => {
      const updated = {
        ...govDraft,
        updatedAt: new Date().toISOString().slice(0, 10)
      };
      await saveGovernanceAndMeetings(updated, savedMeetings);
      setIsEditingGov(false);
    };

    const handleAddImpItem = () => {
      const list = Array.isArray(govDraft.implementationItems) ? govDraft.implementationItems : [];
      setGovDraft({
        ...govDraft,
        implementationItems: [
          ...list,
          { id: Date.now().toString(), name: '新實作項目', ratio: 0, note: '請輸入作業說明' }
        ]
      });
    };

    const handleUpdateImpItem = (id: string, field: string, value: any) => {
      const list = (govDraft.implementationItems || []).map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      setGovDraft({ ...govDraft, implementationItems: list });
    };

    const handleRemoveImpItem = (id: string) => {
      const list = (govDraft.implementationItems || []).filter((item: any) => item.id !== id);
      setGovDraft({ ...govDraft, implementationItems: list });
    };

    const handleOpenNewMeeting = () => {
      setEditingMeeting(null);
      setMeetingDate(new Date().toISOString().slice(0, 10));
      setMeetingSubject('');
      setMeetingContent('');
      setIsMeetingFormOpen(true);
    };

    const handleOpenEditMeeting = (m: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingMeeting(m);
      setMeetingDate(m.date || new Date().toISOString().slice(0, 10));
      setMeetingSubject(m.subject || '');
      setMeetingContent(m.content || '');
      setIsMeetingFormOpen(true);
    };

    const handleSaveMeeting = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!meetingSubject.trim()) return;
      let nextMeetings: any[];
      let newId = editingMeeting?.id || Date.now().toString();
      if (editingMeeting) {
        nextMeetings = savedMeetings.map(m =>
          m.id === editingMeeting.id
            ? { ...m, date: meetingDate, subject: meetingSubject.trim(), content: meetingContent, updatedAt: new Date().toISOString() }
            : m
        );
      } else {
        const created = {
          id: newId,
          date: meetingDate,
          subject: meetingSubject.trim(),
          content: meetingContent,
          createdAt: new Date().toISOString()
        };
        nextMeetings = [created, ...savedMeetings];
      }
      nextMeetings.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      await saveGovernanceAndMeetings(savedGovernance, nextMeetings);
      setExpandedMeetingIds(prev => ({ ...prev, [newId]: true }));
      setIsMeetingFormOpen(false);
      setEditingMeeting(null);
    };

    const handleDeleteMeeting = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const nextMeetings = savedMeetings.filter(m => m.id !== id);
      await saveGovernanceAndMeetings(savedGovernance, nextMeetings);
      setConfirmDeleteMeetingId(null);
    };

    const toggleMeetingExpand = (id: string) => {
      setExpandedMeetingIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderBulletLines = (text: string) => {
      const lines = (text || '')
        .split('\n')
        .map(l => l.trim().replace(/^[-•*]\s*/, ''))
        .filter(Boolean);
      if (lines.length === 0) return <p className="text-xs font-bold text-slate-400">尚無內容</p>;
      return (
        <ul className="space-y-1.5 text-xs sm:text-sm font-bold text-slate-700 list-disc pl-4">
          {lines.map((line, i) => (
            <li key={i} className="leading-relaxed break-words">{line}</li>
          ))}
        </ul>
      );
    };

    const activeGov = isEditingGov ? govDraft : savedGovernance;
    const totalImpRatio = (activeGov.implementationItems || []).reduce((s: number, i: any) => s + (Number(i.ratio) || 0), 0);
    const filteredMeetings = savedMeetings.filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (m.subject || '').toLowerCase().includes(q) || (m.content || '').toLowerCase().includes(q) || (m.date || '').includes(q);
    });

    return (
      <div className="space-y-6 lg:space-y-8">
        {/* 頂部子分頁切換列 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 p-3 sm:p-4 rounded-3xl border border-white/60 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">公司會議紀錄與運作分配制度</h2>
            <p className="text-xs font-bold text-slate-500">管理歷次會議決議、執掌分工、分潤抽成與八大實作占比基準</p>
          </div>
          <div className="grid grid-cols-3 sm:flex bg-slate-200/70 p-1 rounded-2xl text-xs font-black shrink-0">
            {[
              { id: 'all', label: '全部檢視' },
              { id: 'meetings', label: `會議紀錄 (${savedMeetings.length})` },
              { id: 'operations', label: '運作分配制度' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-3 py-2 rounded-xl transition-colors ${subTab === t.id ? 'bg-black text-white shadow-sm' : 'text-slate-600 hover:text-black'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. 公司會議紀錄區塊 */}
        {(subTab === 'all' || subTab === 'meetings') && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/60 shadow-sm">
            <div className="p-4 sm:p-6 lg:p-8 border-b border-black/5 bg-white/30 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-black tracking-tight">1. 公司會議紀錄</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">點擊會議主旨即可展開檢視條列式決議內容</p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewMeeting}
                className="bg-black text-white px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-md shrink-0"
              >
                <Plus size={16} strokeWidth={3} /> <span>新增會議紀錄</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* 新增/編輯會議紀錄表單 */}
              {isMeetingFormOpen && (
                <form onSubmit={handleSaveMeeting} className="bg-white/90 border border-black/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md">
                  <div className="flex justify-between items-center border-b border-black/5 pb-3">
                    <h4 className="font-black text-base text-black">{editingMeeting ? '編輯會議紀錄' : '新增會議紀錄'}</h4>
                    <button type="button" onClick={() => { setIsMeetingFormOpen(false); setEditingMeeting(null); }} className="p-1.5 hover:bg-black/5 rounded-full">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">會議日期</label>
                      <input
                        required
                        type="date"
                        value={meetingDate}
                        onChange={e => setMeetingDate(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/50"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">會議主旨</label>
                      <input
                        required
                        type="text"
                        value={meetingSubject}
                        onChange={e => setMeetingSubject(e.target.value)}
                        placeholder="例如：2026 年度分潤與八大實作占比調整決議"
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">會議內容 (條列式：每行輸入一項決議，展開時自動條列呈現)</label>
                    <textarea
                      required
                      value={meetingContent}
                      onChange={e => setMeetingContent(e.target.value)}
                      placeholder={'1. 業務洽談舊客維持 5%，新客加碼 10% 共 15%\n2. 實作獎金池以未稅金額 0%、30%、50% 計算\n3. 調整八大實作項目占比...'}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-bold text-sm h-32 focus:outline-none focus:ring-2 focus:ring-black/50"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsMeetingFormOpen(false); setEditingMeeting(null); }}
                      className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-300 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingGov}
                      className="px-5 py-2 rounded-xl bg-black text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSavingGov ? '儲存中...' : (editingMeeting ? '更新紀錄' : '儲存會議紀錄')}
                    </button>
                  </div>
                </form>
              )}

              {/* 會議紀錄手風琴列表 */}
              {filteredMeetings.length === 0 ? (
                <div className="p-8 text-center bg-white/40 rounded-2xl border border-dashed border-black/10 text-slate-400 font-bold text-sm">
                  目前尚無會議紀錄，請點擊右上角「新增會議紀錄」建立第一筆資料
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMeetings.map(m => {
                    const isExpanded = !!expandedMeetingIds[m.id];
                    return (
                      <div key={m.id} className="bg-white/70 hover:bg-white/95 rounded-2xl border border-black/5 shadow-sm overflow-hidden transition-colors">
                        <div
                          onClick={() => toggleMeetingExpand(m.id)}
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className="px-2.5 py-1 rounded-lg bg-black text-white font-black text-xs shrink-0">
                              {m.date}
                            </span>
                            <h4 className="font-black text-sm sm:text-base text-black truncate">
                              {m.subject}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditMeeting(m, e)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                            >
                              編輯
                            </button>
                            {confirmDeleteMeetingId === m.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteMeeting(m.id, e)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
                                >
                                  確認刪除
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMeetingId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteMeetingId(m.id); }}
                                className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 font-bold text-xs transition-colors"
                              >
                                刪除
                              </button>
                            )}
                            <div className={`w-7 h-7 rounded-full bg-black/5 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-black text-white' : 'text-slate-600'}`}>
                              <ArrowDown size={14} strokeWidth={3} />
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-3 border-t border-black/5 bg-slate-50/70">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">會議決議與內容明細：</p>
                            {renderBulletLines(m.content)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. 目前公司運作分配區塊 */}
        {(subTab === 'all' || subTab === 'operations') && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/60 shadow-sm">
            <div className="p-4 sm:p-6 lg:p-8 border-b border-black/5 bg-white/30 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-black tracking-tight">2. 目前公司運作分配</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  最後更新：{activeGov.updatedAt || '-'} • 依據會議：{activeGov.basisMeeting || '公司章程'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditingGov ? (
                  <button
                    type="button"
                    onClick={() => { setGovDraft(JSON.parse(JSON.stringify(savedGovernance))); setIsEditingGov(true); }}
                    className="bg-black text-white px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
                  >
                    手動編輯更新
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingGov(false)}
                      className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-300 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGovDraft}
                      disabled={isSavingGov}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-black hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      {isSavingGov ? '儲存中...' : '儲存運作分配更新'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              {isEditingGov && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
                  <label className="block text-xs font-black text-amber-900 mb-1">本次更新依據之會議紀錄主旨 / 備註</label>
                  <input
                    type="text"
                    value={govDraft.basisMeeting || ''}
                    onChange={e => setGovDraft({ ...govDraft, basisMeeting: e.target.value })}
                    placeholder="例如：依 2026-10-27 股東會議決議更新"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold"
                  />
                </div>
              )}

              {/* (A) 執行、營運、財務三者工作內容職掌 */}
              <div className="space-y-3">
                <h4 className="text-base font-black text-black flex items-center gap-2">
                  <Users size={18} /> 三大部門工作內容職掌（執行、營運、財務）
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['execution', 'operations', 'finance'] as const).map((roleKey, idx) => {
                    const role = activeGov.roles?.[roleKey] || {};
                    const badgeColors = [
                      'bg-black text-white',
                      'bg-[#005bbb] text-white',
                      'bg-emerald-700 text-white'
                    ];
                    return (
                      <div key={roleKey} className="bg-white/70 rounded-2xl p-4 sm:p-5 border border-black/5 shadow-sm flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2.5">
                            <span className={`px-3 py-1 rounded-xl text-xs font-black ${badgeColors[idx]}`}>
                              {role.title}
                            </span>
                            {isEditingGov ? (
                              <input
                                type="text"
                                value={role.owner || ''}
                                onChange={e => setGovDraft({
                                  ...govDraft,
                                  roles: {
                                    ...govDraft.roles,
                                    [roleKey]: { ...role, owner: e.target.value }
                                  }
                                })}
                                placeholder="負責人"
                                className="w-28 rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-black text-right"
                              />
                            ) : (
                              <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                負責：{role.owner || '-'}
                              </span>
                            )}
                          </div>
                          {isEditingGov ? (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">職掌內容（每行一項）</label>
                              <textarea
                                value={role.duties || ''}
                                onChange={e => setGovDraft({
                                  ...govDraft,
                                  roles: {
                                    ...govDraft.roles,
                                    [roleKey]: { ...role, duties: e.target.value }
                                  }
                                })}
                                className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold h-28"
                              />
                            </div>
                          ) : (
                            renderBulletLines(role.duties)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* (B) 公司當前分潤比例與業務洽談抽成說明 */}
              <div className="space-y-3 border-t border-black/5 pt-6">
                <h4 className="text-base font-black text-black flex items-center gap-2">
                  <PieChart size={18} /> 公司當前分潤比例與業務洽談抽成說明
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 股東分潤與獎金池 */}
                  <div className="bg-white/70 rounded-2xl p-4 sm:p-5 border border-black/5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">股東分潤與未稅獎金池規則</span>
                    </div>
                    {isEditingGov ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">股東分紅比例說明</label>
                          <input
                            type="text"
                            value={activeGov.profitRules?.shareholderRatioNote || ''}
                            onChange={e => setGovDraft({
                              ...govDraft,
                              profitRules: { ...govDraft.profitRules, shareholderRatioNote: e.target.value }
                            })}
                            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">獎金池與實收淨利計算說明</label>
                          <textarea
                            value={activeGov.profitRules?.poolRuleNote || ''}
                            onChange={e => setGovDraft({
                              ...govDraft,
                              profitRules: { ...govDraft.profitRules, poolRuleNote: e.target.value }
                            })}
                            className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold h-20"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 rounded-xl bg-black text-white font-black text-xs sm:text-sm">
                          {activeGov.profitRules?.shareholderRatioNote}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                          {activeGov.profitRules?.poolRuleNote}
                        </p>
                      </>
                    )}
                  </div>

                  {/* 業務新舊客抽成 */}
                  <div className="bg-white/70 rounded-2xl p-4 sm:p-5 border border-black/5 shadow-sm space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">業務洽談新 / 舊客抽成基準（依未稅金額計算）</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/80">
                        <span className="text-[11px] font-bold text-sky-700 block">舊客洽談抽成</span>
                        {isEditingGov ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              value={activeGov.profitRules?.oldClientBonusRate ?? 5}
                              onChange={e => setGovDraft({
                                ...govDraft,
                                profitRules: { ...govDraft.profitRules, oldClientBonusRate: Number(e.target.value) || 0 }
                              })}
                              className="w-full rounded-lg border border-sky-300 bg-white px-2 py-1 text-sm font-black"
                            />
                            <span className="font-black text-sky-700">%</span>
                          </div>
                        ) : (
                          <span className="text-xl font-black text-sky-700">{activeGov.profitRules?.oldClientBonusRate ?? 5}%</span>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80">
                        <span className="text-[11px] font-bold text-indigo-700 block">新客洽談抽成 (含加碼)</span>
                        {isEditingGov ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              value={activeGov.profitRules?.newClientBonusRate ?? 15}
                              onChange={e => setGovDraft({
                                ...govDraft,
                                profitRules: { ...govDraft.profitRules, newClientBonusRate: Number(e.target.value) || 0 }
                              })}
                              className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm font-black"
                            />
                            <span className="font-black text-indigo-700">%</span>
                          </div>
                        ) : (
                          <span className="text-xl font-black text-indigo-700">{activeGov.profitRules?.newClientBonusRate ?? 15}%</span>
                        )}
                      </div>
                    </div>
                    {isEditingGov ? (
                      <textarea
                        value={activeGov.profitRules?.salesBonusNote || ''}
                        onChange={e => setGovDraft({
                          ...govDraft,
                          profitRules: { ...govDraft.profitRules, salesBonusNote: e.target.value }
                        })}
                        className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold h-16"
                      />
                    ) : (
                      <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                        {activeGov.profitRules?.salesBonusNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* (C) 實作各項占比（八大基本項目，可動態新增） */}
              <div className="space-y-3 border-t border-black/5 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-black text-black flex items-center gap-2">
                      <Briefcase size={18} /> 實作各項配分基準（八大基本項目，可調整與擴充）
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200 text-slate-800">
                      各項基準總分：{totalImpRatio} 分
                    </span>
                  </div>
                  {isEditingGov && (
                    <button
                      type="button"
                      onClick={handleAddImpItem}
                      className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-black transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14} /> <span>新增實作項目</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(activeGov.implementationItems || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="bg-white/70 rounded-2xl p-4 border border-black/5 shadow-sm flex flex-col justify-between gap-2">
                      {isEditingGov ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-black text-white font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => handleUpdateImpItem(item.id, 'name', e.target.value)}
                              placeholder="項目名稱"
                              className="flex-1 min-w-0 rounded-lg border border-black/15 bg-white px-2 py-1 text-xs font-black"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImpItem(item.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">分數：</span>
                            <input
                              type="number"
                              value={item.ratio}
                              onChange={e => handleUpdateImpItem(item.id, 'ratio', Number(e.target.value) || 0)}
                              className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-xs font-black text-right"
                            />
                            <span className="text-xs font-black text-slate-500">分</span>
                          </div>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={e => handleUpdateImpItem(item.id, 'note', e.target.value)}
                            placeholder="作業內容說明"
                            className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-bold text-slate-600"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-black text-white font-black text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-black text-sm text-black truncate">{item.name}</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-black text-xs shrink-0">
                              {item.ratio} 分
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{item.note || '-'}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* (D) 公司資產分配與年度固定提撥說明 */}
              <div className="space-y-3 border-t border-black/5 pt-6">
                <h4 className="text-base font-black text-black flex items-center gap-2">
                  <Building2 size={18} /> 公司資產分配、年度房租、年度雜支與法定盈餘 10%
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 公司年度房租 */}
                  <div className="bg-white/70 rounded-2xl p-4 border border-black/5 shadow-sm space-y-1.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">公司年度房租</span>
                    {isEditingGov ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={activeGov.fixedAndAssetRules?.annualRent ?? 0}
                          onChange={e => setGovDraft({
                            ...govDraft,
                            fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, annualRent: Number(e.target.value) || 0 }
                          })}
                          placeholder="年度房租 NT$"
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-1.5 text-sm font-black"
                        />
                        <input
                          type="text"
                          value={activeGov.fixedAndAssetRules?.annualRentNote || ''}
                          onChange={e => setGovDraft({
                            ...govDraft,
                            fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, annualRentNote: e.target.value }
                          })}
                          placeholder="房租備註說明"
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-black text-black">{formatMoney(Number(activeGov.fixedAndAssetRules?.annualRent) || 0)}</p>
                        <p className="text-xs font-bold text-slate-500">{activeGov.fixedAndAssetRules?.annualRentNote}</p>
                      </>
                    )}
                  </div>

                  {/* 公司年度雜支 */}
                  <div className="bg-white/70 rounded-2xl p-4 border border-black/5 shadow-sm space-y-1.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">公司年度雜支</span>
                    {isEditingGov ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={activeGov.fixedAndAssetRules?.annualMisc ?? 0}
                          onChange={e => setGovDraft({
                            ...govDraft,
                            fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, annualMisc: Number(e.target.value) || 0 }
                          })}
                          placeholder="年度雜支 NT$"
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-1.5 text-sm font-black"
                        />
                        <input
                          type="text"
                          value={activeGov.fixedAndAssetRules?.annualMiscNote || ''}
                          onChange={e => setGovDraft({
                            ...govDraft,
                            fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, annualMiscNote: e.target.value }
                          })}
                          placeholder="雜支備註說明"
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-black text-black">{formatMoney(Number(activeGov.fixedAndAssetRules?.annualMisc) || 0)}</p>
                        <p className="text-xs font-bold text-slate-500">{activeGov.fixedAndAssetRules?.annualMiscNote}</p>
                      </>
                    )}
                  </div>

                  {/* 公司法定餘額 10% */}
                  <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 shadow-sm space-y-1.5">
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block">公司法定餘額 (盈餘公積)</span>
                    {isEditingGov ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={activeGov.fixedAndAssetRules?.legalReserveRate ?? 10}
                            onChange={e => setGovDraft({
                              ...govDraft,
                              fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, legalReserveRate: Number(e.target.value) || 0 }
                            })}
                            className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-black"
                          />
                          <span className="font-black text-emerald-700">%</span>
                        </div>
                        <input
                          type="text"
                          value={activeGov.fixedAndAssetRules?.legalReserveNote || ''}
                          onChange={e => setGovDraft({
                            ...govDraft,
                            fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, legalReserveNote: e.target.value }
                          })}
                          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-black text-emerald-700">{activeGov.fixedAndAssetRules?.legalReserveRate ?? 10}%</p>
                        <p className="text-xs font-bold text-emerald-800/80">{activeGov.fixedAndAssetRules?.legalReserveNote}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 公司資產分配說明 */}
                <div className="bg-white/70 rounded-2xl p-4 sm:p-5 border border-black/5 shadow-sm space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">公司資產分配與費用認列說明</span>
                  {isEditingGov ? (
                    <textarea
                      value={activeGov.fixedAndAssetRules?.assetAllocationNote || ''}
                      onChange={e => setGovDraft({
                        ...govDraft,
                        fixedAndAssetRules: { ...govDraft.fixedAndAssetRules, assetAllocationNote: e.target.value }
                      })}
                      placeholder="每行輸入一項資產分配或認列規則"
                      className="w-full rounded-xl border border-black/10 bg-white p-3 text-xs font-bold h-24"
                    />
                  ) : (
                    renderBulletLines(activeGov.fixedAndAssetRules?.assetAllocationNote)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const navigation = [
    { id: 'dashboard', name: '總覽', icon: LayoutDashboard },
    { id: 'projects', name: '案件', icon: Briefcase },
    { id: 'expenses', name: '報支', icon: Receipt },
    { id: 'assets', name: '資產', icon: Building2 },
    { id: 'financials', name: '財務', icon: PieChart },
    { id: 'governance', name: '會議與制度', icon: FileText },
  ];

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="animate-pulse text-2xl font-black text-black tracking-widest uppercase">系統載入中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex justify-center items-center bg-slate-50 relative overflow-hidden font-sans selection:bg-black selection:text-white">
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        
        <div className="glass-modal relative z-10 w-full max-w-md p-10 md:p-12 rounded-[2.5rem] flex flex-col items-center shadow-2xl m-4">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-black/20 rotate-3 mb-8 cursor-default">
            Y
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-black mb-2">源創系統</h1>
          <p className="text-sm font-bold text-slate-500 mb-10 text-center">登入以管理專案、報支及財務資料</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-black text-white p-4 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg group"
          >
            <LogIn size={20} />
            <span className="font-bold text-lg tracking-wide">Google 帳號登入</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col md:flex-row h-screen font-sans relative z-10 text-slate-800 selection:bg-black selection:text-white bg-slate-50 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

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
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-colors group ${
                  isActive 
                    ? 'bg-black text-white shadow-md' 
                    : 'hover:bg-white/80 text-slate-600 hover:text-black'
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

              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center space-x-3 bg-black text-white p-4 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg"
            >
              <LogIn size={20} />
              <span className="font-bold">登入系統</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 px-3 sm:px-6 py-2.5 flex justify-between items-center z-50 shadow-lg">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                isActive ? 'text-black font-black' : 'text-slate-400'
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
          <div className="glass-panel rounded-3xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm border border-white/60 gap-2">
            <div className="flex items-center flex-1 min-w-0 max-w-2xl">
              <div className="flex items-center space-x-2 sm:space-x-3 mr-2 sm:mr-6 shrink-0">
                <div className="md:hidden w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-sm">Y</div>
                <h2 className="hidden sm:block text-lg font-black tracking-tight whitespace-nowrap">
                  {selectedYear} <span className="text-slate-400 font-bold ml-1">年度</span>
                </h2>
              </div>
              
              <div className="flex-1 flex items-center space-x-2 sm:space-x-4 min-w-0">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/50 border border-white/60 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 font-black text-xs focus:outline-none focus:ring-2 focus:ring-black/20 transition-colors cursor-pointer shadow-sm shrink-0"
                >
                  {Array.from({ length: 38 }, (_, i) => 2023 + i).map(y => (
                    <option key={y} value={y}>{y} 年度</option>
                  ))}
                </select>

                <div className="flex-1 min-w-0 flex items-center bg-white/50 border border-white/60 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 focus-within:bg-white focus-within:shadow-md transition-colors">
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
                    onClick={() => auth.signOut()}
                    className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm"
                    title="登出系統"
                  >
                    <LogOut size={16} />
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
            {activeTab === 'governance' && <GovernanceView />}
          </div>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
