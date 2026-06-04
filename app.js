const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const colors = {
  Food: "#18815b",
  Transport: "#2457d6",
  Housing: "#c78410",
  Utilities: "#7b4fb5",
  Health: "#c83f3f",
  Shopping: "#0f7d88",
  Entertainment: "#d15f21",
  Other: "#64707d",
};

const storageKey = "expense-calculator-items";
const budgetKey = "expense-calculator-budget";

const form = document.querySelector("#expenseForm");
const editingId = document.querySelector("#editingId");
const description = document.querySelector("#description");
const amount = document.querySelector("#amount");
const date = document.querySelector("#date");
const category = document.querySelector("#category");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const budget = document.querySelector("#budget");
const monthFilter = document.querySelector("#monthFilter");
const categoryFilter = document.querySelector("#categoryFilter");
const searchInput = document.querySelector("#searchInput");
const expenseRows = document.querySelector("#expenseRows");
const emptyState = document.querySelector("#emptyState");
const chart = document.querySelector("#chart");
const calculatorExpression = document.querySelector("#calculatorExpression");
const calculatorResult = document.querySelector("#calculatorResult");
const calculatorButtons = document.querySelectorAll("[data-calc-value], [data-calc-action]");
const useCalculatorResult = document.querySelector("#useCalculatorResult");

let expenses = JSON.parse(localStorage.getItem(storageKey) || "[]");
let calculatorValue = "";
let calculatorTotal = 0;

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonth() {
  return today().slice(0, 7);
}

