'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Upload, TrendingUp, Calendar, BarChart2, PieChart as PieChartIcon, ExternalLink, ChevronDown, Filter, ArrowUpDown, ChevronRight, ChevronLeft } from 'lucide-react';

// Interfaces
interface Trade {
  date: string;
  time: string;
  instrument: string;
  type: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  commission: number;
  notes?: string;
  setup?: string;
  tradingViewChart?: string;
}

interface TradeStats {
  totalNetProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  evenTrades: number;
  winRate: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
  sharpeRatio: number;
  sortinoRatio: number;
}

interface DailyStats {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface InstrumentStats {
  instrument: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface AdvancedStats {
  avgTradeLength: number;
  bestDayOfWeek: string;
  worstDayOfWeek: string;
  bestTimeOfDay: string;
  worstTimeOfDay: string;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgRiskRewardRatio: number;
  expectancy: number;
  profitPerDay: number;
}

// Constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const ANIMATION_DURATION = 1000;
const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TradeJournal: React.FC = () => {
  // States
  const [activeTab, setActiveTab] = useState('overview');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats>({
    totalNetProfit: 0,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    evenTrades: 0,
    winRate: 0,
    avgWinningTrade: 0,
    avgLosingTrade: 0,
    largestWin: 0,
    largestLoss: 0,
    sharpeRatio: 0,
    sortinoRatio: 0
  });
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedInstrument, setSelectedInstrument] = useState('all');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [instrumentStats, setInstrumentStats] = useState<InstrumentStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats>({
    avgTradeLength: 0,
    bestDayOfWeek: '',
    worstDayOfWeek: '',
    bestTimeOfDay: '',
    worstTimeOfDay: '',
    consecutiveWins: 0,
    consecutiveLosses: 0,
    avgRiskRewardRatio: 0,
    expectancy: 0,
    profitPerDay: 0
  });

  // Handlers
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      const rows = text.split('\n');
      const statsMap = new Map<string, string>();

      // Parse CSV
      rows.forEach(row => {
        const cells = row.split(';');
        if (cells.length >= 2) {
          statsMap.set(cells[0].trim(), cells[1].trim());
        }
      });

      // Update basic stats
      const updatedStats = {
        totalNetProfit: parseFloat(statsMap.get('Total net profit')?.replace(/[$ ,]/g, '') || '0'),
        grossProfit: parseFloat(statsMap.get('Gross profit')?.replace(/[$ ,]/g, '') || '0'),
        grossLoss: parseFloat(statsMap.get('Gross loss')?.replace(/[$ ,]/g, '') || '0'),
        profitFactor: parseFloat(statsMap.get('Profit factor') || '0'),
        maxDrawdown: parseFloat(statsMap.get('Max. drawdown')?.replace(/[$ ,]/g, '') || '0'),
        totalTrades: parseInt(statsMap.get('Total # of trades') || '0'),
        winningTrades: parseInt(statsMap.get('# of winning trades') || '0'),
        losingTrades: parseInt(statsMap.get('# of losing trades') || '0'),
        evenTrades: parseInt(statsMap.get('# of even trades') || '0'),
        winRate: parseFloat(statsMap.get('Percent profitable')?.replace('%', '') || '0'),
        avgWinningTrade: parseFloat(statsMap.get('Avg. winning trade')?.replace(/[$ ,]/g, '') || '0'),
        avgLosingTrade: parseFloat(statsMap.get('Avg. losing trade')?.replace(/[$ ,]/g, '') || '0'),
        largestWin: parseFloat(statsMap.get('Largest winning trade')?.replace(/[$ ,]/g, '') || '0'),
        largestLoss: parseFloat(statsMap.get('Largest losing trade')?.replace(/[$ ,]/g, '') || '0'),
        sharpeRatio: parseFloat(statsMap.get('Sharpe ratio') || '0'),
        sortinoRatio: parseFloat(statsMap.get('Sortino ratio') || '0')
      };

      setStats(updatedStats);

      // Generate sample trades
      const sampleTrades = generateSampleTrades();
      setTrades(sampleTrades);
      
