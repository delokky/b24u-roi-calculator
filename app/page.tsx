'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [budget, setBudget] = useState(1000000);
  const [cpc, setCpc] = useState(200);
  const [cr, setCr] = useState(10);
  const [cr1, setCr1] = useState(50);
  const [arpu, setArpu] = useState(10000);
  const [margin, setMargin] = useState(50);
  const [chatPrice, setChatPrice] = useState(15000);
  const [activeScenario, setActiveScenario] = useState('realistic');
  const [showResults, setShowResults] = useState(false);

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const baseMetrics = useMemo(() => {
    const traffic = Math.floor(budget / cpc);
    const leads = Math.floor(traffic * (cr / 100));
    const deals = Math.floor(leads * (cr1 / 100));
    const revenue = deals * arpu;
    const profit = revenue * (margin / 100);
    const cpl = budget / leads;
    const cac = budget / deals;
    
    return { traffic, leads, deals, revenue, profit, cpl, cac };
  }, [budget, cpc, cr, cr1, arpu, margin]);

  const scenarios = useMemo(() => {
    const calculateScenario = (name: string, chatOpenRate: number, chatLeadConversion: number, cr1Improvement: number, trafficIncrease: number) => {
      const newTraffic = Math.floor(baseMetrics.traffic * (1 + trafficIncrease / 100));
      const chatVisitors = Math.floor(newTraffic * (chatOpenRate / 100));
      const chatLeads = Math.floor(chatVisitors * (chatLeadConversion / 100));
      const oldLeads = baseMetrics.leads;
      const totalLeads = oldLeads + chatLeads;
      const improvedCR1 = cr1 * (1 + cr1Improvement / 100);
      const deals = Math.floor(totalLeads * (improvedCR1 / 100));
      const revenue = deals * arpu;
      const costs = budget + chatPrice;
      const profit = revenue * (margin / 100) - chatPrice;
      const cpl = budget / totalLeads;
      const cac = costs / deals;
      const additionalRevenue = revenue - baseMetrics.revenue;
      const additionalProfit = profit - baseMetrics.profit + chatPrice;
      const roi = ((additionalRevenue - chatPrice) / chatPrice) * 100;
      
      return {
        name, traffic: newTraffic, chatVisitors, chatLeads, totalLeads, deals, revenue,
        profit, cpl, cac, improvedCR1: improvedCR1.toFixed(1), additionalRevenue,
        additionalProfit, roi, costs, chatOpenRate, chatLeadConversion, cr1Improvement, trafficIncrease
      };
    };

    return {
      conservative: calculateScenario('Консервативный', 1.5, 68, 15, 0),
      realistic: calculateScenario('Реалистичный', 3, 75, 20, 20),
      optimistic: calculateScenario('Оптимистичный', 4, 85, 25, 40),
      transformation: calculateScenario('Трансформация', 4.5, 87, 30, 60)
    };
  }, [baseMetrics, budget, chatPrice, cr1, arpu, margin]);

  const monthlyData = useMemo(() => {
    const scenario = scenarios[activeScenario as keyof typeof scenarios];
    const months = [];
    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      months.push({
        month: `М${month}`,
        revenue: Math.floor((scenario.additionalRevenue * month) / 1000),
        profit: Math.floor((scenario.additionalProfit * month) / 1000),
        costs: Math.floor((chatPrice * month) / 1000)
      });
    }
    return months;
  }, [scenarios, activeScenario, chatPrice]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString('ru-RU');
  };

  const formatCurrency = (num: number) => `₽${formatNumber(num)}`;

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Лист 1: Исходные данные
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['КАЛЬКУЛЯТОР ROI AI-ЧАТА B24U'], [''], 
      ['Компания:', companyName], ['Сайт:', website], ['Дата расчёта:', currentDate], [''],
      ['ТЕКУЩИЕ МЕТРИКИ'], ['Рекламный бюджет (₽)', budget], ['CPC (₽)', cpc], 
      ['CR (%)', cr], ['CR1 (%)', cr1], ['ARPU (₽)', arpu], 
      ['Маржинальность (%)', margin], ['Стоимость чата (₽/мес)', chatPrice], [''],
      ['ТЕКУЩАЯ ВОРОНКА'], ['Трафик', ''], ['Лиды', ''], ['Сделки', ''], 
      ['Выручка (₽)', ''], ['Прибыль (₽)', '']
    ]);
    
    // Формулы
    ws1['B17'] = { f: 'B8/B9', t: 'n', z: '#,##0' };
    ws1['B18'] = { f: 'B17*B10/100', t: 'n', z: '#,##0' };
    ws1['B19'] = { f: 'B18*B11/100', t: 'n', z: '#,##0' };
    ws1['B20'] = { f: 'B19*B12', t: 'n', z: '#,##0' };
    ws1['B21'] = { f: 'B20*B13/100', t: 'n', z: '#,##0' };
    
    // Ширина колонок
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    
    // Объединение ячеек для заголовка
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Исходные данные');
    
    // Лист 2: Сценарии
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['СЦЕНАРИИ ВНЕДРЕНИЯ AI-ЧАТА B24U'], [''],
      ['Параметры', 'Консервативный', 'Реалистичный', 'Оптимистичный', 'Трансформация'],
      ['% открытия чата', 1.5, 3, 4, 4.5], ['% чат → лид', 68, 75, 85, 87],
      ['Улучшение CR1 (%)', 15, 20, 25, 30], ['Рост трафика (%)', 0, 20, 40, 60], [''],
      ['РАСЧЁТЫ'], ['Новый трафик', '', '', '', ''], ['Открыли чат', '', '', '', ''],
      ['Лиды из чата', '', '', '', ''], ['Всего лидов', '', '', '', ''],
      ['Новый CR1', '', '', '', ''], ['Сделки', '', '', '', ''],
      ['Выручка (₽)', '', '', '', ''], ['Прибыль (₽)', '', '', '', ''], [''],
      ['ЭФФЕКТ'], ['Доп. выручка/мес (₽)', '', '', '', ''],
      ['Доп. прибыль/мес (₽)', '', '', '', ''], ['ROI (%)', '', '', '', ''],
      ['Окупаемость (дней)', '', '', '', '']
    ]);
    
    // Формулы для всех сценариев
    ['B', 'C', 'D', 'E'].forEach((col) => {
      ws2[`${col}10`] = { f: `'Исходные данные'!B17*(1+${col}7/100)`, t: 'n', z: '#,##0' };
      ws2[`${col}11`] = { f: `${col}10*${col}4/100`, t: 'n', z: '#,##0' };
      ws2[`${col}12`] = { f: `${col}11*${col}5/100`, t: 'n', z: '#,##0' };
      ws2[`${col}13`] = { f: `'Исходные данные'!B18+${col}12`, t: 'n', z: '#,##0' };
      ws2[`${col}14`] = { f: `'Исходные данные'!B11*(1+${col}6/100)`, t: 'n', z: '0.0' };
      ws2[`${col}15`] = { f: `${col}13*${col}14/100`, t: 'n', z: '#,##0' };
      ws2[`${col}16`] = { f: `${col}15*'Исходные данные'!B12`, t: 'n', z: '#,##0' };
      ws2[`${col}17`] = { f: `${col}16*'Исходные данные'!B13/100-'Исходные данные'!B14`, t: 'n', z: '#,##0' };
      ws2[`${col}20`] = { f: `${col}16-'Исходные данные'!B20`, t: 'n', z: '#,##0' };
      ws2[`${col}21`] = { f: `${col}17-'Исходные данные'!B21+'Исходные данные'!B14`, t: 'n', z: '#,##0' };
      ws2[`${col}22`] = { f: `(${col}20-'Исходные данные'!B14)/'Исходные данные'!B14*100`, t: 'n', z: '0%' };
      ws2[`${col}23`] = { f: `30/(${col}21/'Исходные данные'!B14)`, t: 'n', z: '0' };
    });
    
    // Ширина колонок
    ws2['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    
    // Объединение заголовка
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Сценарии');
    
    // Лист 3: Прогноз
    const scenCol = activeScenario === 'conservative' ? 'B' : activeScenario === 'realistic' ? 'C' : activeScenario === 'optimistic' ? 'D' : 'E';
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['ПРОГНОЗ НА ГОД'], [`Сценарий: ${scenario.name}`], [''],
      ['Период', 'Доп. выручка (₽)', 'Доп. прибыль (₽)', 'Затраты на чат (₽)', 'ROI (%)'],
      ['1 месяц', '', '', '', ''], ['3 месяца', '', '', '', ''],
      ['6 месяцев', '', '', '', ''], ['12 месяцев', '', '', '', '']
    ]);
    
    // Формулы прогноза
    [1, 3, 6, 12].forEach((months, idx) => {
      const row = 5 + idx;
      ws3[`B${row}`] = { f: `Сценарии!${scenCol}20*${months}`, t: 'n', z: '#,##0' };
      ws3[`C${row}`] = { f: `Сценарии!${scenCol}21*${months}`, t: 'n', z: '#,##0' };
      ws3[`D${row}`] = { f: `'Исходные данные'!B14*${months}`, t: 'n', z: '#,##0' };
      ws3[`E${row}`] = { f: `(B${row}-D${row})/D${row}*100`, t: 'n', z: '0%' };
    });
    
    // Ширина колонок
    ws3['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
    
    XLSX.utils.book_append_sheet(wb, ws3, 'Прогноз');
    
    // Сохранение
    XLSX.writeFile(wb, `B24U_ROI_${companyName || 'расчет'}_${new Date().toISOString().split('T')[0]}.xlsx`, {
      bookType: 'xlsx',
      bookSST: false,
      type: 'binary'
    });
  };

  const scenario = scenarios[activeScenario as keyof typeof scenarios];

  return (
    <div className="min-h-screen bg-white text-black">
      <style jsx global>{`
        * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }}
        .border-fade { border: 1px solid #eaeaea; transition: border-color 0.2s ease; }
        .border-fade:hover, .border-fade:focus { border-color: #000; outline: none; }
        .btn { transition: all 0.2s ease; }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .card { border: 1px solid #eaeaea; transition: all 0.2s ease; cursor: pointer; }
        .card:hover { border-color: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .card.active { background: #000; color: #fff; border-color: #000; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-16 fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-black text-white text-sm font-medium rounded-full">B24U</div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight">Калькулятор ROI</h1>
          <p className="text-xl text-gray-600">Рассчитайте экономический эффект от внедрения AI-чата</p>
        </div>

        <div className="mb-8 p-8 border border-gray-200 rounded-lg fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-sm font-semibold">1</div>
            <h2 className="text-xl font-semibold">Информация о компании</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Название компании</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} 
                     placeholder="ООО «Ваша компания»" className="w-full px-4 py-2 border-fade rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Сайт</label>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} 
                     placeholder="example.com" className="w-full px-4 py-2 border-fade rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата расчёта</label>
              <input type="text" value={currentDate} disabled 
                     className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-sm" />
            </div>
          </div>
        </div>

        <div className="mb-8 p-8 border border-gray-200 rounded-lg fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-sm font-semibold">2</div>
            <h2 className="text-xl font-semibold">Текущие метрики бизнеса</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              ['Рекламный бюджет (₽/мес)', budget, setBudget, 'number'],
              ['CPC (₽)', cpc, setCpc, 'number'],
              ['CR - конверсия в лид (%)', cr, setCr, 'number', 0.1],
              ['CR1 - лид → сделка (%)', cr1, setCr1, 'number', 0.1],
              ['ARPU - средний чек (₽)', arpu, setArpu, 'number'],
              ['Маржинальность (%)', margin, setMargin, 'number', 0.1]
            ].map(([label, value, setter, type, step]: any) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <input type={type} value={value} onChange={(e) => setter(Number(e.target.value))} 
                       step={step} className="w-full px-4 py-2 border-fade rounded-md text-sm" />
              </div>
            ))}
          </div>

          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Ваша текущая воронка</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Трафик', baseMetrics.traffic],
                ['Лиды', baseMetrics.leads],
                ['Сделки', baseMetrics.deals],
                ['Выручка', formatCurrency(baseMetrics.revenue)]
              ].map(([label, value]) => (
                <div key={label as string} className="text-center">
                  <div className="text-3xl font-bold mb-1">{value}</div>
                  <div className="text-xs text-gray-600">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Стоимость AI-чата B24U (₽/мес)</label>
            <input type="number" value={chatPrice} onChange={(e) => setChatPrice(Number(e.target.value))} 
                   className="w-full md:w-64 px-4 py-2 border-fade rounded-md text-sm" />
          </div>
        </div>

        <div className="text-center mb-12">
          <button onClick={() => setShowResults(true)} 
                  className="btn px-8 py-3 bg-black text-white text-sm font-semibold rounded-md hover:bg-gray-900">
            Рассчитать эффект →
          </button>
        </div>

        {showResults && (
          <div className="fade-in space-y-8">
            <div className="p-8 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-sm font-semibold">3</div>
                <h2 className="text-xl font-semibold">Сценарии внедрения</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Object.keys(scenarios).map((key) => {
                  const s = scenarios[key as keyof typeof scenarios];
                  const isActive = activeScenario === key;
                  
                  return (
                    <div key={key} onClick={() => setActiveScenario(key)}
                         className={`card p-6 rounded-lg ${isActive ? 'active' : ''}`}>
                      <div className={`text-base font-semibold mb-3 ${isActive ? 'text-white' : 'text-black'}`}>{s.name}</div>
                      <div className={`text-xs mb-4 space-y-1 ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div>Чат открывают: {s.chatOpenRate}%</div>
                        <div>Чат → лид: {s.chatLeadConversion}%</div>
                        <div>Улучшение CR1: +{s.cr1Improvement}%</div>
                        <div>Рост трафика: +{s.trafficIncrease}%</div>
                      </div>
                      <div className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-black'}`}>
                        +{formatCurrency(s.additionalRevenue)}
                      </div>
                      <div className={`text-xs mt-1 ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>доп. выручка/мес</div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-6">Детальный анализ: {scenario.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    ['Трафик', scenario.traffic, `+${formatNumber(scenario.traffic - baseMetrics.traffic)}`],
                    ['Открыли чат', scenario.chatVisitors, `${scenario.chatOpenRate}% от трафика`],
                    ['Лиды из чата', scenario.chatLeads, `${scenario.chatLeadConversion}% конверсия`],
                    ['Всего лидов', scenario.totalLeads, `+${formatNumber(scenario.chatLeads)} новых`],
                    ['Сделки', scenario.deals, `+${formatNumber(scenario.deals - baseMetrics.deals)}`],
                    ['Выручка', formatCurrency(scenario.revenue), `+${formatCurrency(scenario.additionalRevenue)}`],
                    ['Прибыль', formatCurrency(scenario.profit), `+${formatCurrency(scenario.additionalProfit)}`],
                    ['ROI', `${Math.floor(scenario.roi)}%`, 'окупаемость', true]
                  ].map(([label, value, sub, isSpecial]) => (
                    <div key={label as string} 
                         className={`p-4 rounded-md ${isSpecial ? 'bg-black text-white' : 'bg-white border border-gray-200'}`}>
                      <div className={`text-xs mb-1 ${isSpecial ? 'opacity-90' : 'text-gray-600'}`}>{label}</div>
                      <div className={`text-2xl font-bold ${isSpecial ? 'text-3xl' : ''}`}>{value}</div>
                      <div className={`text-xs mt-1 ${isSpecial ? 'opacity-75' : 'text-gray-500'}`}>{sub}</div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-white rounded-md border border-gray-200">
                  <h4 className="font-semibold mb-4">📊 Как AI-чат улучшает метрики:</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    {[
                      [`Новый канал лидогенерации: ${scenario.chatOpenRate}% посетителей открывают чат благодаря проактивному взаимодействию. Из них ${scenario.chatLeadConversion}% конвертируются в лиды → +${formatNumber(scenario.chatLeads)} лидов в месяц`],
                      [`Улучшение качества лидов: AI-чат прогревает, квалифицирует и консультирует посетителей. Конверсия лид→сделка улучшается с ${cr1}% до ${scenario.improvedCR1}% (+${scenario.cr1Improvement}%)`],
                      [`Работа 24/7: Возможность включить рекламу в нерабочее время без потери лидов → +${scenario.trafficIncrease}% трафика`],
                      ['Экономия ресурсов: Меньше времени менеджеров на обработку лидов, возможность сократить операторов']
                    ].map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div dangerouslySetInnerHTML={{ __html: text[0].replace(/\+\d+/g, m => `<strong>${m}</strong>`) }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold mb-6">Прогноз на 12 месяцев</h2>
              <div className="p-6 bg-white rounded-md border border-gray-200 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Накопительная выручка и прибыль (тыс. ₽)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" />
                    <XAxis dataKey="month" stroke="#666" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #eaeaea', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2} name="Доп. выручка" />
                    <Line type="monotone" dataKey="profit" stroke="#666" strokeWidth={2} name="Доп. прибыль" />
                    <Line type="monotone" dataKey="costs" stroke="#ccc" strokeWidth={1} strokeDasharray="5 5" name="Затраты" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[[1, '1 месяц'], [3, '3 месяца'], [6, '6 месяцев'], [12, '12 месяцев']].map(([months, label]) => {
                  const revenue = scenario.additionalRevenue * (months as number);
                  const profit = scenario.additionalProfit * (months as number);
                  const costs = chatPrice * (months as number);
                  const roi = ((revenue - costs) / costs) * 100;
                  
                  return (
                    <div key={label as string} className="p-5 bg-white rounded-md border border-gray-200">
                      <div className="text-sm font-semibold text-gray-600 mb-3">{label}</div>
                      <div className="space-y-2 text-sm">
                        <div><div className="text-gray-600">Доп. выручка</div><div className="text-lg font-bold">{formatCurrency(revenue)}</div></div>
                        <div><div className="text-gray-600">Доп. прибыль</div><div className="text-lg font-bold">{formatCurrency(profit)}</div></div>
                        <div><div className="text-gray-600">Затраты</div><div className="text-sm text-gray-500">{formatCurrency(costs)}</div></div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-gray-600">ROI</div><div className="text-xl font-bold">{Math.floor(roi)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 border border-gray-200 rounded-lg bg-gray-50">
              <h2 className="text-xl font-semibold mb-6">⚠️ Упущенная выгода без AI-чата</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  ['😴', 'Вне рабочего времени', 'Потенциально ~30% трафика приходится на вечер/ночь/выходные', 
                   `~${formatCurrency(Math.floor(baseMetrics.revenue * 0.3))}`, 'теряется в месяц'],
                  ['🤷', 'Низкая конверсия', 'Посетители уходят не найдя ответа. Традиционные формы конвертируют в 10-15 раз хуже AI-чата',
                   `${formatNumber(scenario.chatLeads)} лидов`, 'теряется в месяц'],
                  ['💸', 'Неэффективные лиды', 'Без квалификации и прогрева лиды конвертируются на 15-30% хуже',
                   `${formatNumber(scenario.deals - baseMetrics.deals)} сделок`, 'теряется в месяц']
                ].map(([emoji, title, desc, value, sub]) => (
                  <div key={title as string} className="p-6 bg-white rounded-md border border-gray-200">
                    <div className="text-4xl mb-3">{emoji}</div>
                    <div className="text-base font-semibold mb-2">{title}</div>
                    <div className="text-sm text-gray-600 mb-3">{desc}</div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-gray-500 mt-1">{sub}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-6 bg-white rounded-md border border-gray-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Итого упущенная выгода в месяц</div>
                  <div className="text-4xl font-bold mb-2">{formatCurrency(scenario.additionalRevenue)}</div>
                  <div className="text-sm text-gray-500">За год это {formatCurrency(scenario.additionalRevenue * 12)}</div>
                </div>
              </div>
            </div>

            <div className="p-8 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold mb-6">📥 Экспорт расчётов</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={exportToExcel} 
                        className="btn px-8 py-4 bg-black text-white font-semibold rounded-md flex items-center justify-center gap-3">
                  <span className="text-xl">📊</span>Скачать Excel с формулами
                </button>
                <button onClick={() => alert('PDF экспорт будет доступен в следующей версии')} 
                        className="btn px-8 py-4 border-2 border-black text-black font-semibold rounded-md flex items-center justify-center gap-3 hover:bg-black hover:text-white">
                  <span className="text-xl">📄</span>Скачать PDF
                </button>
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="text-sm text-gray-700">
                  💡 <strong>Важно:</strong> Excel файл содержит все формулы и работает в Google Sheets — вы можете изменить любые параметры и модель автоматически пересчитает результаты
                </div>
              </div>
            </div>

            <div className="p-8 bg-black text-white rounded-lg text-center">
              <h2 className="text-3xl font-bold mb-4">Готовы внедрить AI-чат?</h2>
              <p className="text-lg mb-6 text-gray-300">Начните зарабатывать больше уже в первый месяц</p>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <a href="https://b24u.com" target="_blank" rel="noopener noreferrer" 
                   className="px-8 py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-100">
                  Узнать подробнее
                </a>
                <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-md hover:bg-white hover:text-black">
                  Связаться с нами
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-16 text-sm text-gray-500 border-t border-gray-200 pt-8">
          <p>© 2026 B24U.com — AI Chat Solutions</p>
          <p className="mt-2">Все расчёты основаны на реальной статистике по тысячам клиентов и миллионам диалогов</p>
        </div>
      </div>
    </div>
  );
}
