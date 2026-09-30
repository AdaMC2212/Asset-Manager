import { CashFlowSummary, Conversion, Deposit, Holding, PortfolioSummary } from '../types';

type SheetRows = unknown[][];

const text = (value: unknown) => String(value ?? '').trim();
const key = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const isBlank = (value: unknown) => value == null || text(value) === '';

const readNumber = (value: unknown, field: string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const cleaned = value.trim()
      .replace(/^\((.*)\)$/, '-$1')
      .replace(/(?:US\$|USD|MYR|RM|\$)/gi, '')
      .replace(/[,\s]/g, '');
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned)) {
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  throw new Error(`Missing or invalid investment value: ${field}`);
};

const readPercentage = (value: unknown, field: string) =>
  typeof value === 'string' && value.trim().endsWith('%')
    ? readNumber(value.trim().slice(0, -1), field)
    : readNumber(value, field) * 100;

const summaryValue = (rows: SheetRows, labels: string[]): number => {
  for (const row of rows) {
    const column = row.findIndex((cell) => labels.includes(key(cell)));
    if (column < 0) continue;
    // Summary labels may be merged; the value is the next populated cell.
    return readNumber(row.slice(column + 1).find((cell) => !isBlank(cell)), text(row[column]));
  }
  throw new Error(`Missing investment summary: ${labels[0]}`);
};

export const parsePortfolioRows = (rows: SheetRows): PortfolioSummary => {
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => ['ticker', 'symbol'].includes(key(cell))) &&
    row.some((cell) => key(cell) === 'currentprice'));
  if (headerIndex < 0) throw new Error('Portfolio column headers were not found.');
  const header = rows[headerIndex].map(key);
  const column = (...names: string[]) => {
    const index = header.findIndex((cell) => names.includes(cell));
    if (index < 0) throw new Error(`Missing Portfolio column: ${names[0]}`);
    return index;
  };
  const columns = {
    ticker: column('ticker', 'symbol'),
    quantity: column('shares', 'noofshares', 'quantity'),
    status: column('status'),
    avgCost: column('avgbuyprice', 'averagecost'),
    currentPrice: column('currentprice'),
    profit: column('profit'),
    currentValue: column('totalvalue'),
    category: header.indexOf('category'),
    percent: header.indexOf('pnl'),
  };
  const holdings: Holding[] = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (key(row[columns.status]) !== 'active') continue;
    const ticker = text(row[columns.ticker]).toUpperCase();
    if (!ticker || ticker.startsWith('#')) throw new Error(`Invalid Portfolio ticker on row ${rowIndex + 1}`);
    const quantity = readNumber(row[columns.quantity], `${ticker} shares`);
    const avgCost = readNumber(row[columns.avgCost], `${ticker} average cost`);
    const totalCost = quantity * avgCost;
    const unrealizedPL = readNumber(row[columns.profit], `${ticker} profit`);
    const category = key(row[columns.category]);
    holdings.push({
      ticker, quantity, avgCost, totalCost, unrealizedPL,
      currentPrice: readNumber(row[columns.currentPrice], `${ticker} current price`),
      currentValue: readNumber(row[columns.currentValue], `${ticker} total value`),
      unrealizedPLPercent: columns.percent >= 0
        ? readPercentage(row[columns.percent], `${ticker} PNL`)
        : totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0,
      allocation: 0,
      sector: 'Other',
      assetClass: category === 'etf' ? 'ETF'
        : ['individualstock', 'equity', 'stocks'].includes(category) ? 'Equity'
        : category === 'crypto' ? 'Crypto' : 'Other',
    });
  }

  const totalCost = summaryValue(rows, ['totalinvested']);
  const cashBalance = summaryValue(rows, ['totalcash', 'cashbalance']);
  const netWorth = summaryValue(rows, ['netasset']);
  const totalPL = netWorth - totalCost;
  holdings.forEach((holding) => {
    holding.allocation = netWorth > 0 ? (holding.currentValue / netWorth) * 100 : 0;
  });
  return {
    netWorth, totalCost, cashBalance, totalPL,
    totalPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
    holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
  };
};