      // Calculate all statistics
      calculateDailyStats(sampleTrades);
      calculateInstrumentStats(sampleTrades);
      calculateAdvancedStats(sampleTrades, updatedStats);
    };
    reader.readAsText(file);
  }, []);

  const calculateAdvancedStats = (trades: Trade[], basicStats: TradeStats) => {
    // Calculer les trades consécutifs
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    
    // Stats par jour et heure
    const dayStats = new Array(7).fill(0).map(() => ({ trades: 0, pnl: 0 }));
    const hourStats = new Array(24).fill(0).map(() => ({ trades: 0, pnl: 0 }));

    trades.forEach((trade, index) => {
      const date = new Date(trade.date + 'T' + trade.time);
      const dayIndex = date.getDay();
      const hour = date.getHours();

      // Calculer les séquences
      if (trade.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (trade.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }

      // Stats journalières
      dayStats[dayIndex].trades++;
      dayStats[dayIndex].pnl += trade.pnl;

      // Stats horaires
      hourStats[hour].trades++;
      hourStats[hour].pnl += trade.pnl;
    });

    // Trouver les meilleurs/pires moments
    const bestDay = dayStats.reduce((max, curr, i) => 
      curr.pnl > max.pnl ? { day: i, pnl: curr.pnl } : max, 
      { day: 0, pnl: -Infinity }
    );

    const worstDay = dayStats.reduce((min, curr, i) => 
      curr.pnl < min.pnl ? { day: i, pnl: curr.pnl } : min, 
      { day: 0, pnl: Infinity }
    );

    const bestHour = hourStats.reduce((max, curr, i) => 
      curr.pnl > max.pnl ? { hour: i, pnl: curr.pnl } : max, 
      { hour: 0, pnl: -Infinity }
    );

    const worstHour = hourStats.reduce((min, curr, i) => 
      curr.pnl < min.pnl ? { hour: i, pnl: curr.pnl } : min, 
      { hour: 0, pnl: Infinity }
    );

    // Calculer l'expectancy et autres métriques
    const expectancy = (basicStats.winRate / 100 * basicStats.avgWinningTrade) -
                      ((100 - basicStats.winRate) / 100 * Math.abs(basicStats.avgLosingTrade));

    const avgRiskReward = Math.abs(basicStats.avgWinningTrade / basicStats.avgLosingTrade);

    setAdvancedStats({
      avgTradeLength: 0, // À calculer si vous avez les heures de sortie
      bestDayOfWeek: DAYS_OF_WEEK[bestDay.day],
      worstDayOfWeek: DAYS_OF_WEEK[worstDay.day],
      bestTimeOfDay: `${bestHour.hour}:00`,
      worstTimeOfDay: `${worstHour.hour}:00`,
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak,
      avgRiskRewardRatio: avgRiskReward,
      expectancy: expectancy,
      profitPerDay: basicStats.totalNetProfit / new Set(trades.map(t => t.date)).size
    });
  };

  const generateSampleTrades = (): Trade[] => {
    const sampleTrades: Trade[] = [];
    const instruments = ['EURUSD', 'GBPUSD', 'USDJPY'];
    const startDate = new Date('2024-01-01');
    
    for (let i = 0; i < 50; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Générer une heure aléatoire entre 8:00 et 16:00
      const hour = Math.floor(Math.random() * 9) + 8;
      const minute = Math.floor(Math.random() * 60);
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

      const pnl = (Math.random() * 200) - 100;
      const entryPrice = 1.1000 + Math.random() * 0.1;
      const exitPrice = entryPrice + (pnl > 0 ? 0.005 : -0.005) * Math.random();

      sampleTrades.push({
        date: date.toISOString().split('T')[0],
        time,
        instrument: instruments[Math.floor(Math.random() * instruments.length)],
        type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
        size: Math.floor(Math.random() * 5) + 1,
        entryPrice,
        exitPrice,
        pnl,
        commission: Math.random() * 10,
        tradingViewChart: 'https://www.tradingview.com/chart'
      });
    }
    return sampleTrades;
  };

  const calculateDailyStats = (trades: Trade[]) => {
    const dailyStatsMap = new Map<string, DailyStats>();
    
    trades.forEach(trade => {
      const existing = dailyStatsMap.get(trade.date) || {
        date: trade.date,
        pnl: 0,
        trades: 0,
        winRate: 0
      };
      
      existing.pnl += trade.pnl;
      existing.trades += 1;
      existing.winRate = (existing.pnl > 0 ? existing.trades : 0) / existing.trades * 100;
      
      dailyStatsMap.set(trade.date, existing);
    });

    setDailyStats(Array.from(dailyStatsMap.values()));
  };

  const calculateInstrumentStats = (trades: Trade[]) => {
    const instrumentStatsMap = new Map<string, InstrumentStats>();
    
    trades.forEach(trade => {
      const existing = instrumentStatsMap.get(trade.instrument) || {
        instrument: trade.instrument,
        pnl: 0,
        trades: 0,
        winRate: 0
      };
      
      existing.pnl += trade.pnl;
      existing.trades += 1;
      existing.winRate = (existing.pnl > 0 ? existing.trades : 0) / existing.trades * 100;
      
      instrumentStatsMap.set(trade.instrument, existing);
    });

    setInstrumentStats(Array.from(instrumentStatsMap.values()));
  };

  // Fonction utilitaire pour calculer le win rate par heure
  const calculateWinRateForHour = (hour: number) => {
    const hourTrades = trades.filter(t => {
      const tradeHour = parseInt(t.time.split(':')[0]);
      return tradeHour === hour;
    });
    
    if (hourTrades.length === 0) return 0;
    const winners = hourTrades.filter(t => t.pnl > 0).length;
    return (winners / hourTrades.length) * 100;
  };

  // Navigation du calendrier
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const renderOverviewTab = () => {
    // Préparer les données pour le camembert des trades
    const tradeOutcomeData = [
      { name: 'Gagnants', value: stats.winningTrades, color: '#10B981' },
      { name: 'Perdants', value: stats.losingTrades, color: '#EF4444' },
      { name: 'Neutres', value: stats.evenTrades, color: '#6B7280' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Performance Card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Performance</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Net P&L</p>
                <p className={`text-2xl font-bold ${stats.totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.totalNetProfit.toFixed(2)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Win Rate</p>
                  <p className="text-xl font-bold">{stats.winRate.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Profit Factor</p>
                  <p className="text-xl font-bold">{stats.profitFactor.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Statistics Card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Statistiques</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Trades Totaux</p>
                <p className="text-2xl font-bold">{stats.totalTrades}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-gray-400">Gagnants</p>
                  <p className="text-lg font-bold text-green-500">{stats.winningTrades}</p>
                </div>
                <div>
                  <p className="text-gray-400">Perdants</p>
                  <p className="text-lg font-bold text-red-500">{stats.losingTrades}</p>
                </div>
                <div>
                  <p className="text-gray-400">Neutres</p>
                  <p className="text-lg font-bold text-gray-400">{stats.evenTrades}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Average Trade Card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Trades Moyens</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Gain Moyen</p>
                  <p className="text-lg font-bold text-green-500">${stats.avgWinningTrade.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Perte Moyenne</p>
                  <p className="text-lg font-bold text-red-500">${Math.abs(stats.avgLosingTrade).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400">Ratio R/R</p>
                <p className="text-lg font-bold">{advancedStats.avgRiskRewardRatio.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Expectancy</p>
                <p className="text-lg font-bold">${advancedStats.expectancy.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Évolution P&L</h3>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={ANIMATION_DURATION}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-4">Distribution des Trades</h3>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={tradeOutcomeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    animationDuration={ANIMATION_DURATION}
                  >
                    {tradeOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTradesTab = () => (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Liste des Trades</h3>
        <div className="flex gap-4">
          {/* Filtres */}
          <div className="relative">
            <select
              value={selectedInstrument}
              onChange={(e) => setSelectedInstrument(e.target.value)}
              className="bg-zinc-800 px-4 py-2 rounded-lg appearance-none pr-10"
            >
              <option value="all">Tous les instruments</option>
              {Array.from(new Set(trades.map(t => t.instrument))).map(instrument => (
                <option key={instrument} value={instrument}>{instrument}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          {/* Date Range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-zinc-800 px-3 py-2 rounded-lg"
            />
            <span>à</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-zinc-800 px-3 py-2 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Table des trades */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-zinc-800">
              <th className="px-4 py-3 text-gray-400">Date</th>
              <th className="px-4 py-3 text-gray-400">Heure</th>
              <th className="px-4 py-3 text-gray-400">Instrument</th>
              <th className="px-4 py-3 text-gray-400">Type</th>
              <th className="px-4 py-3 text-gray-400">Taille</th>
              <th className="px-4 py-3 text-gray-400">Prix Entrée</th>
              <th className="px-4 py-3 text-gray-400">Prix Sortie</th>
              <th className="px-4 py-3 text-gray-400">P&L</th>
              <th className="px-4 py-3 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades
              .filter(trade => selectedInstrument === 'all' || trade.instrument === selectedInstrument)
              .filter(trade => 
                (!dateRange.start || trade.date >= dateRange.start) &&
                (!dateRange.end || trade.date <= dateRange.end)
              )
              .map((trade, index) => (
                <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3">{trade.date}</td>
                  <td className="px-4 py-3">{trade.time}</td>
                  <td className="px-4 py-3">{trade.instrument}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      trade.type === 'LONG' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{trade.size}</td>
                  <td className="px-4 py-3">{trade.entryPrice.toFixed(5)}</td>
                  <td className="px-4 py-3">{trade.exitPrice.toFixed(5)}</td>
                  <td className={`px-4 py-3 ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${trade.pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={trade.tradingViewChart}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">


      {/* Statistiques avancées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4">Statistiques de Trading</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Ratio Risque/Récompense Moyen</p>
              <p className="text-lg font-bold">{advancedStats.avgRiskRewardRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Expectancy</p>
              <p className="text-lg font-bold">${advancedStats.expectancy.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Profit Moyen par Jour</p>
              <p className="text-lg font-bold">${advancedStats.profitPerDay.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Drawdown Maximum</p>
              <p className="text-lg font-bold text-red-500">${stats.maxDrawdown.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4">Meilleurs Moments</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Meilleur Jour</p>
              <p className="text-lg font-bold text-green-500">{advancedStats.bestDayOfWeek}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Meilleure Période</p>
              <p className="text-lg font-bold text-green-500">{advancedStats.bestTimeOfDay}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Trades Gagnants Consécutifs</p>
              <p className="text-lg font-bold text-green-500">{advancedStats.consecutiveWins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Sharpe Ratio</p>
              <p className="text-lg font-bold">{stats.sharpeRatio.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4">Points à Améliorer</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Pire Jour</p>
              <p className="text-lg font-bold text-red-500">{advancedStats.worstDayOfWeek}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Pire Période</p>
              <p className="text-lg font-bold text-red-500">{advancedStats.worstTimeOfDay}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Trades Perdants Consécutifs</p>
              <p className="text-lg font-bold text-red-500">{advancedStats.consecutiveLosses}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Sortino Ratio</p>
              <p className="text-lg font-bold">{stats.sortinoRatio.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution horaire des trades */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h3 className="text-xl font-semibold mb-4">Distribution Horaire</h3>
        <div className="h-[300px]">
          <ResponsiveContainer>
            <BarChart 
              data={Array.from({ length: 24 }, (_, hour) => ({
                hour: hour.toString().padStart(2, '0') + 'h',
                trades: trades.filter(t => parseInt(t.time.split(':')[0]) === hour).length,
                winRate: calculateWinRateForHour(hour)
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9CA3AF" />
              <YAxis yAxisId="left" orientation="left" stroke="#9CA3AF" />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181B',
                  border: '1px solid #374151',
                  borderRadius: '0.375rem'
                }}
              />
              <Bar yAxisId="left" dataKey="trades" name="Nombre de trades" fill="#6366F1" />
              <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate %" stroke="#10B981" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistiques par instrument */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h3 className="text-xl font-semibold mb-4">Performance par Instrument</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-zinc-800">
                <th className="px-4 py-3 text-gray-400">Instrument</th>
                <th className="px-4 py-3 text-gray-400">Trades</th>
                <th className="px-4 py-3 text-gray-400">Win Rate</th>
                <th className="px-4 py-3 text-gray-400">P&L Total</th>
                <th className="px-4 py-3 text-gray-400">P&L Moyen</th>
                <th className="px-4 py-3 text-gray-400">Meilleur Trade</th>
                <th className="px-4 py-3 text-gray-400">Pire Trade</th>
              </tr>
            </thead>
            <tbody>
              {instrumentStats.map((stat, index) => {
                const instrumentTrades = trades.filter(t => t.instrument === stat.instrument);
                const bestTrade = Math.max(...instrumentTrades.map(t => t.pnl));
                const worstTrade = Math.min(...instrumentTrades.map(t => t.pnl));

                return (
                  <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3">{stat.instrument}</td>
                    <td className="px-4 py-3">{stat.trades}</td>
                    <td className="px-4 py-3">{stat.winRate.toFixed(2)}%</td>
                    <td className={`px-4 py-3 ${stat.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${stat.pnl.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 ${(stat.pnl / stat.trades) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${(stat.pnl / stat.trades).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-green-500">${bestTrade.toFixed(2)}</td>
                    <td className="px-4 py-3 text-red-500">${worstTrade.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Journal de Trading</h1>
          <label className="cursor-pointer">
            <span className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Upload size={20} />
              Importer CSV
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </header>

        {/* Navigation */}
        <nav className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg">
          {[
            { id: 'overview', label: "Vue d'ensemble", Icon: TrendingUp },
            { id: 'trades', label: 'Trades', Icon: Calendar },
            { id: 'analytics', label: 'Analyses', Icon: BarChart2 }
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="mt-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'trades' && renderTradesTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </main>
      </div>
    </div>
  );
};

export default TradeJournal;