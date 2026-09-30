const clone = (value) => structuredClone(value);
const columnIndex = (letters) => [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;

class FakeSheets {
  constructor() {
    this.tables = {
      MM_Accounts: [
        ['Name', 'Category', 'Logo', 'Initial', 'Current', 'Billing Day'],
        ['Bank', 'Bank', '', 1000, 1000],
        ['Card', 'Credit Card', '', 0, -100, 15],
      ],
      MM_Transactions: [['Date', 'Type', 'Category', 'Amount']],
      MM_Categories: [['Expense', 'Income'], ['Bills', 'Salary']],
      MM_AutoDebits: [['Rule ID', 'Name']],
      Portfolio: [['Portfolio']],
      'Cash Flow': [['Date', 'Amount']],
      Transaction: [['Date', 'Ticker']],
    };
    this.calls = [];
    this.failRead = false;
    this.failBatch = false;
    this.loseBatchResponse = false;
    this.spreadsheets = {
      get: async () => ({ data: { sheets: Object.keys(this.tables).map((title, sheetId) => ({ properties: { title, sheetId } })) } }),
      batchUpdate: async (request) => {
        this.calls.push({ type: 'batch', request: clone(request) });
        if (this.failBatch) throw new Error('Injected atomic batch failure');
        const next = clone(this.tables);
        for (const item of request.requestBody.requests) {
          if (item.addSheet) {
            next[item.addSheet.properties.title] = [];
            continue;
          }
          const body = item.updateCells || item.appendCells;
          const sheetId = body.sheetId ?? body.start.sheetId;
          const name = Object.keys(next)[sheetId];
          const rowIndex = item.appendCells ? next[name].length : body.start.rowIndex;
          const startColumn = body.start?.columnIndex || 0;
          body.rows.forEach((row, offset) => {
            const target = next[name][rowIndex + offset] ||= [];
            row.values.forEach((cell, index) => {
              let value = cell.userEnteredValue?.stringValue ?? cell.userEnteredValue?.numberValue ?? '';
              if (cell.userEnteredFormat?.numberFormat?.type === 'DATE') {
                value = new Date((value - 25569) * 86400000).toISOString().slice(0, 10);
              }
              target[startColumn + index] = value;
            });
          });
        }
        this.tables = next;
        if (this.loseBatchResponse) throw new Error('Injected response loss after commit');
        return { data: {} };
      },
      values: {
        get: async ({ range }) => {
          if (this.failRead) throw new Error('Injected Sheets read failure');
          const { name, start, end, first, last } = this.parseRange(range);
          return { data: { values: clone(this.tables[name].slice(first, last + 1).map((row) => row.slice(start, end + 1))) } };
        },
        update: async (request) => {
          this.calls.push({ type: 'update', request: clone(request) });
          const { name, start, first } = this.parseRange(request.range);
          request.requestBody.values.forEach((row, index) => {
            const target = this.tables[name][first + index] ||= [];
            row.forEach((value, column) => { target[start + column] = value; });
          });
          return { data: {} };
        },
        append: async (request) => {
          this.calls.push({ type: 'append', request: clone(request) });
          const { name } = this.parseRange(request.range);
          // Yield so concurrent requests would observe the same snapshot without the lock.
          await new Promise((resolve) => setImmediate(resolve));
          this.tables[name].push(...clone(request.requestBody.values));
          return { data: {} };
        },
        clear: async (request) => {
          this.calls.push({ type: 'clear', request: clone(request) });
          const { name, start, end, first, last } = this.parseRange(request.range);
          for (let index = first; index <= last; index++) {
            const target = this.tables[name][index] ||= [];
            for (let column = start; column <= end; column++) target[column] = '';
          }
          return { data: {} };
        },
      },
    };
  }

  parseRange(range) {
    const [name, cells] = range.split('!');
    const match = /^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/.exec(cells);
    if (!match || !this.tables[name]) throw new Error(`Unexpected test range: ${range}`);
    return {
      name,
      start: columnIndex(match[1]),
      end: columnIndex(match[3] || match[1]),
      first: match[2] ? Number(match[2]) - 1 : 0,
      last: match[4] ? Number(match[4]) - 1 : match[2] && !match[3] ? Number(match[2]) - 1 : this.tables[name].length - 1,
    };
  }
}

exports.FakeSheets = FakeSheets;
