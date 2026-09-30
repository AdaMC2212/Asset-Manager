// Synthetic values with the row/column layout of the supplied Investment.xlsx.
exports.portfolioRows = () => {
  const rows = Array.from({ length: 32 }, () => []);
  rows[0] = [
    'Category', 'Ticker', 'Shares', 'Status', 'avg_buy_price', 'current_price',
    'PNL', 'Profit', 'total_value', 'allocation_pct', '', '',
    'Category', 'Symbol', 'No. of Shares', 'Status', 'Average Cost', 'Sell Price',
  ];
  rows[1] = ['ETF', 'VOO', 4, 'Active', 100, 125, 0.25, 100, 500, 500 / 660,
    '', '', 'Individual Stock', 'AAPL', 0, 'Closed', 100, 120];
  rows[2] = ['Individual Stock', 'NVDA', 2, 'Active', 100, 80, -0.2, -40, 160, 160 / 660];
  rows[21] = ['Cash', 40 / 700, '', '', '', 'Total Invested', '', 500, 'USD'];
  rows[22] = ['', '', '', '', '', '', '', 2000, 'MYR'];
  rows[24] = ['', '', '', '', '', 'Total Market Value', '', 660, 'USD'];
  rows[25] = ['', '', '', '', '', '', '', 2640, 'MYR'];
  rows[27] = ['', '', '', '', '', 'Total Cash', '', 40, 'USD'];
  rows[28] = ['', '', '', '', '', '', '', 160, 'MYR'];
  rows[30] = ['', '', '', '', '', 'Net Asset', '', 700, 'USD'];
  rows[31] = ['', '', '', '', '', '', '', 2800, 'MYR'];
  return rows;
};

exports.cashFlowRows = () => [
  ['Deposit', '', '', '', '', 'Currency Exchange', '', '', '', '', '', '', 'Dividend'],
  ['Date', 'Amount (MYR)', 'D/W', '', '', 'Date', 'MYR', 'USD', 'Rate', 'Flow', '', '', 'Date', 'Symbol', 'Amount'],
  ['2026-09-01', 1000, 'Deposit', 'Savings', '', '2026-09-02', 800, 200, 4, 'MYR to USD', '', '', '2026-09-02', 'VOO', 5],
  ['2026-09-03', 500, 'Deposit', '', '', '2026-09-04', 400, 100, 4, 'MYR to USD'],
  ['2026-09-05', 100, 'Withdrawal', '', '', '2026-09-06', 80, 20, 4, 'USD to MYR'],
];

exports.legacyCashFlowRows = () => [
  ['Date', 'Amount (MYR)', 'Reason', '', 'Date', 'MYR', 'USD', 'Rate'],
  ['2026-09-01', 1000, 'Savings', '', '2026-09-02', 800, 200, 4],
];