export const getCashFlowLayout = (rows: SheetRows) => {
  for (let headerRow = 0; headerRow < rows.length; headerRow++) {
    const header = rows[headerRow].map(key);
    const depositDate = header.findIndex((cell, index) =>
      cell === 'date' && ['amountmyr', 'amount'].includes(header[index + 1]));
    const conversionDate = header.findIndex((cell, index) =>
      cell === 'date' && header[index + 1] === 'myr' &&
      header[index + 2] === 'usd' && header[index + 3] === 'rate');
    if (depositDate < 0 || conversionDate < 0) continue;
    const depositType = header[depositDate + 2] === 'dw' ? depositDate + 2 : -1;
    return {
      headerRow,
      deposit: {
        date: depositDate, amount: depositDate + 1, type: depositType,
        reason: depositDate + (depositType >= 0 ? 3 : 2),
      },
      conversion: {
        date: conversionDate, myr: conversionDate + 1, usd: conversionDate + 2,
        rate: conversionDate + 3,
        flow: header[conversionDate + 4] === 'flow' ? conversionDate + 4 : -1,
      },
    };
  }
  throw new Error('Cash Flow deposit and currency exchange headers were not found.');
};

export const parseCashFlowRows = (rows: SheetRows): CashFlowSummary => {
  const { headerRow, deposit, conversion } = getCashFlowLayout(rows);
  const deposits: Deposit[] = [];
  const conversions: Conversion[] = [];
  for (const row of rows.slice(headerRow + 1)) {
    if (!isBlank(row[deposit.date])) {
      const type = key(row[deposit.type]);
      if (deposit.type >= 0 && !['deposit', 'withdrawal'].includes(type)) {
        throw new Error('Missing or invalid Cash Flow deposit/withdrawal type.');
      }
      const amount = readNumber(row[deposit.amount], 'deposit amount');
      deposits.push({
        date: text(row[deposit.date]),
        amountMYR: type === 'withdrawal' ? -Math.abs(amount) : amount,
        reason: text(row[deposit.reason]) || text(row[deposit.type]),
      });
    }
    if (!isBlank(row[conversion.date])) {
      const flow = key(row[conversion.flow]);
      if (conversion.flow >= 0 && !['myrtousd', 'usdtomyr'].includes(flow)) {
        throw new Error('Missing or invalid Cash Flow conversion direction.');
      }
      const myr = readNumber(row[conversion.myr], 'conversion MYR');
      const usd = readNumber(row[conversion.usd], 'conversion USD');
      conversions.push({
        date: text(row[conversion.date]),
        amountMYR: flow === 'usdtomyr' ? -Math.abs(myr) : myr,
        amountUSD: flow === 'usdtomyr' ? -Math.abs(usd) : usd,
        rate: readNumber(row[conversion.rate], 'conversion rate'),
      });
    }
  }
  const totalDepositedMYR = deposits.reduce((sum, row) => sum + row.amountMYR, 0);
  const totalConvertedMYR = conversions.reduce((sum, row) => sum + row.amountMYR, 0);
  const totalConvertedUSD = conversions.reduce((sum, row) => sum + row.amountUSD, 0);
  return {
    totalDepositedMYR, totalConvertedMYR, totalConvertedUSD,
    avgRate: totalConvertedUSD > 0 ? totalConvertedMYR / totalConvertedUSD : 0,
    deposits: deposits.reverse(),
    conversions: conversions.reverse(),
  };
};

const columnName = (index: number): string => {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name;
  }
  return name;
};

export const cashFlowAppendRange = (headerRow: number, start: number, end: number) =>
  `${columnName(start)}${headerRow + 1}:${columnName(end)}`;
