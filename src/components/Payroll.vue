<!--
  =========================================================================
  OWNED BY: PERSON C (Payroll Lead)
  Payroll source data + digital payslip generation.
  =========================================================================
-->
<script setup>
import { computed, ref } from 'vue'
import { useHrState } from '../composables/useHrState.js'

const { state, employeeById, payrollSourceByEmployee, formatCurrency } = useHrState()

const selectedPayrollEmployeeId = ref(state.employees[0]?.id ?? 1)
const selectedPayrollMonth = ref('June 2026')

const selectedPayrollEmployee = computed(() => employeeById.value[selectedPayrollEmployeeId.value])

function generatePayslip() {
  const employee = selectedPayrollEmployee.value
  if (!employee) return

  const attendanceRecord = state.attendance.find((record) => record.employeeId === employee.id)
  const payrollBaseline = payrollSourceByEmployee.value[employee.id]

  const overtimeHours = Math.max(
    0,
    payrollBaseline?.hoursWorked ? payrollBaseline.hoursWorked - 160 : (attendanceRecord?.remote ?? 0) * 2
  )

  const baseMonthly = payrollBaseline?.finalSalary ?? employee.salary / 12
  const overtimePay = overtimeHours * 180
  const taxDeduction = (baseMonthly + overtimePay) * 0.18
  const pensionDeduction = baseMonthly * 0.06
  const leaveDeductionAmount = (payrollBaseline?.leaveDeductions ?? 0) * 180
  const netPay = baseMonthly + overtimePay - taxDeduction - pensionDeduction - leaveDeductionAmount

  state.generatedPayslips.unshift({
    id: Date.now(),
    month: selectedPayrollMonth.value,
    employeeId: employee.id,
    baseMonthly,
    overtimeHours,
    overtimePay,
    taxDeduction,
    pensionDeduction,
    leaveDeductionAmount,
    netPay
  })
}
</script>

<template>
  <section class="row g-3 g-lg-4">
    <div class="col-12 col-lg-5">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Automated Payroll</h3>
        <form @submit.prevent="generatePayslip" class="row g-3">
          <div class="col-12">
            <label class="form-label">Employee</label>
            <select v-model="selectedPayrollEmployeeId" class="form-select">
              <option v-for="employee in state.employees" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Pay Period</label>
            <input v-model="selectedPayrollMonth" class="form-control" />
          </div>
          <div class="col-12 d-grid">
            <button class="btn btn-aurora" type="submit">Generate Digital Payslip</button>
          </div>
        </form>
      </article>
    </div>

    <div class="col-12 col-lg-7">
      <article class="panel-card p-3 p-lg-4 h-100">
        <h3 class="section-title">Payroll Source Data</h3>
        <div class="table-responsive mb-3">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Hours Worked</th>
                <th>Leave Deductions</th>
                <th>Final Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in state.payrollSource" :key="entry.employeeId">
                <td>{{ employeeById[entry.employeeId]?.name }}</td>
                <td>{{ entry.hoursWorked }}</td>
                <td>{{ entry.leaveDeductions }}</td>
                <td>{{ formatCurrency(entry.finalSalary) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="section-title">Generated Payslips</h3>
        <div class="d-flex flex-column gap-2">
          <div v-for="slip in state.generatedPayslips" :key="slip.id" class="payslip-card">
            <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <strong>{{ employeeById[slip.employeeId]?.name }}</strong>
                <div class="small text-muted">{{ slip.month }}</div>
                <div class="small">Base: {{ formatCurrency(slip.baseMonthly) }} | Overtime: {{ formatCurrency(slip.overtimePay) }}</div>
                <div class="small">Tax: {{ formatCurrency(slip.taxDeduction) }} | Pension: {{ formatCurrency(slip.pensionDeduction) }}</div>
                <div class="small">Leave Deduction: {{ formatCurrency(slip.leaveDeductionAmount ?? 0) }}</div>
              </div>
              <div class="text-end">
                <div class="small text-muted">Net Pay</div>
                <div class="fw-bold fs-5">{{ formatCurrency(slip.netPay) }}</div>
              </div>
            </div>
          </div>
          <p v-if="!state.generatedPayslips.length" class="text-muted mb-0">No payslips generated yet.</p>
        </div>
      </article>
    </div>
  </section>
</template>