function saveExpenses() {
  localStorage.setItem(storageKey, JSON.stringify(expenses));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisibleExpenses() {
  const selectedMonth = monthFilter.value;
  const selectedCategory = categoryFilter.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  return expenses
    .filter((expense) => expense.date.startsWith(selectedMonth))
    .filter((expense) => selectedCategory === "All" || expense.category === selectedCategory)
    .filter((expense) => expense.description.toLowerCase().includes(searchTerm))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function totalFor(items) {
  return items.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function evaluateCalculator() {
  if (!calculatorValue) {
    calculatorTotal = 0;
    return;
  }

  const expression = calculatorValue.replaceAll("%", "/100");
  if (!/^[\d+\-*/.() /]+$/.test(expression)) {
    return;
  }

  try {
    const result = Function(`"use strict"; return (${expression})`)();
    calculatorTotal = Number.isFinite(result) ? result : 0;
  } catch {
    calculatorTotal = 0;
  }
}

function renderCalculator() {
  calculatorExpression.textContent = calculatorValue || "0";
  calculatorResult.textContent = currency.format(calculatorTotal);
}

function addCalculatorInput(value) {
  const last = calculatorValue.at(-1);
  const operators = ["+", "-", "*", "/", "%"];

  if (operators.includes(value) && operators.includes(last)) {
    calculatorValue = calculatorValue.slice(0, -1) + value;
  } else {
    calculatorValue += value;
  }

  evaluateCalculator();
  renderCalculator();
}

function renderSummary(visibleExpenses) {
  const total = totalFor(visibleExpenses);
  const monthlyBudget = Number(budget.value || 0);
  const largest = visibleExpenses.reduce((max, expense) => Math.max(max, Number(expense.amount)), 0);
  const daysInMonth = new Date(`${monthFilter.value}-01`);
  const monthLength = new Date(daysInMonth.getFullYear(), daysInMonth.getMonth() + 1, 0).getDate();
  const average = total / monthLength;
  const left = monthlyBudget - total;

  document.querySelector("#totalSpent").textContent = currency.format(total);
  document.querySelector("#budgetLeft").textContent = monthlyBudget ? currency.format(left) : currency.format(0);
  document.querySelector("#largestExpense").textContent = currency.format(largest);
  document.querySelector("#dailyAverage").textContent = currency.format(average);
  document.querySelector("#expenseCount").textContent = `${visibleExpenses.length} expense${visibleExpenses.length === 1 ? "" : "s"}`;

  const progress = monthlyBudget ? Math.min((total / monthlyBudget) * 100, 100) : 0;
  const progressBar = document.querySelector("#budgetProgress");
  progressBar.style.width = `${progress}%`;
  progressBar.style.background = progress > 90 ? "var(--red)" : progress > 70 ? "var(--yellow)" : "var(--green)";

  const budgetStatus = document.querySelector("#budgetStatus");
  if (!monthlyBudget) {
    budgetStatus.textContent = "Set a budget to track your month.";
  } else if (left >= 0) {
    budgetStatus.textContent = `${currency.format(left)} left from ${currency.format(monthlyBudget)}.`;
  } else {
    budgetStatus.textContent = `${currency.format(Math.abs(left))} over budget.`;
  }
}

function renderChart(visibleExpenses) {
  const categoryTotals = visibleExpenses.reduce((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount);
    return totals;
  }, {});
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  chart.innerHTML = "";

  if (!entries.length) {
    chart.innerHTML = '<p class="empty-state">Category totals appear here after you add expenses.</p>';
    return;
  }

  entries.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-label">${name}</span>
      <span class="bar-track"><span class="bar-fill" style="width: ${(value / max) * 100}%; background: ${colors[name]}"></span></span>
      <span class="bar-amount">${currency.format(value)}</span>
    `;
    chart.appendChild(row);
  });
}

function renderRows(visibleExpenses) {
  expenseRows.innerHTML = "";
  emptyState.style.display = visibleExpenses.length ? "none" : "block";

  visibleExpenses.forEach((expense) => {
    const row = document.createElement("tr");
    const descriptionCell = document.createElement("td");
    const categoryCell = document.createElement("td");
    const dateCell = document.createElement("td");
    const amountCell = document.createElement("td");
    const actionCell = document.createElement("td");
    const pill = document.createElement("span");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    descriptionCell.textContent = expense.description;
    pill.className = "pill";
    pill.textContent = expense.category;
    categoryCell.appendChild(pill);
    dateCell.textContent = expense.date;
    amountCell.className = "amount-cell";
    amountCell.textContent = currency.format(expense.amount);
    actionCell.className = "action-cell";
    actions.className = "row-actions";

    editButton.className = "small-button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = expense.id;
    editButton.type = "button";
    editButton.title = "Edit";
    editButton.textContent = "Edit";

    deleteButton.className = "small-button delete";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = expense.id;
    deleteButton.type = "button";
    deleteButton.title = "Delete";
    deleteButton.textContent = "Del";

    actions.append(editButton, deleteButton);
    actionCell.appendChild(actions);
    row.append(descriptionCell, categoryCell, dateCell, amountCell, actionCell);
    expenseRows.appendChild(row);
  });
}

function render() {
  const visibleExpenses = getVisibleExpenses();
  renderSummary(visibleExpenses);
  renderChart(visibleExpenses);
  renderRows(visibleExpenses);
}

function resetForm() {
  editingId.value = "";
  form.reset();
  date.value = today();
  submitButton.textContent = "Add expense";
  cancelEditButton.classList.add("hidden");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: editingId.value || createId(),
    description: description.value.trim(),
    amount: Number(amount.value),
    date: date.value,
    category: category.value,
  };

  if (editingId.value) {
    expenses = expenses.map((expense) => (expense.id === editingId.value ? payload : expense));
  } else {
    expenses.push(payload);
  }

  saveExpenses();
  resetForm();
  render();
});

expenseRows.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const expense = expenses.find((item) => item.id === button.dataset.id);
  if (!expense) return;

  if (button.dataset.action === "delete") {
    expenses = expenses.filter((item) => item.id !== expense.id);
    saveExpenses();
    render();
    return;
  }

  editingId.value = expense.id;
  description.value = expense.description;
  amount.value = expense.amount;
  date.value = expense.date;
  category.value = expense.category;
  submitButton.textContent = "Save changes";
  cancelEditButton.classList.remove("hidden");
  description.focus();
});

cancelEditButton.addEventListener("click", resetForm);

budget.addEventListener("input", () => {
  localStorage.setItem(budgetKey, budget.value);
  render();
});

[monthFilter, categoryFilter, searchInput].forEach((element) => {
  element.addEventListener("input", render);
});

calculatorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.calcValue) {
      addCalculatorInput(button.dataset.calcValue);
      return;
    }

    if (button.dataset.calcAction === "clear") {
      calculatorValue = "";
      calculatorTotal = 0;
    }

    if (button.dataset.calcAction === "backspace") {
      calculatorValue = calculatorValue.slice(0, -1);
      evaluateCalculator();
    }

    if (button.dataset.calcAction === "equals") {
      evaluateCalculator();
    }

    renderCalculator();
  });
});

useCalculatorResult.addEventListener("click", () => {
  amount.value = calculatorTotal ? calculatorTotal.toFixed(2) : "";
  amount.focus();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  if (!expenses.length) return;
  const confirmed = confirm("Clear all saved expenses?");
  if (!confirmed) return;
  expenses = [];
  saveExpenses();
  resetForm();
  render();
});

document.querySelector("#exportButton").addEventListener("click", () => {
  const rows = getVisibleExpenses();
  const header = ["Description", "Category", "Date", "Amount (INR)"];
  const csvRows = rows.map((expense) => [
    expense.description,
    expense.category,
    expense.date,
    expense.amount,
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expenses-${monthFilter.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

monthFilter.value = currentMonth();
date.value = today();
budget.value = localStorage.getItem(budgetKey) || "";

renderCalculator();
render();
