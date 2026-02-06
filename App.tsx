
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, ChefHat, Plus, Trash2, Save, Info, BarChart3, Calculator, 
  ArrowRight, ClipboardList, Utensils, TrendingUp, DollarSign, Clock, 
  Scaling, Layers, Flame, Edit2, ChevronDown, Calendar, ArrowUpRight, 
  ArrowDownRight, PieChart, Activity, X, Target, BarChart
} from 'lucide-react';
import { Ingredient, Product, Unit, RecipeItem } from './types';
import { geminiService } from './services/geminiService';

const CATEGORIES = ["Pizza", "Salgados", "Doces/Confeitaria", "Bolos", "Antepastos", "Tortas", "Molhos"];

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('chefpro_ingredients');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('chefpro_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'ingredients' | 'products' | 'dashboard'>('dashboard');
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'unit' | 'total'>('unit');
  const [dashboardMonth, setDashboardMonth] = useState(new Date().getMonth());
  const [dashboardYear, setDashboardYear] = useState(2026); // Iniciando em 2026 conforme solicitado
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  const inputClass = "w-full bg-white text-black px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-400 font-medium";
  const selectClass = "w-full bg-white text-black px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none cursor-pointer font-medium";

  // Form states
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({ unit: 'kg' });
  const [newProd, setNewProd] = useState<Partial<Product>>({
    items: [], fillingItems: [], sauceItems: [], markup: 2.5, laborTime: 0,
    laborHourlyRate: 30, otherExpenses: 0, yield: 0, quantity: 1, weightPerUnit: 0,
    category: CATEGORIES[0]
  });

  useEffect(() => {
    localStorage.setItem('chefpro_ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('chefpro_products', JSON.stringify(products));
  }, [products]);

  const currentRecipeTotalWeight = useMemo(() => {
    const base = (newProd.items || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const filling = (newProd.fillingItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const sauce = (newProd.sauceItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return base + filling + sauce;
  }, [newProd.items, newProd.fillingItems, newProd.sauceItems]);

  const handleSaveIngredient = () => {
    if (!newIng.name || !newIng.packagePrice || !newIng.packageSize) return;
    const pricePerUnit = newIng.packagePrice / (
      (newIng.unit === 'kg' || newIng.unit === 'L') ? (newIng.packageSize * 1000) : newIng.packageSize
    );
    
    if (editingIngredient) {
      setIngredients(ingredients.map(i => i.id === editingIngredient.id ? { ...i, ...newIng, pricePerUnit } as Ingredient : i));
    } else {
      const ingredient: Ingredient = {
        id: Math.random().toString(36).substr(2, 9),
        name: newIng.name,
        unit: newIng.unit as Unit,
        packageSize: newIng.packageSize,
        packagePrice: newIng.packagePrice,
        pricePerUnit,
        usageFrequency: 0
      };
      setIngredients([...ingredients, ingredient]);
    }
    setNewIng({ unit: 'kg' });
    setIsAddingIngredient(false);
    setEditingIngredient(null);
  };

  const startEditIngredient = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setNewIng(ing);
    setIsAddingIngredient(true);
  };

  const removeIngredient = (id: string) => {
    if (confirm('Deseja realmente excluir este ingrediente?')) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const updateRecipeItem = (index: number, field: keyof RecipeItem, value: number | string, type: 'base' | 'filling' | 'sauce') => {
    const key = type === 'base' ? 'items' : type === 'filling' ? 'fillingItems' : 'sauceItems';
    const items = [...(newProd[key] || [])];
    const val = Number(value) || 0;
    
    if (field === 'amount') {
      items[index].amount = val;
      const totalWeight = currentRecipeTotalWeight - (newProd[key]?.[index]?.amount || 0) + val;
      setNewProd(prev => {
        const next = { ...prev, [key]: items, yield: totalWeight };
        ['items', 'fillingItems', 'sauceItems'].forEach(k => {
          (next[k as keyof Product] as RecipeItem[] || []).forEach(item => {
            item.percentage = totalWeight > 0 ? (item.amount / totalWeight) * 100 : 0;
          });
        });
        next.weightPerUnit = totalWeight / (next.quantity || 1);
        return next;
      });
    } else if (field === 'percentage') {
      items[index].percentage = val;
      const total = Number(newProd.yield) || 0;
      if (total > 0) items[index].amount = (total * val) / 100;
      setNewProd({ ...newProd, [key]: items });
    } else {
      items[index] = { ...items[index], [field]: value };
      setNewProd({ ...newProd, [key]: items });
    }
  };

  const handleWeightPerUnitChange = (v: number) => {
    const qty = Number(newProd.quantity) || 1;
    handleTotalWeightChange(v * qty);
  };

  const handleQuantityChange = (v: number) => {
    const w = Number(newProd.weightPerUnit) || 0;
    handleTotalWeightChange(v * w, v);
  };

  const handleTotalWeightChange = (newTotal: number, newQty?: number) => {
    const oldTotal = currentRecipeTotalWeight;
    const scaleFactor = oldTotal > 0 ? newTotal / oldTotal : 0;
    const qty = newQty !== undefined ? newQty : (Number(newProd.quantity) || 1);

    setNewProd(prev => {
      const next = { ...prev, yield: newTotal, quantity: qty, weightPerUnit: newTotal / qty };
      ['items', 'fillingItems', 'sauceItems'].forEach(k => {
        const items = [...((next[k as keyof Product] as RecipeItem[]) || [])];
        items.forEach(item => {
          if (scaleFactor > 0) item.amount *= scaleFactor;
          else if (newTotal > 0) item.amount = (newTotal * (item.percentage || 0)) / 100;
        });
        (next as any)[k] = items;
      });
      return next;
    });
  };

  const handleSaveProduct = async () => {
    if (!newProd.name || currentRecipeTotalWeight === 0) return;
    const allItems = [...(newProd.items || []), ...(newProd.fillingItems || []), ...(newProd.sauceItems || [])];
    const ingredientNames = allItems.map(item => ingredients.find(i => i.id === item.ingredientId)?.name).filter(Boolean);

    try {
      const aiDetails = editingProduct ? { description: editingProduct.description, instructions: editingProduct.instructions, nutrition: editingProduct.nutrition } 
                                     : await geminiService.generateTechnicalDetails(newProd.name!, ingredientNames as string[]);
      
      const product: Product = {
        id: editingProduct?.id || Math.random().toString(36).substr(2, 9),
        name: newProd.name!,
        description: aiDetails.description,
        category: newProd.category || CATEGORIES[0],
        items: newProd.items as RecipeItem[],
        fillingItems: newProd.fillingItems as RecipeItem[],
        sauceItems: newProd.sauceItems as RecipeItem[],
        markup: newProd.markup || 2.5,
        laborTime: newProd.laborTime || 0,
        laborHourlyRate: newProd.laborHourlyRate || 30,
        otherExpenses: newProd.otherExpenses || 0,
        yield: newProd.yield || 0,
        quantity: newProd.quantity || 1,
        weightPerUnit: newProd.weightPerUnit || 0,
        instructions: aiDetails.instructions,
        nutrition: aiDetails.nutrition,
        createdAt: editingProduct?.createdAt || new Date().toISOString()
      };

      if (editingProduct) {
        setProducts(products.map(p => p.id === editingProduct.id ? product : p));
      } else {
        setProducts([...products, product]);
      }
      setIsAddingProduct(false);
      setEditingProduct(null);
      setSelectedProduct(product);
    } catch (error) {
      alert("Erro ao salvar produto.");
    }
  };

  const calculateCosts = (prod: Partial<Product>) => {
    const allItems = [...(prod.items || []), ...(prod.fillingItems || []), ...(prod.sauceItems || [])];
    const ingredientCost = allItems.reduce((acc, item) => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      return acc + (ing ? ing.pricePerUnit * item.amount : 0);
    }, 0);
    const laborCost = ((prod.laborTime || 0) / 60) * (prod.laborHourlyRate || 0);
    const totalCost = ingredientCost + laborCost + (prod.otherExpenses || 0);
    const finalPrice = totalCost * (prod.markup || 2.5);
    const profit = finalPrice - totalCost;
    const margin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
    return { ingredientCost, laborCost, totalCost, profit, finalPrice, margin };
  };

  const stats = useMemo(() => {
    const totalInv = ingredients.reduce((acc, i) => acc + i.packagePrice, 0);
    const topIngs = [...ingredients].sort((a, b) => b.packagePrice - a.packagePrice).slice(0, 5);
    const bottomIngs = [...ingredients].sort((a, b) => a.packagePrice - b.packagePrice).slice(0, 5);
    const avgMarkup = products.length > 0 ? products.reduce((acc, p) => acc + p.markup, 0) / products.length : 0;
    
    // Simulating some dashboard data
    const monthSales = products.length * 15; // mock
    const projection = monthSales * 1.2; // mock
    
    return { totalInv, topIngs, bottomIngs, avgMarkup, monthSales, projection };
  }, [ingredients, products]);

  const addRecipeItem = (type: 'base' | 'filling' | 'sauce') => {
    const key = type === 'base' ? 'items' : type === 'filling' ? 'fillingItems' : 'sauceItems';
    setNewProd({
      ...newProd,
      [key]: [...(newProd[key] || []), { ingredientId: '', amount: 0, percentage: 0 }]
    });
  };

  const removeRecipeItem = (index: number, type: 'base' | 'filling' | 'sauce') => {
    const key = type === 'base' ? 'items' : type === 'filling' ? 'fillingItems' : 'sauceItems';
    const items = [...(newProd[key] || [])];
    items.splice(index, 1);
    setNewProd({ ...newProd, [key]: items });
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64 bg-slate-50 font-['Inter']">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-orange-500 p-2 rounded-lg"><ChefHat className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-bold tracking-tight">Chef<span className="text-orange-500">Pro</span></h1>
        </div>
        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'ingredients', label: 'Ingredientes', icon: Package },
            { id: 'products', label: 'Fichas Técnicas', icon: Utensils }
          ].map(tab => (
            <button key={tab.id} onClick={() => {setActiveTab(tab.id as any); setSelectedProduct(null); setIsAddingProduct(false);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
              <tab.icon className="w-5 h-5" /> {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Visão do Negócio</h2>
                <p className="text-slate-500 font-medium">Controle financeiro e projeções de crescimento.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white p-2 px-4 rounded-2xl shadow-sm border border-slate-100">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <select className="bg-transparent font-bold text-sm outline-none cursor-pointer" value={dashboardMonth} onChange={e => setDashboardMonth(Number(e.target.value))}>
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <select className="bg-transparent font-bold text-sm outline-none cursor-pointer" value={dashboardYear} onChange={e => setDashboardYear(Number(e.target.value))}>
                    {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </header>

            {/* Interactive Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { id: 'insumos', label: 'Insumos', val: ingredients.length, icon: Package, color: 'blue', detail: 'Variação de preços: +2.4%' },
                { id: 'produtos', label: 'Produtos', val: products.length, icon: ClipboardList, color: 'orange', detail: 'Margem média: 62%' },
                { id: 'investimento', label: 'Investimento Total', val: `R$ ${stats.totalInv.toFixed(2)}`, icon: DollarSign, color: 'emerald', detail: 'Foco em Massa/Pães' },
                { id: 'markup', label: 'Markup Médio', val: `${stats.avgMarkup.toFixed(1)}x`, icon: TrendingUp, color: 'purple', detail: 'Alvo: 3.0x' }
              ].map((c) => (
                <div key={c.id} onClick={() => setExpandedStat(expandedStat === c.id ? null : c.id)}
                  className={`bg-white p-6 rounded-[32px] shadow-sm border ${expandedStat === c.id ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-100'} hover:shadow-xl transition-all cursor-pointer relative group overflow-hidden`}>
                  <div className={`w-12 h-12 bg-${c.color}-50 text-${c.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <c.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{c.label}</h3>
                  <p className="text-3xl font-black text-slate-800 mt-1">{c.val}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                    {c.detail.includes('+') ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <Activity className="w-3 h-3 text-blue-500" />}
                    {c.detail}
                  </p>
                  {expandedStat === c.id && (
                    <div className="mt-6 pt-6 border-t border-slate-50 animate-in slide-in-from-top duration-300">
                       <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Detalhamento Semanal</p>
                       <div className="flex items-end gap-1 h-12">
                          {[20, 50, 40, 70, 90, 60, 85].map((v, i) => (
                            <div key={i} className={`w-full bg-${c.color}-500 rounded-t-sm opacity-60`} style={{ height: `${v}%` }}></div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Elaborate Dashboard Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Analysis Chart */}
              <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Análise de Performance</h3>
                    <p className="text-slate-400 text-sm font-medium">Comparativo de custos, vendas e lucros.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-500"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Vendas</div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Custos</div>
                  </div>
                </div>
                
                <div className="flex items-end justify-between h-64 gap-3 relative z-10">
                  {[40, 55, 65, 50, 85, 95, 75, 80, 110, 100, 120, 140].map((v, i) => (
                    <div key={i} className="w-full group relative flex flex-col items-center justify-end">
                      <div className="absolute -top-8 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">R$ {(v*10).toFixed(0)}</div>
                      <div className="w-full bg-slate-100 rounded-t-lg transition-all h-24 mb-1"></div>
                      <div className={`w-full bg-orange-500 rounded-t-lg transition-all group-hover:bg-orange-600`} style={{ height: `${v*1.5}px` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6 text-[10px] font-black text-slate-400 border-t border-slate-50 pt-4">
                  <span>JAN</span><span>MAR</span><span>MAI</span><span>JUL</span><span>SET</span><span>DEZ</span>
                </div>
                
                {/* Insights Row */}
                <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-50">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projeção {dashboardYear + 1}</p>
                     <p className="text-xl font-black text-emerald-500">+22.4% <span className="text-[10px] text-slate-300">Estimado</span></p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Insumo +Caro</p>
                     <p className="text-xl font-black text-slate-800">{stats.topIngs[0]?.name || '---'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giro Médio</p>
                     <p className="text-xl font-black text-blue-500">14 Dias <span className="text-[10px] text-slate-300">Stock</span></p>
                   </div>
                </div>
              </div>

              {/* Sidebar Insights */}
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-slate-900 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart className="w-24 h-24" /></div>
                   <h3 className="text-xl font-black mb-8 relative z-10">Ranking de Insumos</h3>
                   <div className="space-y-6 relative z-10">
                      <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-black text-orange-500 uppercase">Mais Investido</span>
                           <span className="text-xs font-bold">R$ {stats.topIngs[0]?.packagePrice.toFixed(2)}</span>
                        </div>
                        <p className="text-lg font-bold">{stats.topIngs[0]?.name || '---'}</p>
                      </div>
                      <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-black text-blue-400 uppercase">Menos Investido</span>
                           <span className="text-xs font-bold">R$ {stats.bottomIngs[0]?.packagePrice.toFixed(2)}</span>
                        </div>
                        <p className="text-lg font-bold">{stats.bottomIngs[0]?.name || '---'}</p>
                      </div>
                   </div>
                   <button className="w-full mt-10 py-4 bg-orange-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/50">Ver Relatório Completo</button>
                </div>

                <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                   <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                     <Target className="w-5 h-5 text-emerald-500" /> Saúde do Negócio
                   </h3>
                   <div className="space-y-6">
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-slate-500">Ticket Médio</span>
                         <span className="text-lg font-black text-slate-900">R$ 84,50</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-slate-500">Quebra Estimada</span>
                         <span className="text-lg font-black text-red-500">4.2%</span>
                      </div>
                      <div className="h-px bg-slate-50 my-2"></div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-slate-500">Faturamento</span>
                         <span className="text-lg font-black text-emerald-600">R$ 12.450</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-900">Ingredientes</h2>
              <button onClick={() => {setEditingIngredient(null); setNewIng({unit: 'kg'}); setIsAddingIngredient(true);}}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200">
                <Plus className="w-5 h-5" /> Adicionar Insumo
              </button>
            </div>

            {isAddingIngredient && (
              <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-orange-100 animate-in zoom-in">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800">{editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}</h3>
                  <button onClick={() => setIsAddingIngredient(false)} className="text-slate-300 hover:text-red-500"><X className="w-6 h-6"/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Insumo</label>
                    <input type="text" className={inputClass} value={newIng.name || ''} onChange={e => setNewIng({...newIng, name: e.target.value})} placeholder="Ex: Farinha 00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                    <select className={selectClass} value={newIng.unit} onChange={e => setNewIng({...newIng, unit: e.target.value as Unit})}>
                      <option value="kg">Quilograma (kg)</option><option value="g">Grama (g)</option><option value="L">Litro (L)</option><option value="ml">Mililitro (ml)</option><option value="un">Unidade (un)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho Embalagem</label>
                    <input type="number" className={inputClass} value={newIng.packageSize || ''} onChange={e => setNewIng({...newIng, packageSize: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Compra (R$)</label>
                    <input type="number" className={inputClass} value={newIng.packagePrice || ''} onChange={e => setNewIng({...newIng, packagePrice: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50">
                  <button onClick={() => setIsAddingIngredient(false)} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
                  <button onClick={handleSaveIngredient} className="px-12 py-4 bg-orange-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all">
                    {editingIngredient ? 'Salvar Alterações' : 'Cadastrar Insumo'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Ingrediente</th>
                    <th className="px-10 py-6">Embalagem</th>
                    <th className="px-10 py-6">Preço Pago</th>
                    <th className="px-10 py-6">Custo Unitário</th>
                    <th className="px-10 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6 font-bold text-slate-800 text-lg">{ing.name}</td>
                      <td className="px-10 py-6 text-slate-500 font-bold">{ing.packageSize}{ing.unit}</td>
                      <td className="px-10 py-6 text-slate-900 font-black">R$ {ing.packagePrice.toFixed(2)}</td>
                      <td className="px-10 py-6 font-mono text-sm text-slate-500">R$ {ing.pricePerUnit.toFixed(4)}</td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditIngredient(ing)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => removeIngredient(ing.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ingredients.length === 0 && <div className="p-20 text-center text-slate-400 font-bold">Nenhum insumo cadastrado.</div>}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            {!selectedProduct && !isAddingProduct ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-slate-900">Fichas Técnicas</h2>
                  <button onClick={() => {setEditingProduct(null); setNewProd({items:[], fillingItems:[], sauceItems:[], markup:2.5, quantity:1, category:CATEGORIES[0]}); setIsAddingProduct(true);}}
                    className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-orange-600 transition-all shadow-xl shadow-orange-100">
                    Nova Receita
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {products.map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl cursor-pointer group transition-all hover:-translate-y-1">
                      <div className="flex justify-between mb-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><Utensils className="w-6 h-6" /></div>
                        <span className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded-full text-slate-500 tracking-widest">{p.category}</span>
                      </div>
                      <h3 className="text-2xl font-black mb-1 text-slate-800 line-clamp-2 leading-tight">{p.name}</h3>
                      <p className="text-xs text-slate-400 font-bold mb-8">Produção: {p.quantity} unid. de {p.weightPerUnit.toFixed(0)}g</p>
                      <div className="flex justify-between items-end pt-6 border-t border-slate-50">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem</p>
                           <p className="text-2xl font-black text-slate-900">{calculateCosts(p).margin.toFixed(0)}%</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Preço Venda</p>
                           <p className="text-3xl font-black text-emerald-600">R$ {calculateCosts(p).finalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : isAddingProduct ? (
              <div className="bg-white p-8 md:p-14 rounded-[56px] shadow-2xl border border-slate-100 max-w-6xl mx-auto animate-in zoom-in">
                <header className="mb-12 flex justify-between items-center">
                  <h3 className="text-4xl font-black flex items-center gap-4 text-slate-900">
                    <Utensils className="w-10 h-10 text-orange-500" />
                    {editingProduct ? 'Editar Ficha Técnica' : 'Montar Nova Ficha'}
                  </h3>
                  <button onClick={() => setIsAddingProduct(false)} className="text-slate-300 hover:text-red-500 p-3 bg-slate-50 rounded-2xl"><X className="w-8 h-8" /></button>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                   <div className="md:col-span-2 space-y-3">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                     <input type="text" className={inputClass} value={newProd.name || ''} onChange={e => setNewProd({...newProd, name: e.target.value})} placeholder="Ex: Pizza Napolitana Artesanal" />
                   </div>
                   <div className="space-y-3">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                     <select className={selectClass} value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 mb-12 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 ml-1"><Layers className="w-4 h-4 text-orange-500"/> Peso p/ Unidade (g)</label>
                      <input type="number" className={inputClass} value={newProd.weightPerUnit || ''} onChange={e => handleWeightPerUnitChange(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 ml-1"><ClipboardList className="w-4 h-4 text-orange-500"/> Qtd Unidades (un)</label>
                      <input type="number" className={inputClass} value={newProd.quantity || ''} onChange={e => handleQuantityChange(parseFloat(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 ml-1"><Scaling className="w-4 h-4 text-orange-500"/> Peso Total Receita (g)</label>
                      <input type="number" className={`${inputClass} bg-white font-black`} value={newProd.yield ? Number(newProd.yield.toFixed(0)) : ''} onChange={e => handleTotalWeightChange(parseFloat(e.target.value) || 0)} />
                    </div>
                </div>

                <div className="space-y-10 mb-14">
                   {['base', 'filling', 'sauce'].map(type => (
                     <div key={type} className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                          <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                            {type === 'base' ? <Scaling className="w-5 h-5 text-slate-400" /> : type === 'filling' ? <Flame className="w-5 h-5 text-orange-500" /> : <Utensils className="w-5 h-5 text-red-500" />}
                            {type === 'base' ? '1. Massa / Base' : type === 'filling' ? '2. Balanceamento de Recheio' : '3. Balanceamento de Molho'}
                          </h5>
                          <button onClick={() => addRecipeItem(type as any)} className="bg-orange-50 text-orange-600 px-5 py-2.5 rounded-2xl font-black text-[10px] flex items-center gap-2 hover:bg-orange-100 transition-all uppercase tracking-widest border border-orange-100">
                            <Plus className="w-4 h-4"/> Adicionar Insumo
                          </button>
                        </div>
                        <div className="space-y-4">
                          {(newProd[type === 'base' ? 'items' : type === 'filling' ? 'fillingItems' : 'sauceItems'] || []).map((item, idx) => (
                            <BalanceRow key={idx} item={item} index={idx} ingredients={ingredients} type={type as any} onUpdate={updateRecipeItem} onRemove={removeRecipeItem} inputClass={inputClass} selectClass={selectClass} />
                          ))}
                          {(newProd[type === 'base' ? 'items' : type === 'filling' ? 'fillingItems' : 'sauceItems'] || []).length === 0 && (
                             <div className="p-6 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[32px]">Opcional: Nenhum item adicionado</div>
                          )}
                        </div>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 p-10 bg-slate-900 rounded-[48px] text-white mb-14 shadow-2xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tempo Execução (Min)</label>
                    <input type="number" className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={newProd.laborTime || 0} onChange={e => setNewProd({...newProd, laborTime: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor da Hora (R$)</label>
                    <input type="number" className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={newProd.laborHourlyRate || 30} onChange={e => setNewProd({...newProd, laborHourlyRate: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-3 relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Markup (Multiplicador)</label>
                    <input type="number" step="0.1" className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl outline-none font-black text-xl focus:ring-2 focus:ring-orange-500 transition-all" value={newProd.markup || 2.5} onChange={e => setNewProd({...newProd, markup: parseFloat(e.target.value)})} />
                    <span className="absolute right-6 bottom-4 text-orange-500 font-black text-2xl">x</span>
                  </div>
                </div>

                <div className="p-12 bg-emerald-50 rounded-[56px] border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-12 shadow-inner">
                   <div className="flex flex-wrap gap-14">
                      <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Preço Sugerido</p><p className="text-6xl font-black text-slate-900 tracking-tighter">R$ {calculateCosts(newProd).finalPrice.toFixed(2)}</p></div>
                      <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Margem Real</p><p className="text-6xl font-black text-emerald-600 tracking-tighter">{calculateCosts(newProd).margin.toFixed(0)}%</p></div>
                   </div>
                   <button onClick={handleSaveProduct} className="bg-slate-900 text-white px-12 py-7 rounded-[32px] font-black uppercase tracking-widest text-sm shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95">
                     <Save className="w-7 h-7" /> {editingProduct ? 'Atualizar Ficha' : 'Gerar via IA'}
                   </button>
                </div>
              </div>
            ) : selectedProduct && (
              <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-8">
                  <button onClick={() => setSelectedProduct(null)} className="text-slate-500 font-black flex items-center gap-3 hover:text-slate-900 transition-all bg-white px-6 py-3 rounded-2xl shadow-sm">
                    <ArrowRight className="w-5 h-5 rotate-180" /> Voltar à lista
                  </button>
                  <div className="flex gap-4">
                    <div className="bg-white p-1.5 rounded-3xl flex border border-slate-100 shadow-sm">
                      <button onClick={() => setViewMode('unit')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'unit' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-400 hover:text-slate-900'}`}>Por Unidade</button>
                      <button onClick={() => setViewMode('total')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'total' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-400 hover:text-slate-900'}`}>Total Receita</button>
                    </div>
                    <button onClick={() => {setEditingProduct(selectedProduct); setNewProd(selectedProduct); setIsAddingProduct(true); setSelectedProduct(null);}} className="bg-slate-900 text-white px-8 py-3 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all">
                      <Edit2 className="w-5 h-5"/> Editar Ficha
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[64px] shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-900 text-white p-12 md:p-20 relative">
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                      <div className="max-w-4xl">
                        <span className="px-5 py-2 bg-orange-500 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">{selectedProduct.category}</span>
                        <h2 className="text-6xl md:text-7xl font-black mt-8 leading-tight tracking-tight">{selectedProduct.name}</h2>
                        
                        <div className="flex flex-wrap gap-6 mt-10">
                           <div className="px-6 py-4 bg-white/5 rounded-[32px] border border-white/10">
                              <span className="text-[9px] text-slate-400 block uppercase font-black tracking-widest mb-1">Produção Realizada</span>
                              <span className="text-2xl font-black">{selectedProduct.quantity} unidades <span className="text-sm font-medium text-slate-500 ml-1">({selectedProduct.weightPerUnit}g/cada)</span></span>
                           </div>
                           <div className="px-6 py-4 bg-white/5 rounded-[32px] border border-white/10">
                              <span className="text-[9px] text-slate-400 block uppercase font-black tracking-widest mb-1">Peso Total Batch</span>
                              <span className="text-2xl font-black">{selectedProduct.yield.toFixed(0)}g</span>
                           </div>
                        </div>
                        <p className="text-slate-400 mt-10 text-xl leading-relaxed font-medium max-w-3xl">{selectedProduct.description}</p>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-2xl p-12 rounded-[56px] border border-white/10 text-center min-w-[300px] shadow-2xl">
                        <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Preço {viewMode === 'unit' ? 'por Unidade' : 'Total Ficha'}</p>
                        <p className="text-6xl font-black text-white tracking-tighter">R$ {(viewMode === 'unit' ? calculateCosts(selectedProduct).finalPrice / selectedProduct.quantity : calculateCosts(selectedProduct).finalPrice).toFixed(2)}</p>
                        <div className="h-px bg-white/10 my-6"></div>
                        <p className="text-xl font-black text-emerald-400">{calculateCosts(selectedProduct).margin.toFixed(0)}% <span className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Margem de Lucro</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-12 md:p-20 grid grid-cols-1 lg:grid-cols-12 gap-20">
                    <div className="lg:col-span-8 space-y-20">
                      <section>
                        <div className="flex items-center gap-4 mb-10">
                           <div className="w-2 h-10 bg-orange-500 rounded-full"></div>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tight">Composição & Balanceamento Profissional</h3>
                        </div>
                        <div className="overflow-hidden rounded-[48px] border border-slate-100 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Componente</th><th className="px-10 py-6">Quantidade ({viewMode === 'unit' ? 'Unit' : 'Total'})</th><th className="px-10 py-6 text-right">Custo ({viewMode === 'unit' ? 'Unit' : 'Total'})</th><th className="px-10 py-6 text-right">% Receita</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                               <TechnicalSection items={selectedProduct.items} label="1. Massa / Base" ingredients={ingredients} mode={viewMode} qty={selectedProduct.quantity} />
                               <TechnicalSection items={selectedProduct.fillingItems} label="2. Recheio" ingredients={ingredients} mode={viewMode} qty={selectedProduct.quantity} />
                               <TechnicalSection items={selectedProduct.sauceItems} label="3. Molho" ingredients={ingredients} mode={viewMode} qty={selectedProduct.quantity} />
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="bg-slate-50 p-12 rounded-[56px] border border-slate-100 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5"><ChefHat className="w-40 h-40"/></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Clock className="w-6 h-6 text-orange-500"/> Modo de Preparo Detalhado</h3>
                        <p className="text-slate-600 leading-[2.2] text-xl font-medium whitespace-pre-wrap relative z-10">{selectedProduct.instructions}</p>
                      </section>
                    </div>

                    <div className="lg:col-span-4 space-y-12">
                      <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Target className="w-20 h-20"/></div>
                        <h4 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-900"><Info className="w-6 h-6 text-blue-500" /> Tabela Nutricional</h4>
                        {selectedProduct.nutrition ? (
                          <div className="space-y-6">
                            {[
                              { l: 'Energia', v: viewMode === 'unit' ? (selectedProduct.nutrition.calories * selectedProduct.weightPerUnit / 100) : selectedProduct.nutrition.calories, u: 'kcal' },
                              { l: 'Carboidratos', v: viewMode === 'unit' ? (selectedProduct.nutrition.carbs * selectedProduct.weightPerUnit / 100) : selectedProduct.nutrition.carbs, u: 'g' },
                              { l: 'Proteínas', v: viewMode === 'unit' ? (selectedProduct.nutrition.protein * selectedProduct.weightPerUnit / 100) : selectedProduct.nutrition.protein, u: 'g' },
                              { l: 'Gorduras', v: viewMode === 'unit' ? (selectedProduct.nutrition.fats * selectedProduct.weightPerUnit / 100) : selectedProduct.nutrition.fats, u: 'g' },
                              { l: 'Sódio', v: viewMode === 'unit' ? (selectedProduct.nutrition.sodium * selectedProduct.weightPerUnit / 100) : selectedProduct.nutrition.sodium, u: 'mg' }
                            ].map((n, i) => (
                              <div key={i} className="flex justify-between items-center pb-4 border-b border-slate-50 last:border-0"><span className="text-sm font-bold text-slate-500">{n.l}</span><span className="text-2xl font-black text-slate-900">{n.v.toFixed(1)}<span className="text-[10px] ml-1 text-slate-300 font-bold uppercase">{n.u}</span></span></div>
                            ))}
                            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Cálculos baseados em IA para {viewMode === 'unit' ? 'unidade de '+selectedProduct.weightPerUnit+'g' : 'batch total'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">Dados nutricionais indisponíveis.</p>
                        )}
                      </div>
                      
                      <div className="bg-slate-900 text-white p-12 rounded-[56px] shadow-2xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 p-10 opacity-5"><BarChart3 className="w-48 h-48"/></div>
                        <h4 className="text-xl font-black mb-12 flex items-center gap-3 text-orange-500 relative z-10"><Calculator className="w-6 h-6"/> Estrutura de Custos</h4>
                        <div className="space-y-7 relative z-10">
                           <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]"><span>CUSTO OPERACIONAL</span><span className="text-white text-lg font-bold">R$ {calculateCosts(selectedProduct).totalCost.toFixed(2)}</span></div>
                           <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]"><span>LUCRO ESTIMADO</span><span className="text-emerald-400 text-lg font-bold">R$ {calculateCosts(selectedProduct).profit.toFixed(2)}</span></div>
                           <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]"><span>MÃO DE OBRA ({selectedProduct.laborTime} min)</span><span className="text-white text-lg font-bold">R$ {calculateCosts(selectedProduct).laborCost.toFixed(2)}</span></div>
                           <div className="h-px bg-white/10 my-8"></div>
                           <div className="text-center bg-orange-500 rounded-[32px] p-8 shadow-xl shadow-orange-900/40 transform hover:scale-[1.02] transition-transform">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white/80">Valor Sugerido {viewMode === 'unit' ? 'Unitário' : 'Total'}</p>
                              <p className="text-5xl font-black tracking-tighter">R$ {(viewMode === 'unit' ? calculateCosts(selectedProduct).finalPrice / selectedProduct.quantity : calculateCosts(selectedProduct).finalPrice).toFixed(2)}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-6 z-50 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: BarChart3, label: 'Dash' },
          { id: 'ingredients', icon: Package, label: 'Insumos' },
          { id: 'products', icon: Utensils, label: 'Fichas' }
        ].map(t => (
          <button key={t.id} onClick={() => {setActiveTab(t.id as any); setSelectedProduct(null); setIsAddingProduct(false);}} 
            className={`flex flex-col items-center gap-1.5 ${activeTab === t.id ? 'text-orange-500' : 'text-slate-400'}`}>
            <t.icon className="w-7 h-7" /> <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const BalanceRow: React.FC<{ item: RecipeItem, index: number, ingredients: Ingredient[], type: 'base' | 'filling' | 'sauce', onUpdate: any, onRemove: any, inputClass: string, selectClass: string }> = ({ item, index, ingredients, type, onUpdate, onRemove, inputClass, selectClass }) => (
  <div className="grid grid-cols-12 gap-5 items-center p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-lg transition-all animate-in slide-in-from-bottom group">
    <div className="col-span-12 md:col-span-5">
      <select className={selectClass} value={item.ingredientId} onChange={e => onUpdate(index, 'ingredientId', e.target.value, type)}>
        <option value="">Escolha o insumo...</option>
        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
      </select>
    </div>
    <div className="col-span-6 md:col-span-3 relative">
      <input type="number" className={inputClass} value={item.amount ? Number(item.amount.toFixed(2)) : ''} onChange={e => onUpdate(index, 'amount', e.target.value, type)} placeholder="Peso" />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">G/ML</span>
    </div>
    <div className="col-span-4 md:col-span-3 relative">
      <input type="number" className={inputClass} value={item.percentage ? Number(item.percentage.toFixed(1)) : ''} onChange={e => onUpdate(index, 'percentage', e.target.value, type)} placeholder="%" />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">%</span>
    </div>
    <div className="col-span-2 md:col-span-1 text-right">
      <button onClick={() => onRemove(index, type)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
    </div>
  </div>
);

const TechnicalSection: React.FC<{ items?: RecipeItem[], label: string, ingredients: Ingredient[], mode: 'unit' | 'total', qty: number }> = ({ items, label, ingredients, mode, qty }) => {
  if (!items || items.length === 0) return null;
  return (
    <>
      <tr className="bg-slate-50/50"><td colSpan={4} className="px-10 py-4 text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] bg-orange-50/20">{label}</td></tr>
      {items.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        const displayAmount = mode === 'unit' ? item.amount / qty : item.amount;
        const displayCost = (ing ? ing.pricePerUnit * item.amount : 0) / (mode === 'unit' ? qty : 1);
        return (
          <tr key={item.ingredientId} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
            <td className="px-10 py-6 font-bold text-slate-800 pl-16 text-lg">{ing?.name || '---'}</td>
            <td className="px-10 py-6 text-slate-600 font-bold">{displayAmount.toFixed(1)}{ing?.unit === 'un' ? ' un' : 'g'}</td>
            <td className="px-10 py-6 text-right font-black text-slate-900">R$ {displayCost.toFixed(2)}</td>
            <td className="px-10 py-6 text-right text-slate-400 font-black">{item.percentage.toFixed(1)}%</td>
          </tr>
        );
      })}
    </>
  );
};

export default App;
