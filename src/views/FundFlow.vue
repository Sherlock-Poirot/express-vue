<template>
  <div class="fund-flow">
    <!-- 资金流水明细（按平台分 Tab，切换即查询） -->
    <div class="flow-panel panel-cash">
      <div class="panel-head">
        <span class="panel-title">资金流水明细</span>
        <span class="panel-sub">
          共 <b>{{ fundFlows.length }}</b> 笔 · 待匹配 <b>{{ unmatchedFlowCount }}</b> 笔 · 待收 ¥{{ fmt(sumFlowRemain) }}
        </span>
      </div>
      <div class="panel-body">
        <!-- 账户 Tab（列表来自 /cashAccount/list，切换按账户所属平台过滤） -->
        <el-tabs v-model="activePlatform" class="platform-tabs" @tab-change="onPlatformChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane v-for="a in accounts" :key="a.id" :label="a.accountName" :name="String(a.id)" />
        </el-tabs>

        <!-- 筛选（对应 /flowDetail/cash/list 的查询参数） -->
        <el-form :inline="true" :model="cashSearchForm" class="cash-search">
          <el-form-item label="客户名称">
            <el-input v-model="cashSearchForm.custName" placeholder="客户名称（模糊）" clearable style="width: 130px" />
          </el-form-item>
          <el-form-item label="收支">
            <el-select v-model="cashSearchForm.actualType" placeholder="全部" clearable style="width: 88px">
              <el-option label="收入" :value="1" />
              <el-option label="支出" :value="-1" />
            </el-select>
          </el-form-item>
          <el-form-item label="标记类型">
            <el-select v-model="cashSearchForm.markType" placeholder="全部" clearable style="width: 100px">
              <el-option label="收入" :value="1" />
              <el-option label="支出" :value="-1" />
              <el-option label="不计收支" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item label="匹配状态">
            <el-select v-model="cashSearchForm.matchStatus" placeholder="全部" clearable style="width: 92px">
              <el-option label="未匹配" :value="0" />
              <el-option label="已匹配" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item label="金额">
            <el-input v-model="cashSearchForm.minAmount" placeholder="最小" style="width: 70px" />
            <span style="margin: 0 4px; color: #c0c4cc">-</span>
            <el-input v-model="cashSearchForm.maxAmount" placeholder="最大" style="width: 70px" />
          </el-form-item>
          <el-form-item label="操作时间">
            <el-date-picker
              v-model="cashSearchForm.timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="pickerDefaultTime"
              style="width: 300px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="getCashList">查询</el-button>
            <el-button @click="resetCashSearch">重置</el-button>
            <el-button type="primary" plain @click="openCashImport">导入</el-button>
            <el-button type="danger" :disabled="selectedFlows.length === 0" @click="doBatchDelete">删除</el-button>
          </el-form-item>
        </el-form>

        <el-table
          ref="flowTableRef"
          :data="fundFlows"
          v-loading="cashLoading"
          size="small"
          border
          height="100%"
          class="flex-table"
          row-key="id"
          @selection-change="onFlowSelect"
        >
          <el-table-column type="selection" width="42" />
          <el-table-column prop="operateTime" label="操作时间" width="150" align="center" header-align="center" />
          <el-table-column prop="custName" label="客户名称" min-width="120" align="center" show-overflow-tooltip header-align="center" />
          <el-table-column prop="category" label="类目" width="80" align="center" show-overflow-tooltip header-align="center" />
          <el-table-column label="金额" width="104" align="center" header-align="center">
            <template #default="{ row }">
              <span :class="row.actualType === 1 ? 'num-green' : 'num-orange'">
                {{ row.actualType === 1 ? '+' : '-' }}¥{{ fmt(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="实际收支" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.actualType === 1 ? 'success' : 'warning'" size="small" effect="plain">
                {{ row.actualType === 1 ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column label="匹配状态" width="84" align="center" fixed="right">
            <template #default="{ row }">
              <el-tag :type="row.matchStatus === 1 ? 'success' : 'danger'" size="small" effect="light">
                {{ row.matchStatus === 1 ? '已匹配' : '未匹配' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 资金流水导入弹窗（先选平台，再选文件） -->
    <el-dialog v-model="cashImportVisible" title="导入资金流水" width="440px" :close-on-click-modal="false">
      <el-form label-width="64px" size="default">
        <el-form-item label="账户" required>
          <el-select v-model="cashImportForm.accountId" placeholder="请选择账户" style="width: 100%">
            <el-option v-for="a in accounts" :key="a.id" :label="a.accountName" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" required>
          <div class="import-file-row">
            <el-upload :auto-upload="false" :show-file-list="false" accept=".xlsx,.xls" :on-change="onCashFileChange">
              <el-button>选择文件</el-button>
            </el-upload>
            <span v-if="cashImportForm.file" class="import-file-name">{{ cashImportForm.file.name }}</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cashImportVisible = false">取消</el-button>
        <el-button type="primary" :loading="cashImporting" @click="doCashImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'FundFlow'
})

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

/* =========================================================
   基础工具
   ========================================================= */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const fmt = (n) =>
  Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/* =========================================================
   数据
   ---------------------------------------------------------
   已接入：
     GET  /api/flowDetail/cash/list       资金流水明细（支持筛选 + 账户 Tab）
     GET  /api/cashAccount/list           账户列表（Tab 与导入下拉数据源）
     POST /api/flowDetail/cash/import     资金流水导入
   ========================================================= */
const cashLoading = ref(false)
const fundFlows = ref([])

/* 账户列表（Tab 与导入弹窗共用，来自 /cashAccount/list；Tab 切换按账户所属平台过滤） */
const accounts = ref([])
const activePlatform = ref('all')
const loadPlatforms = async () => {
  try {
    const res = await axios.get('/api/cashAccount/list')
    accounts.value = res.data.data || []
  } catch (err) {
    console.error('获取账户列表失败:', err)
  }
}

/* 默认查询 T-1 全天 */
const yesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return fmtDate(d)
}
const defaultTimeRange = () => [`${yesterdayStr()} 00:00:00`, `${yesterdayStr()} 23:59:59`]
const pickerDefaultTime = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]

/* 后端 LocalDateTime 序列化兼容 */
const fmtDateTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '')

/* 资金流水筛选 */
const cashSearchForm = ref({
  custName: '',
  actualType: null,
  markType: null,
  matchStatus: null,
  minAmount: '',
  maxAmount: '',
  timeRange: defaultTimeRange()
})

function normalizeCash(r) {
  return {
    ...r,
    amount: Number(r.amount || 0),
    operateTime: fmtDateTime(r.operateTime)
  }
}

const getCashList = async () => {
  cashLoading.value = true
  try {
    const params = {}
    const s = cashSearchForm.value
    if (activePlatform.value !== 'all') {
      const acc = accounts.value.find((x) => String(x.id) === activePlatform.value)
      if (acc) params.platform = acc.platform
    }
    if (s.custName) params.custName = s.custName
    if (s.actualType !== null && s.actualType !== '') params.actualType = s.actualType
    if (s.markType !== null && s.markType !== '') params.markType = s.markType
    if (s.matchStatus !== null && s.matchStatus !== '') params.matchStatus = s.matchStatus
    if (s.minAmount !== '' && s.minAmount !== null) params.minAmount = s.minAmount
    if (s.maxAmount !== '' && s.maxAmount !== null) params.maxAmount = s.maxAmount
    if (s.timeRange && s.timeRange.length === 2) {
      params.startTime = s.timeRange[0]
      params.endTime = s.timeRange[1]
    }
    const res = await axios.get('/api/flowDetail/cash/list', { params })
    fundFlows.value = (res.data.data || []).map(normalizeCash)
    flowTableRef.value?.clearSelection?.()
  } catch (err) {
    console.error('获取资金流水明细失败:', err)
  } finally {
    cashLoading.value = false
  }
}

const onPlatformChange = () => {
  getCashList()
}

const resetCashSearch = () => {
  cashSearchForm.value = {
    custName: '',
    actualType: null,
    markType: null,
    matchStatus: null,
    minAmount: '',
    maxAmount: '',
    timeRange: defaultTimeRange()
  }
  getCashList()
}

/* 资金流水导入 */
const cashImportVisible = ref(false)
const cashImporting = ref(false)
const cashImportForm = ref({ accountId: null, file: null })

const openCashImport = () => {
  cashImportForm.value = { accountId: null, file: null }
  cashImportVisible.value = true
}

const onCashFileChange = (uploadFile) => {
  cashImportForm.value.file = uploadFile.raw
}

const doCashImport = async () => {
  const { accountId, file } = cashImportForm.value
  if (!accountId) {
    ElMessage.warning('请选择账户')
    return
  }
  if (!file) {
    ElMessage.warning('请选择导入文件')
    return
  }
  cashImporting.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('accountId', accountId)
    const res = await axios.post('/api/flowDetail/cash/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.code === 200) {
      ElMessage.success(`导入成功，共 ${res.data.data ?? 0} 条`)
      cashImportVisible.value = false
      getCashList()
    } else {
      ElMessage.error(res.data.message || '导入失败')
    }
  } catch (err) {
    console.error('资金流水导入失败:', err)
    ElMessage.error(err.response?.data?.message || '导入失败，请检查文件格式')
  } finally {
    cashImporting.value = false
  }
}

/* 勾选暂存 */
const selectedFlows = ref([])
const flowTableRef = ref(null)
const onFlowSelect = (rows) => {
  selectedFlows.value = rows
}

/* 批量删除资金流水明细 */
const doBatchDelete = async () => {
  const ids = selectedFlows.value.map((f) => f.id)
  if (ids.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条资金流水明细吗？该操作会同时解除相关匹配关系，且不可恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const res = await axios.delete('/api/flowDetail/cash/batch', { data: ids })
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      getCashList()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    console.error('删除资金流水明细失败:', err)
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

/* =========================================================
   派生数据
   ========================================================= */
const unmatchedFlowCount = computed(() => fundFlows.value.filter((f) => f.matchStatus === 0).length)
const sumFlowRemain = computed(() =>
  round2(
    fundFlows.value
      .filter((f) => f.actualType === 1 && f.matchStatus === 0)
      .reduce((s, f) => s + f.amount, 0)
  )
)

onMounted(() => {
  loadPlatforms()
  getCashList()
})
</script>

<style scoped>
.fund-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 导入弹窗文件行 */
.import-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.import-file-name {
  font-size: 13px;
  color: #4e5969;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 面板通用 ---------- */
.flow-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  /* 表格撑满剩余高度 */
  height: calc(100vh - 160px);
}
.panel-head {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
.panel-sub {
  font-size: 13px;
  color: #8a94a6;
}
.panel-sub b {
  color: #1677ff;
}
.panel-body {
  padding: 12px 16px;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 表格填满面板剩余高度 */
.flex-table {
  flex: 1 1 auto;
  min-height: 0;
}
.cash-search,
.platform-tabs {
  flex-shrink: 0;
}

/* 平台 Tabs（紧凑） */
.platform-tabs {
  margin-bottom: 2px;
}
.platform-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.platform-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

/* 资金流水筛选表单 */
.cash-search {
  margin-bottom: 4px;
}
.cash-search :deep(.el-form-item) {
  margin-right: 12px;
  margin-bottom: 8px;
}
.cash-search :deep(.el-form-item__label) {
  font-size: 13px;
  color: #5a6577;
  padding-right: 6px;
}

/* 数字配色 */
.num-green {
  color: #087f5b;
  font-weight: 600;
}
.num-orange {
  color: #d46b08;
}
</style>
