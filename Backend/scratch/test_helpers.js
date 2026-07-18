const OPEN_INVOICE_STATUSES = new Set(['draft', 'sent', 'overdue', 'pending']);

const MOCK_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV-20260322-738",
    clientName: "debo",
    clientEmail: "debo@example.com",
    amount: 299.99,
    currency: "GBP",
    dueDate: "2026-04-02",
    issueDate: "2026-03-22",
    status: "Sent",
    isSeeded: true
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-20260325-891",
    clientName: "arafat",
    clientEmail: "arafat@example.com",
    amount: 450.00,
    currency: "USD",
    dueDate: "2026-03-25",
    issueDate: "2026-03-25",
    status: "Sent",
    isSeeded: false
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-20260326-793",
    clientName: "jide",
    clientEmail: "jide@example.com",
    amount: 224.95,
    currency: "USD",
    dueDate: "2026-03-26",
    issueDate: "2026-03-26",
    status: "Sent",
    isSeeded: false
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-20260325-496",
    clientName: "tolu",
    clientEmail: "tolu@example.com",
    amount: 200.01,
    currency: "USD",
    dueDate: "2026-03-25",
    issueDate: "2026-03-25",
    status: "Sent",
    isSeeded: false
  },
  {
    id: "inv-5",
    invoiceNumber: "INV-20260325-793",
    clientName: "tosin",
    clientEmail: "tosin@example.com",
    amount: 158.00,
    currency: "USD",
    dueDate: "2026-03-25",
    issueDate: "2026-03-25",
    status: "Sent",
    isSeeded: false
  },
  {
    id: "inv-6",
    invoiceNumber: "INV-20260325-433",
    clientName: "arafat",
    clientEmail: "arafat@example.com",
    amount: 135.00,
    currency: "USD",
    dueDate: "2026-03-25",
    issueDate: "2026-03-25",
    status: "Sent",
    isSeeded: false
  },
  {
    id: "inv-7",
    invoiceNumber: "INV-20260401-999",
    clientName: "MR SAM",
    clientEmail: "sam@example.com",
    amount: 1200.00,
    currency: "USD",
    dueDate: "2026-04-01",
    issueDate: "2026-04-01",
    status: "Sent",
    isSeeded: false
  }
];

function formatCurrency(value, currency) {
  if (value === undefined || value === null) {
    return '---';
  }
  const symbolMap = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
  };
  const sym = symbolMap[currency.toUpperCase()] || currency;
  return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInvoiceDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntilDue(value) {
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  const normalizedDue = new Date(dueDate);
  const normalizedToday = new Date(today);
  normalizedDue.setHours(0, 0, 0, 0);
  normalizedToday.setHours(0, 0, 0, 0);

  return Math.ceil((normalizedDue.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24));
}

function getInvoicePriorityRank(invoice) {
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  if (daysUntilDue === null) {
    return 4;
  }
  if (daysUntilDue < 0) {
    return 0;
  }
  if (daysUntilDue === 0) {
    return 1;
  }
  if (daysUntilDue <= 7) {
    return 2;
  }
  return 3;
}

function compareOpenInvoices(left, right) {
  const leftRank = getInvoicePriorityRank(left);
  const rightRank = getInvoicePriorityRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftDays = getDaysUntilDue(left.dueDate);
  const rightDays = getDaysUntilDue(right.dueDate);
  if (leftDays !== rightDays) {
    if (leftDays === null) {
      return 1;
    }
    if (rightDays === null) {
      return -1;
    }
    return leftDays - rightDays;
  }

  return right.amount - left.amount;
}

function getInvoiceSummary(invoices) {
  const openInvoices = invoices
    .filter((invoice) => OPEN_INVOICE_STATUSES.has(invoice.status.toLowerCase()))
    .sort(compareOpenInvoices);

  const dueTodayCount = openInvoices.filter((invoice) => getDaysUntilDue(invoice.dueDate) === 0).length;
  const dueSoonCount = openInvoices.filter((invoice) => {
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  }).length;

  const largestOpenInvoice = openInvoices.reduce((largest, invoice) => {
    if (!largest || invoice.amount > largest.amount) {
      return invoice;
    }
    return largest;
  }, null);

  return {
    totalCount: invoices.length,
    openCount: openInvoices.length,
    overdueCount: openInvoices.filter((invoice) => {
      const daysUntilDue = getDaysUntilDue(invoice.dueDate);
      return daysUntilDue !== null && daysUntilDue < 0;
    }).length,
    dueTodayCount,
    dueSoonCount,
    currencyCount: new Set(openInvoices.map((invoice) => invoice.currency.toUpperCase())).size,
    largestOpenInvoice,
    priorityInvoice: openInvoices[0] ?? null,
    settlementQueue: openInvoices.slice(0, 6),
  };
}

try {
  console.log("Running mock invoices analysis...");
  const summary = getInvoiceSummary(MOCK_INVOICES);
  console.log("Summary:", JSON.stringify(summary, null, 2));
  console.log("debo formatted amount:", formatCurrency(summary.priorityInvoice.amount, summary.priorityInvoice.currency));
  console.log("debo formatted date:", formatInvoiceDate(summary.priorityInvoice.issueDate));
  console.log("Success! All functions executed without throwing error.");
} catch (e) {
  console.error("Crash found:", e);
}
