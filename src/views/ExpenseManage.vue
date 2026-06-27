<template>
  <div class="page-container">
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd" v-if="hasBtnPermission('新增报销', '新增')">
        <el-icon><Plus /></el-icon>
        新增报销
      </el-button>
      <el-button type="danger" @click="handleBatchDelete" v-if="hasBtnPermission('批量删除报销', '删除', '移除')" :disabled="selectedIds.length === 0">
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
    </div>

    <div class="search-box">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="报销类型" v-if="hasBtnPermission('查询报销', '查询')">
          <el-select v-model="searchForm.expenseType" placeholder="请选择报销类型" clearable style="width: 120px">
            <el-option v-for="item in expenseTypeOptions" :key="item.dictValue" :value="item.dictValue" :label="item.dictLabel" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份" v-if="hasBtnPermission('查询报销', '查询')">
          <el-date-picker
            v-model="searchForm.month"
            type="month"
            placeholder="选择月份"
            format="YYYY-MM"
            value-format="YYYY-MM"
            clearable style="width: 120px"
          />
        </el-form-item>
        <el-form-item label="审核状态" v-if="hasBtnPermission('查询报销', '查询')">
          <el-select v-model="searchForm.status" placeholder="请选择审核状态" clearable style="width: 120px">
            <el-option v-for="item in auditStatusOptions" :key="item.dictValue" :value="item.dictValue" :label="item.dictLabel" />
          </el-select>
        </el-form-item>
        <el-form-item label="报销人" v-if="hasBtnPermission('查询报销', '查询')">
          <el-input v-model="searchForm.applicant" placeholder="请输入报销人" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-box">
      <el-table :data="tableData" v-loading="loading" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="报销类型" width="120">
          <template #default="{ row }">
            <span>{{ getExpenseTypeLabel(row.expenseType) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expenseName" label="报销名称" width="180" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="applicant" label="报销人" width="120" />
        <el-table-column prop="expenseDate" label="报销日期" width="140" />
        <el-table-column prop="month" label="所属月份" width="120" />
        <el-table-column label="审核状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="转账类型" width="120">
          <template #default="{ row }">
            {{ getTransferTypeLabel(row.transferType) }}
          </template>
        </el-table-column>
        <el-table-column prop="transferTime" label="转账时间" width="140">
          <template #default="{ row }">
            {{ formatDate(row.transferTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)" v-if="hasBtnPermission('编辑报销', '编辑', '修改')">编辑</el-button>
            <el-button type="success" size="small" @click="handleAudit(row, 1)" v-if="hasBtnPermission('审核通过', '审核') && row.status === 0">通过</el-button>
            <el-button type="warning" size="small" @click="handleAudit(row, 2)" v-if="hasBtnPermission('审核拒绝', '审核') && row.status === 0">拒绝</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)" v-if="hasBtnPermission('删除报销', '删除', '移除')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-box">
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList"
        @current-change="getList"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="报销类型" prop="expenseType">
          <el-select v-model="form.expenseType" placeholder="请选择报销类型">
            <el-option v-for="item in expenseTypeOptions" :key="item.dictValue" :value="parseInt(item.dictValue)" :label="item.dictLabel" />
          </el-select>
        </el-form-item>
        <el-form-item label="报销名称" prop="expenseName">
          <el-input v-model="form.expenseName" placeholder="请输入报销名称" />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input v-model="form.amount" placeholder="请输入金额" type="number" />
        </el-form-item>
        <el-form-item label="报销人" prop="applicant">
          <el-input v-model="form.applicant" placeholder="请输入报销人" />
        </el-form-item>
        <el-form-item label="报销日期" prop="expenseDate">
          <el-date-picker
            v-model="form.expenseDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="转账类型">
          <el-select v-model="form.transferType" placeholder="请选择转账类型">
            <el-option :value="1" label="银行卡转账" />
            <el-option :value="2" label="支付宝" />
            <el-option :value="3" label="微信支付" />
            <el-option :value="4" label="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="转账时间">
          <el-date-picker
            v-model="form.transferTime"
            type="date"
            placeholder="选择转账时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="auditDialogVisible"
      :title="auditDialogTitle"
      width="450px"
      destroy-on-close
    >
      <div class="audit-info" style="margin-bottom: 20px">
        <p><span class="label">报销名称：</span>{{ currentAuditRow?.expenseName }}</p>
        <p><span class="label">报销金额：</span>¥{{ currentAuditRow?.amount }}</p>
        <p><span class="label">报销人：</span>{{ currentAuditRow?.applicant }}</p>
      </div>
      <el-form v-if="currentAuditStatus === 1" :model="auditForm" label-width="100px">
        <el-form-item label="转账类型">
          <el-select v-model="auditForm.transferType" placeholder="请选择转账类型">
            <el-option :value="1" label="银行卡转账" />
            <el-option :value="2" label="支付宝" />
            <el-option :value="3" label="微信支付" />
            <el-option :value="4" label="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="转账时间">
          <el-date-picker
            v-model="auditForm.transferTime"
            type="date"
            placeholder="选择转账时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>
      <p v-else>确认要拒绝该报销吗？</p>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAuditSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'ExpenseManage'
})

import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '@/utils/auth'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const dialogTitle = ref('新增报销')
const isEdit = ref(false)
const formRef = ref(null)

const auditDialogVisible = ref(false)
const auditDialogTitle = ref('审核通过')
const currentAuditRow = ref(null)
const currentAuditStatus = ref(1)

const auditForm = reactive({
  transferType: '',
  transferTime: ''
})

const selectedIds = ref([])

const expenseTypeOptions = ref([])
const auditStatusOptions = ref([])

const searchForm = reactive({
  expenseType: '',
  month: '',
  status: '',
  applicant: ''
})

const form = reactive({
  id: null,
  expenseType: '',
  expenseName: '',
  amount: '',
  applicant: '',
  expenseDate: '',
  transferType: '',
  transferTime: '',
  remark: ''
})

const rules = {
  expenseType: [{ required: true, message: '请选择报销类型', trigger: 'change' }],
  expenseName: [{ required: true, message: '请输入报销名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  applicant: [{ required: true, message: '请输入报销人', trigger: 'blur' }],
  expenseDate: [{ required: true, message: '请选择报销日期', trigger: 'change' }]
}

const getList = async () => {
  loading.value = true
  try {
    const params = {
      expenseType: searchForm.expenseType ? parseInt(searchForm.expenseType) : undefined,
      month: searchForm.month || undefined,
      status: searchForm.status ? parseInt(searchForm.status) : undefined
    }
    
    const res = await axios.get('/api/expense/list', { params })
    let data = res.data.data || []
    
    if (searchForm.applicant) {
      data = data.filter(item => item.applicant && item.applicant.includes(searchForm.applicant))
    }
    
    total.value = data.length
    const start = (pageNo.value - 1) * pageSize.value
    tableData.value = data.slice(start, start + pageSize.value)
  } catch (err) {
    console.error('获取报销列表失败:', err)
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.expenseType = ''
  searchForm.month = ''
  searchForm.status = ''
  searchForm.applicant = ''
  pageNo.value = 1
  getList()
}

const handleSelectionChange = (val) => {
  selectedIds.value = val.map(item => item.id)
}

const handleAdd = () => {
  dialogTitle.value = '新增报销'
  isEdit.value = false
  Object.assign(form, {
    id: null,
    expenseType: '',
    expenseName: '',
    amount: '',
    applicant: '',
    expenseDate: '',
    transferType: '',
    transferTime: '',
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑报销'
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    expenseType: row.expenseType,
    expenseName: row.expenseName,
    amount: row.amount,
    applicant: row.applicant,
    expenseDate: row.expenseDate,
    transferType: row.transferType,
    transferTime: row.transferTime,
    remark: row.remark
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const submitData = { ...form }
        if (submitData.expenseDate) {
          submitData.month = submitData.expenseDate.substring(0, 7)
        }
        submitData.status = isEdit.value ? tableData.value.find(r => r.id === form.id)?.status : 0
        
        if (isEdit.value) {
          await axios.put(`/api/expense/${form.id}`, submitData)
          ElMessage.success('更新成功')
        } else {
          await axios.post('/api/expense/create', submitData)
          ElMessage.success('新增成功')
        }
        dialogVisible.value = false
        getList()
      } catch (err) {
        console.error('提交失败:', err)
      }
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该报销记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete(`/api/expense/${row.id}`)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要批量删除选中的报销记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete('/api/expense/batch/delete', {
      data: selectedIds.value
    })
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('批量删除失败:', err)
    }
  }
}

const handleAudit = (row, status) => {
  currentAuditRow.value = row
  currentAuditStatus.value = status
  auditDialogTitle.value = status === 1 ? '审核通过' : '审核拒绝'
  auditForm.transferType = row.transferType || ''
  auditForm.transferTime = row.transferTime || ''
  auditDialogVisible.value = true
}

const handleAuditSubmit = async () => {
  try {
    if (currentAuditStatus.value === 1) {
      // 审核通过时，更新转账信息并审核
      await axios.put(`/api/expense/${currentAuditRow.value.id}`, {
        ...currentAuditRow.value,
        transferType: auditForm.transferType,
        transferTime: auditForm.transferTime,
        status: 1
      })
    } else {
      // 审核拒绝
      await axios.post(`/api/expense/audit/${currentAuditRow.value.id}`, null, {
        params: { status: currentAuditStatus.value }
      })
    }
    ElMessage.success(auditDialogTitle.value + '成功')
    auditDialogVisible.value = false
    getList()
  } catch (err) {
    console.error('审核失败:', err)
    ElMessage.error('审核失败')
  }
}

const getExpenseTypeLabel = (value) => {
  const item = expenseTypeOptions.value.find(opt => parseInt(opt.dictValue) === value)
  return item ? item.dictLabel : value
}

const getStatusLabel = (value) => {
  const item = auditStatusOptions.value.find(opt => parseInt(opt.dictValue) === value)
  return item ? item.dictLabel : value
}

const getStatusType = (value) => {
  switch (value) {
    case 0: return 'info'
    case 1: return 'success'
    case 2: return 'danger'
    default: return ''
  }
}

const getTransferTypeLabel = (value) => {
  const transferTypes = {
    1: '银行卡转账',
    2: '支付宝',
    3: '微信支付',
    4: '现金'
  }
  return transferTypes[value] || value || '-'
}

const fetchDictOptions = async () => {
  try {
    const expenseTypeRes = await axios.get('/api/dict/items/expense_type')
    expenseTypeOptions.value = expenseTypeRes.data.data || []
    
    const auditStatusRes = await axios.get('/api/dict/items/audit_status')
    auditStatusOptions.value = auditStatusRes.data.data || []
  } catch (err) {
    console.error('获取字典数据失败:', err)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(() => {
  fetchDictOptions()
  getList()
})
</script>

<style scoped>
.page-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.action-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.search-box {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.table-box {
  margin-bottom: 20px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
}

.amount {
  font-weight: 600;
  color: #e6a23c;
}

.audit-content {
  padding: 10px 0;
}

.audit-info {
  margin-top: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.audit-info p {
  margin: 8px 0;
}

.audit-info .label {
  color: #606266;
  font-weight: 500;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 500;
}

:deep(.el-table td) {
  padding: 10px 12px;
}

:deep(.el-table--border th) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table--border td) {
  border-bottom: 1px solid #ebeef5;
}
</style>