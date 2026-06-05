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

const usersKey = "expense-calculator-users";
const sessionKey = "expense-calculator-session";
const legacyStorageKey = "expense-calculator-items";
const legacyBudgetKey = "expense-calculator-budget";

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
const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector(".app-shell");
const authForm = document.querySelector("#authForm");
const signInTab = document.querySelector("#signInTab");
const signUpTab = document.querySelector("#signUpTab");
const nameField = document.querySelector("#nameField");
const authName = document.querySelector("#authName");
const authPhone = document.querySelector("#authPhone");
const authPassword = document.querySelector("#authPassword");
const confirmPasswordField = document.querySelector("#confirmPasswordField");
const authConfirmPassword = document.querySelector("#authConfirmPassword");
const authSubmit = document.querySelector("#authSubmit");
const authMessage = document.querySelector("#authMessage");
const logoutButton = document.querySelector("#logoutButton");
const userGreeting = document.querySelector("#userGreeting");
const phoneTypeBtn = document.querySelector("#phoneTypeBtn");
const emailTypeBtn = document.querySelector("#emailTypeBtn");
const phoneField = document.querySelector("#phoneField");
const emailField = document.querySelector("#emailField");
const authEmail = document.querySelector("#authEmail");

let users = JSON.parse(localStorage.getItem(usersKey) || "{}");
let currentUser = localStorage.getItem(sessionKey) || "";
let authMode = "signin";
let loginType = "phone";
let expenses = [];
let calculatorValue = "";
let calculatorTotal = 0;

function userStorageKey(phone, type) {
  return `expense-calculator-${phone}-${type}`;
}

function expenseStorageKey() {
  return userStorageKey(currentUser, "items");
}

function budgetStorageKey() {
  return userStorageKey(currentUser, "budget");
}

