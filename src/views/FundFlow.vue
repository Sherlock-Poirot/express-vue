<template>
  <div class="fund-flow">
    <!-- ================= 顶部概览（标题 + 今日挂账统计） ================= -->
    <div class="flow-panel">
      <div class="panel-body">
        <div class="overview-head">
          <span class="toolbar-bar"></span>
          <span class="toolbar-title">资金流水</span>
          <el-tag type="info" effect="plain" round size="small">{{ today }}</el-tag>
        </div>
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-label">今日挂账</div>
            <div class="stat-val num-blue">¥{{ fmt(todayHangAmount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">未匹配面单</div>
            <div class="stat-val num-orange">{{ unmatchedCount }} 笔</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 面单明细 + 资金流水明细（左右联动） ================= -->
    <div class="flow-panels">
      <!-- 左：面单明细 -->
      <div class="flow-panel panel-waybill">
      <div class="panel-head">
        <span class="panel-title">面单明细</span>
        <span class="panel-sub">共 <b>{{ waybills.length }}</b> 笔 · 未匹配金额 ¥{{ fmt(sumWaybillRemain) }}</span>
        <el-upload
          :show-file-list="false"
          accept=".xlsx,.xls"
          :http-request="doWaybillImport"
        >
          <el-button type="primary" size="small" :loading="importing">导入</el-button>
        </el-upload>
      </div>
      <div class="panel-body">
        <!-- 筛选（对应 /flowDetail/recharge/list 的查询参数） -->
        <el-form :inline="true" :model="searchForm" size="small" class="waybill-search">
          <el-form-item label="来源客户">
            <el-input v-model="searchForm.fromCustName" placeholder="客户名称（模糊）" clearable style="width: 140px" />
          </el-form-item>
          <el-form-item label="目的客户">
            <el-input v-model="searchForm.toCustName" placeholder="客户名称（模糊）" clearable style="width: 140px" />
          </el-form-item>
          <el-form-item label="操作类型">
            <el-input v-model="searchForm.operateType" placeholder="精确匹配" clearable style="width: 100px" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-input v-model="searchForm.payType" placeholder="精确匹配" clearable style="width: 100px" />
          </el-form-item>
          <el-form-item label="匹配状态">
            <el-select v-model="searchForm.matchStatus" placeholder="全部" clearable style="width: 100px">
              <el-option label="未匹配" :value="0" />
              <el-option label="部分匹配" :value="1" />
              <el-option label="已匹配" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作时间">
            <el-date-picker
              v-model="searchForm.timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="pickerDefaultTime"
              style="width: 320px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="getWaybillList">查询</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table
          ref="waybillTableRef"
          :data="waybills"
          v-loading="loading"
          size="small"
          border
          height="100%"
          class="flex-table"
          row-key="id"
          @selection-change="onWaybillSelect"
        >
          <el-table-column type="selection" width="42" :selectable="(w) => w.matchStatus === 0" fixed />
          <el-table-column prop="fromCustName" label="来源客户" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column prop="toShopName" label="目的店铺" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="toCustName" label="目的客户" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateType" label="操作类型" width="76" header-align="center" />
          <el-table-column prop="rechargePlatform" label="充值平台" width="76" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateQty" label="数量" width="60" align="right" header-align="center" />
          <el-table-column label="单价" width="80" align="right" header-align="center">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row, 'unitPrice')"
                v-model="editValue"
                v-focus
                size="small"
                class="cell-edit-input"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
              <div v-else class="cell-editable" title="点击编辑" @click="startEdit(row, 'unitPrice')">{{ fmt(row.unitPrice) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="88" align="right" header-align="center">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row, 'amount')"
                v-model="editValue"
                v-focus
                size="small"
                class="cell-edit-input"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
              <div v-else class="cell-editable num-blue" title="点击编辑" @click="startEdit(row, 'amount')">¥{{ fmt(row.amount) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="支付方式" width="92" header-align="center">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row, 'payType')"
                v-model="editValue"
                v-focus
                size="small"
                class="cell-edit-input cell-edit-text"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
              <div v-else class="cell-editable" title="点击编辑" @click="startEdit(row, 'payType')">{{ row.payType }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="specialRemark" label="特殊备注" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column prop="remark" label="备注" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateTime" label="操作时间" width="150" header-align="center" />
          <el-table-column prop="operator" label="操作人" width="80" show-overflow-tooltip header-align="center" />
          <el-table-column label="匹配状态" width="86" align="center" fixed="right">
            <template #default="{ row }">
              <el-tag :type="waybillStatus(row).type" size="small" effect="light">{{ waybillStatus(row).text }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

      <!-- 右：资金流水明细（按平台分 Tab，切换即查询） -->
      <div class="flow-panel panel-cash">
      <div class="panel-head">
        <span class="panel-title">资金流水明细</span>
        <span class="panel-sub">
          共 <b>{{ fundFlows.length }}</b> 笔 · 待匹配 <b>{{ unmatchedFlowCount }}</b> 笔 · 待收 ¥{{ fmt(sumFlowRemain) }}
        </span>
        <el-button type="primary" size="small" @click="openCashImport">导入</el-button>
      </div>
      <div class="panel-body">
        <!-- 平台 Tab（字典来自 /flowDetail/cash/platforms） -->
        <el-tabs v-model="activePlatform" class="platform-tabs" @tab-change="onPlatformChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane v-for="p in platformOptions" :key="p.value" :label="p.label" :name="String(p.value)" />
        </el-tabs>

        <!-- 筛选（对应 /flowDetail/cash/list 的查询参数） -->
        <el-form :inline="true" :model="cashSearchForm" size="small" class="cash-search">
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
          <el-table-column type="selection" width="42" :selectable="(f) => f.actualType === 1 && f.matchStatus === 0" />
          <el-table-column prop="operateTime" label="操作时间" width="150" header-align="center" />
          <el-table-column prop="custName" label="客户名称" min-width="120" show-overflow-tooltip header-align="center" />
          <el-table-column prop="category" label="类目" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column label="金额" width="104" align="right" header-align="center">
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
    </div>

    <!-- 资金流水导入弹窗（先选平台，再选文件） -->
    <el-dialog v-model="cashImportVisible" title="导入资金流水" width="440px" :close-on-click-modal="false">
      <el-form label-width="64px" size="default">
        <el-form-item label="平台" required>
          <el-select v-model="cashImportForm.platform" placeholder="请选择平台" style="width: 100%">
            <el-option v-for="p in platformOptions" :key="p.value" :label="p.label" :value="p.value" />
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
import { ElMessage } from 'element-plus'
import axios from 'axios'

/* =========================================================
   基础工具
   ========================================================= */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const fmt = (n) =>
  Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = fmtDate(new Date())

/* =========================================================
   数据
   ---------------------------------------------------------
   已接入：
     GET  /api/flowDetail/recharge/list   面单明细（支持筛选）
     GET  /api/flowDetail/cash/list       资金流水明细（支持筛选 + 平台 Tab）
     GET  /api/flowDetail/cash/platforms  资金流水平台字典
   待接入：
     POST /api/flowDetail/match           确认匹配 { rechargeIds, cashIds }
     POST /api/flowDetail/unmatch         取消匹配 { rechargeIds, cashIds }
   ========================================================= */
const loading = ref(false)
const waybills = ref([])     // 面单明细（接口原始行 + 规范化辅助字段）
const fundFlows = ref([])    // 资金流水明细（当前平台 Tab 数据）
const cashLoading = ref(false)

/* 平台字典（Tab 与导入弹窗共用，进入页面加载一次） */
const platformOptions = ref([])
const activePlatform = ref('all')   // 'all' 或平台 value 的字符串
const loadPlatforms = async () => {
  try {
    const res = await axios.get('/api/flowDetail/cash/platforms')
    platformOptions.value = res.data.data || []
  } catch (err) {
    console.error('获取平台列表失败:', err)
  }
}

/* 默认查询 T-1 全天 */
const yesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return fmtDate(d)
}
const defaultTimeRange = () => [`${yesterdayStr()} 00:00:00`, `${yesterdayStr()} 23:59:59`]
/* 选择器内新选时间的默认时刻：开始 00:00:00，结束 23:59:59 */
const pickerDefaultTime = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]

/* 面单明细筛选（对应接口查询参数） */
const searchForm = ref({
  fromCustName: '',
  toCustName: '',
  operateType: '',
  payType: '',
  matchStatus: null,
  timeRange: defaultTimeRange()
})

/* 后端 LocalDateTime 序列化可能是 "2026-10-16T10:00:00" 或 "2026-10-16 10:00:00"，统一成后者 */
const fmtDateTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '')

/* 行规范化：匹配逻辑需要 customer/remain/date 等字段，由接口字段推导
   注意：面单明细表没有余额字段，未匹配(matchStatus=0)时 remain=amount，已匹配则 0 */
function normalizeWaybill(r) {
  const unmatched = r.matchStatus === 0
  const amount = Number(r.amount || 0)
  return {
    ...r,
    customer: r.fromCustName || '',
    amount,
    matched: unmatched ? 0 : amount,
    remain: unmatched ? amount : 0,
    operateTime: fmtDateTime(r.operateTime),
    date: r.operateTime ? String(r.operateTime).slice(0, 10) : ''
  }
}

const getWaybillList = async () => {
  loading.value = true
  try {
    const params = {}
    const s = searchForm.value
    if (s.fromCustName) params.fromCustName = s.fromCustName
    if (s.toCustName) params.toCustName = s.toCustName
    if (s.operateType) params.operateType = s.operateType
    if (s.payType) params.payType = s.payType
    if (s.matchStatus !== null && s.matchStatus !== '') params.matchStatus = s.matchStatus
    if (s.timeRange && s.timeRange.length === 2) {
      params.startTime = s.timeRange[0]
      params.endTime = s.timeRange[1]
    }
    const res = await axios.get('/api/flowDetail/recharge/list', { params })
    waybills.value = (res.data.data || []).map(normalizeWaybill)
  } catch (err) {
    console.error('获取面单明细失败:', err)
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.value = {
    fromCustName: '',
    toCustName: '',
    operateType: '',
    payType: '',
    matchStatus: null,
    timeRange: defaultTimeRange()
  }
  getWaybillList()
}

/* 面单流水导入：POST /api/flowDetail/recharge/import（multipart，字段名 file） */
const importing = ref(false)
const doWaybillImport = async ({ file }) => {
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post('/api/flowDetail/recharge/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.code === 200) {
      ElMessage.success(`导入成功，共 ${res.data.data ?? 0} 条`)
      getWaybillList()
    } else {
      ElMessage.error(res.data.message || '导入失败')
    }
  } catch (err) {
    console.error('面单导入失败:', err)
    ElMessage.error(err.response?.data?.message || '导入失败，请检查文件格式')
  } finally {
    importing.value = false
  }
}

/* 资金流水导入：POST /flowDetail/cash/import(file, platform)，平台字典进入页面时已加载 */
const cashImportVisible = ref(false)
const cashImporting = ref(false)
const cashImportForm = ref({ platform: null, file: null })

const openCashImport = () => {
  cashImportForm.value = { platform: null, file: null }
  cashImportVisible.value = true
}

const onCashFileChange = (uploadFile) => {
  cashImportForm.value.file = uploadFile.raw
}

const doCashImport = async () => {
  const { platform, file } = cashImportForm.value
  if (!platform) {
    ElMessage.warning('请选择平台')
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
    fd.append('platform', platform)
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

/* 资金流水筛选（对应 /flowDetail/cash/list 查询参数，默认 T-1 全天） */
const cashSearchForm = ref({
  custName: '',
  actualType: null,
  markType: null,
  matchStatus: null,
  minAmount: '',
  maxAmount: '',
  timeRange: defaultTimeRange()
})

/* 行规范化：金额转数值、时间格式化 */
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
    if (activePlatform.value !== 'all') params.platform = Number(activePlatform.value)
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

/* 切换平台 Tab 即按平台查询（activeKey 驱动） */
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

const loadData = () => {
  getWaybillList()
  getCashList()
}

/* =========================================================
   交互状态（勾选暂存，后续匹配换一种展示模式时使用）
   ========================================================= */
const selectedWaybills = ref([])
const selectedFlows = ref([])
const waybillTableRef = ref(null)
const flowTableRef = ref(null)

const onWaybillSelect = (rows) => {
  selectedWaybills.value = rows
}
const onFlowSelect = (rows) => {
  selectedFlows.value = rows
}

/* =========================================================
   行内编辑（单价 / 金额 / 支付方式）
   ========================================================= */
const editCell = ref({ id: null, field: '' })
const editValue = ref('')

const isEditing = (row, field) => editCell.value.id === row.id && editCell.value.field === field

const vFocus = {
  mounted: (el) => el.querySelector('input')?.focus()
}

const startEdit = (row, field) => {
  editCell.value = { id: row.id, field }
  editValue.value = String(row[field] ?? '')
}

const cancelEdit = () => {
  editCell.value = { id: null, field: '' }
}

const saveEdit = async (row) => {
  const { field } = editCell.value
  if (!field || editCell.value.id !== row.id) return

  let val = editValue.value
  if (field === 'unitPrice' || field === 'amount') {
    const num = Number(val)
    if (val === '' || isNaN(num) || num < 0) {
      ElMessage.warning('请输入有效的非负数字')
      cancelEdit()
      return
    }
    val = round2(num)
  } else {
    val = String(val ?? '').trim()
  }

  cancelEdit() // 立刻退出编辑态，避免阻塞其他交互

  if (val === row[field]) return // 无变化不提交

  try {
    const payload = {
      id: row.id,
      unitPrice: row.unitPrice,
      amount: row.amount,
      payType: row.payType,
      [field]: val
    }
    const res = await axios.post('/api/flowDetail/recharge/update', payload)
    if (res.data.code === 200) {
      row[field] = val
      if (field === 'amount') {
        const amount = Number(val || 0)
        row.matched = row.matchStatus === 0 ? 0 : amount
        row.remain = row.matchStatus === 0 ? amount : 0
      }
      ElMessage.success('已保存')
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) {
    console.error('保存面单失败:', err)
    ElMessage.error(err.response?.data?.message || '保存失败')
  }
}

/* =========================================================
   派生数据
   ========================================================= */
const sumWaybillRemain = computed(() => round2(waybills.value.reduce((s, w) => s + w.remain, 0)))
/* 资金流水：待匹配笔数与未匹配收入合计（实收侧 matchStatus 只有 0/1） */
const unmatchedFlowCount = computed(() => fundFlows.value.filter((f) => f.matchStatus === 0).length)
const sumFlowRemain = computed(() =>
  round2(
    fundFlows.value
      .filter((f) => f.actualType === 1 && f.matchStatus === 0)
      .reduce((s, f) => s + f.amount, 0)
  )
)

/* 今日挂 / 销账 */
const todayHangList = computed(() => waybills.value.filter((w) => w.date === today))
const todayHangAmount = computed(() => round2(todayHangList.value.reduce((s, w) => s + w.amount, 0)))
const unmatchedCount = computed(() => waybills.value.filter((w) => w.matchStatus === 0).length)

/* =========================================================
   展示辅助
   ========================================================= */
/* 面单匹配状态：0未匹配，1部分匹配，2已匹配（接口文档约定） */
const waybillStatus = (w) => {
  if (w.matchStatus === 2) return { text: '已匹配', type: 'success' }
  if (w.matchStatus === 1) return { text: '部分匹配', type: 'warning' }
  return { text: '未匹配', type: 'danger' }
}

onMounted(() => {
  loadPlatforms()
  loadData()
})
</script>

<style scoped>
.fund-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 顶部概览标题 ---------- */
.overview-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.toolbar-bar {
  width: 4px;
  height: 18px;
  background: #1677ff;
  border-radius: 2px;
}
.toolbar-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #1f2329;
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
.flow-panels {
  display: flex;
  gap: 16px;
  align-items: stretch;
  /* 固定总高：两个面板等高，表格在剩余高度内滚动而不是撑高整页 */
  height: 620px;
}
.flow-panels > .flow-panel {
  flex: 1 1 0;
  min-width: 0;
}
/* 左宽右窄：约 57 : 43 */
.flow-panels > .panel-waybill {
  flex: 1.15 1 0;
}
.flow-panels > .panel-cash {
  flex: 0.85 1 0;
}
.flow-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}
.panel-sub {
  font-size: 12px;
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

/* 表格填满面板剩余高度，左右两表底部对齐 */
.flex-table {
  flex: 1 1 auto;
  min-height: 0;
}
.waybill-search,
.cash-search,
.platform-tabs {
  flex-shrink: 0;
}

/* 面单明细筛选表单 */
.waybill-search {
  margin-bottom: 4px;
}
.waybill-search :deep(.el-form-item) {
  margin-right: 12px;
  margin-bottom: 8px;
}
.waybill-search :deep(.el-form-item__label) {
  font-size: 12px;
  color: #5a6577;
  padding-right: 6px;
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
  font-size: 12px;
  color: #5a6577;
  padding-right: 6px;
}

/* 数字配色 */
.num-blue {
  color: #1259c3;
  font-weight: 600;
}
.num-green {
  color: #087f5b;
  font-weight: 600;
}
.num-orange {
  color: #d46b08;
}

/* 可编辑单元格 */
.cell-editable {
  cursor: text;
  width: 100%;
  min-height: 20px;
  line-height: 20px;
  padding: 0 2px;
  box-sizing: border-box;
  border-bottom: 1px dashed #c0c4cc;
  border-radius: 2px;
}
.cell-editable:hover {
  background: #f0f6ff;
  border-bottom-color: #1677ff;
}
.cell-edit-input {
  width: 100%;
}
.cell-edit-input :deep(.el-input__inner) {
  padding: 0 4px;
  height: 22px;
  line-height: 22px;
  text-align: right;
}
.cell-edit-input.cell-edit-text :deep(.el-input__inner) {
  text-align: left;
}

/* ---------- 今日挂账 ---------- */
.stat-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1 1 0;
  min-width: 120px;
  background: #f8fafd;
  border: 1px solid #eef2f8;
  border-radius: 8px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stat-label {
  font-size: 12.5px;
  color: #8a94a6;
}
.stat-val {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}

/* ---------- 窄屏堆叠 ---------- */
@media (max-width: 1200px) {
  .flow-panels {
    flex-direction: column;
    height: auto;
  }
  .flow-panels > .flow-panel {
    flex: none;
  }
  .flex-table {
    flex: none;
    height: 420px;
  }
}
</style>
