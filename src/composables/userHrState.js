import { computed, reactive, watch } from 'vue'
import employeeInfoData from '../../employee_info.json'
import attendanceData from '../../attendance.json'
import payrollData from '../../payroll_data.json'

const STORAGE_KEY = 'moderntech-hr-poc-state-v2'
export const AUTH_USER = 'hr_admin'
export const AUTH_PASSWORD = 'MT2026!'

function parseStartDateFromHistory(employmentHistory) {
  const yearMatch = /Joined in\s+(\d{4})/i.exec(employmentHistory ?? '')
  if (!yearMatch) return '2020-01-01'
  return `${yearMatch[1]}-01-01`
}

const importedEmployees = (employeeInfoData.employeeInformation ?? []).map((employee) => ({
  id: employee.employeeId,
  name: employee.name,
  email: employee.contact,
  department: employee.department,
  role: employee.position,
  salary: Number(employee.salary) * 12,
  startDate: parseStartDateFromHistory(employee.employmentHistory),
  history: employee.employmentHistory
}))

const importedAttendance = (attendanceData.attendanceAndLeave ?? []).map((employeeRecord) => ({
  employeeId: employeeRecord.employeeId,
  present: employeeRecord.attendance.filter((entry) => entry.status === 'Present').length,
  remote: employeeRecord.attendance.filter((entry) => entry.status === 'Remote').length,
  absent: employeeRecord.attendance.filter((entry) => entry.status === 'Absent').length,
  leaveDays: employeeRecord.leaveRequests.filter((entry) => entry.status === 'Approved').length
}))

const importedLeaveRequests = []
let leaveRequestId = 1
for (const employeeRecord of attendanceData.attendanceAndLeave ?? []) {
  for (const leaveRequest of employeeRecord.leaveRequests ?? []) {
    importedLeaveRequests.push({
      id: leaveRequestId,
      employeeId: employeeRecord.employeeId,
      startDate: leaveRequest.date,
      endDate: leaveRequest.date,
      reason: leaveRequest.reason,
      status: leaveRequest.status
    })
    leaveRequestId += 1
  }
}

const importedPayrollSource = (payrollData.payrollData ?? []).map((payrollEntry) => ({
  employeeId: payrollEntry.employeeId,
  hoursWorked: payrollEntry.hoursWorked,
  leaveDeductions: payrollEntry.leaveDeductions,
  finalSalary: payrollEntry.finalSalary
}))

const importedPayslips = importedPayrollSource.map((payrollEntry, index) => ({
  id: Date.now() + index,
  month: 'Imported Dataset',
  employeeId: payrollEntry.employeeId,
  baseMonthly: payrollEntry.finalSalary,
  overtimeHours: Math.max(0, payrollEntry.hoursWorked - 160),
  overtimePay: Math.max(0, payrollEntry.hoursWorked - 160) * 180,
  taxDeduction: payrollEntry.finalSalary * 0.18,
  pensionDeduction: payrollEntry.finalSalary * 0.06,
  leaveDeductionAmount: payrollEntry.leaveDeductions * 180,
  netPay: payrollEntry.finalSalary - payrollEntry.finalSalary * 0.18 - payrollEntry.finalSalary * 0.06
}))

// This `state` object is defined OUTSIDE the exported function, at module
// scope, so every component that imports useHrState() shares the exact
// same object (a simple hand-rolled "store" — like Pinia, but free).
export const state = reactive({
  employees: importedEmployees,
  leaveRequests: importedLeaveRequests,
  attendance: importedAttendance,
  attendanceLogs: [],
  performanceReviews: [
    { id: 1, employeeId: importedEmployees[0]?.id ?? 1, period: 'Q2 2026', rating: 4.7, summary: 'Excellent delivery pace and mentoring impact.' },
    { id: 2, employeeId: importedEmployees[1]?.id ?? 2, period: 'Q2 2026', rating: 4.5, summary: 'High defect prevention score in sprint releases.' },
    { id: 3, employeeId: importedEmployees[2]?.id ?? 3, period: 'Q2 2026', rating: 4.2, summary: 'Improved ticket closure by 16 percent.' }
  ],
  payrollSource: importedPayrollSource,
  generatedPayslips: importedPayslips
})

export const employeeById = computed(() => {
  return Object.fromEntries(state.employees.map((employee) => [employee.id, employee]))
})

export const payrollSourceByEmployee = computed(() => {
  return Object.fromEntries(state.payrollSource.map((entry) => [entry.employeeId, entry]))
})

function bootstrapFromLocalStorage() {
  const savedState = localStorage.getItem(STORAGE_KEY)
  if (!savedState) return
  try {
    const parsed = JSON.parse(savedState)
    state.employees = parsed.employees ?? state.employees
    state.leaveRequests = parsed.leaveRequests ?? state.leaveRequests
    state.attendance = parsed.attendance ?? state.attendance
    state.attendanceLogs = parsed.attendanceLogs ?? state.attendanceLogs
    state.performanceReviews = parsed.performanceReviews ?? state.performanceReviews
    state.payrollSource = parsed.payrollSource ?? state.payrollSource
    state.generatedPayslips = parsed.generatedPayslips ?? state.generatedPayslips
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}
bootstrapFromLocalStorage()

export function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Automatically save to localStorage any time ANY part of state changes.
// This runs once, the moment this file is first imported by App.vue.
watch(state, persistState, { deep: true })

// ---- shared helper functions (formatting used by every module) ----
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}
export function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function formatTime(dateValue) {
  if (!dateValue) return 'In progress'
  return new Date(dateValue).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}
export function getDateRangeLength(startDate, endDate) {
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor((new Date(endDate) - new Date(startDate)) / oneDay) + 1
}

// Composable entry point — this is what every component calls.
export function useHrState() {
  return {
    state,
    employeeById,
    payrollSourceByEmployee,
    persistState,
    formatCurrency,
    formatDate,
    formatTime,
    getDateRangeLength
  }
}