function saveUsers() {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function normalizePhone(value) {
  return value.replace(/\D/g, "").slice(-10);
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 6;
}

async function hashPassword(password) {
  if (!crypto.subtle) {
    return `plain:${password}`;
  }

  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setAuthMessage(message, tone = "info") {
  authMessage.textContent = message;
  authMessage.dataset.tone = tone;
}

function setAuthMode(mode) {
  authMode = mode;
  signInTab.classList.toggle("active", mode === "signin");
  signUpTab.classList.toggle("active", mode === "signup");
  nameField.classList.toggle("hidden", mode !== "signup");
  confirmPasswordField.classList.toggle("hidden", mode !== "signup");
  authName.required = mode === "signup";
  authConfirmPassword.required = mode === "signup";
  authPassword.autocomplete = mode === "signin" ? "current-password" : "new-password";
  authSubmit.textContent = mode === "signin" ? "Sign in" : "Create account";
  authForm.reset();
  updateAuthMessage();
}

function updateAuthMessage() {
  if (authMode === "signin") {
    setAuthMessage(
      loginType === "phone"
        ? "Enter your mobile number and password."
        : "Enter your email address and password."
    );
  } else {
    setAuthMessage(
      loginType === "phone"
        ? "Create your account with a mobile number and password."
        : "Create your account with an email address and password."
    );
  }
}

function setLoginType(type) {
  loginType = type;
  phoneTypeBtn.classList.toggle("active", type === "phone");
  emailTypeBtn.classList.toggle("active", type === "email");
  phoneField.classList.toggle("hidden", type !== "phone");
  emailField.classList.toggle("hidden", type !== "email");
  
  authPhone.required = type === "phone";
  authEmail.required = type === "email";
  
  if (type === "phone") {
    authPhone.focus();
  } else {
    authEmail.focus();
  }
  
  updateAuthMessage();
}

function loadUserData() {
  expenses = JSON.parse(localStorage.getItem(expenseStorageKey()) || "[]");
  budget.value = localStorage.getItem(budgetStorageKey()) || "";
}

function migrateLegacyData(phone) {
  const hasUserExpenses = localStorage.getItem(userStorageKey(phone, "items"));
  const legacyExpenses = localStorage.getItem(legacyStorageKey);
  const legacyBudget = localStorage.getItem(legacyBudgetKey);

  if (!hasUserExpenses && legacyExpenses) {
    localStorage.setItem(userStorageKey(phone, "items"), legacyExpenses);
  }

  if (!localStorage.getItem(userStorageKey(phone, "budget")) && legacyBudget) {
    localStorage.setItem(userStorageKey(phone, "budget"), legacyBudget);
  }
}

function showApp() {
  const user = users[currentUser];
  authScreen.classList.add("hidden");
  appShell.classList.remove("locked");
  userGreeting.textContent = user ? `Welcome, ${user.name}` : "";
  loadUserData();
  resetForm();
  renderCalculator();
  render();
}

function showAuth() {
  appShell.classList.add("locked");
  authScreen.classList.remove("hidden");
  currentUser = "";
  expenses = [];
  localStorage.removeItem(sessionKey);
  setAuthMode("signin");
}

function completeLogin(phone) {
  currentUser = phone;
  localStorage.setItem(sessionKey, phone);
  showApp();
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonth() {
  return today().slice(0, 7);
}

function saveExpenses() {
  localStorage.setItem(expenseStorageKey(), JSON.stringify(expenses));
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
  localStorage.setItem(budgetStorageKey(), budget.value);
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

signInTab.addEventListener("click", () => setAuthMode("signin"));
signUpTab.addEventListener("click", () => setAuthMode("signup"));
phoneTypeBtn.addEventListener("click", () => setLoginType("phone"));
emailTypeBtn.addEventListener("click", () => setLoginType("email"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = authName.value.trim() || "User";
  const password = authPassword.value;
  const confirmPassword = authConfirmPassword.value;

  let identifier = "";
  if (loginType === "phone") {
    const phone = normalizePhone(authPhone.value);
    if (!isValidPhone(phone)) {
      setAuthMessage("Please enter a valid 10 digit Indian mobile number.", "error");
      authPhone.focus();
      return;
    }
    identifier = phone;
  } else {
    const email = authEmail.value.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setAuthMessage("Please enter a valid email address.", "error");
      authEmail.focus();
      return;
    }
    identifier = email;
  }

  if (!isValidPassword(password)) {
    setAuthMessage("Password must be at least 6 characters.", "error");
    authPassword.focus();
    return;
  }

  if (authMode === "signin") {
    const user = users[identifier];

    if (!user) {
      setAuthMessage(
        loginType === "phone"
          ? "This number is not registered. Please sign up first."
          : "This email is not registered. Please sign up first.",
        "error"
      );
      return;
    }

    if (!user.passwordHash) {
      setAuthMessage("This account needs a password. Please sign up again to set it.", "error");
      return;
    }

    if ((await hashPassword(password)) !== user.passwordHash) {
      setAuthMessage(
        loginType === "phone"
          ? "Incorrect mobile number or password."
          : "Incorrect email address or password.",
        "error"
      );
      authPassword.focus();
      return;
    }

    completeLogin(identifier);
    return;
  }

  if (authMode === "signup" && users[identifier]?.passwordHash) {
    setAuthMessage(
      loginType === "phone"
        ? "This number already has an account. Please sign in."
        : "This email already has an account. Please sign in.",
      "error"
    );
    return;
  }

  if (name.length < 2) {
    setAuthMessage("Please enter your full name to create the account.", "error");
    authName.focus();
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage("Passwords do not match.", "error");
    authConfirmPassword.focus();
    return;
  }

  users[identifier] = {
    name,
    phone: loginType === "phone" ? identifier : "",
    email: loginType === "email" ? identifier : "",
    passwordHash: await hashPassword(password),
    createdAt: users[identifier]?.createdAt || new Date().toISOString(),
  };
  saveUsers();
  migrateLegacyData(identifier);

  completeLogin(identifier);
});

logoutButton.addEventListener("click", () => {
  showAuth();
  setAuthMessage("You have logged out.");
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

if (currentUser && users[currentUser]?.passwordHash) {
  showApp();
} else {
  showAuth();
}
