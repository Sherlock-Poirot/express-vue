<template>
  <div class="recharge-flow">
    <!-- ================= 顶部概览（标题 + 今日挂账统计） ================= -->
    <div class="flow-panel">
      <div class="panel-body">
        <div class="overview-head">
          <span class="toolbar-bar"></span>
          <span class="toolbar-title">面单流水</span>
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

    <!-- ================= 面单明细 ================= -->
    <div class="flow-panel panel-waybill">
      <div class="panel-head">
        <span class="panel-title">面单明细</span>
        <span class="panel-sub">共 <b>{{ waybills.length }}</b> 笔 · 未匹配金额 ¥{{ fmt(sumWaybillRemain) }}</span>
        <div style="display:flex; gap:8px; align-items:center">
          <el-upload
            :show-file-list="false"
            accept=".xlsx,.xls"
            :http-request="doWaybillImport"
          >
            <el-button type="primary" :loading="importing">导入</el-button>
          </el-upload>
          <el-button type="danger" :disabled="selectedWaybills.length === 0" @click="doBatchDelete">删除</el-button>
          <el-button type="success" :disabled="selectedUnmatched.length === 0" @click="openMatchModal">匹配</el-button>
          <el-button type="info" :disabled="selectedMatchedCount === 0" @click="doUnmatch">取消匹配</el-button>
          <el-button type="warning" :loading="autoMatching" @click="doAutoMatch">自动匹配</el-button>
        </div>
      </div>
      <div class="panel-body">
        <!-- 筛选（对应 /flowDetail/recharge/list 的查询参数） -->
        <el-form :inline="true" :model="searchForm" class="waybill-search">
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
              <el-option label="已匹配" :value="1" />
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
          <el-table-column type="selection" width="42" fixed />
          <el-table-column prop="fromCustName" label="来源客户" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column prop="toShopName" label="目的店铺" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="toCustName" label="目的客户" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateType" label="操作类型" width="76" header-align="center" />
          <el-table-column prop="rechargePlatform" label="充值平台" width="76" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateQty" label="数量" width="60" align="right" header-align="center" class-name="num-col" />
          <el-table-column label="单价" width="80" align="right" header-align="center" class-name="num-col">
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
          <el-table-column label="金额" width="88" align="right" header-align="center" class-name="num-col">
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
          <el-table-column label="特殊备注" min-width="110" header-align="center">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row, 'specialRemark')"
                v-model="editValue"
                v-focus
                size="small"
                class="cell-edit-input cell-edit-text"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
              <div v-else class="cell-editable" title="点击编辑" @click="startEdit(row, 'specialRemark')">{{ row.specialRemark || '-' }}</div>
            </template>
          </el-table-column>
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

    <!-- ================= 匹配弹窗 ================= -->
    <el-dialog v-model="matchVisible" title="面单流水匹配资金流水" width="1200px" top="6vh" :close-on-click-modal="false">
      <!-- 上半部分：已选面单明细 -->
      <div class="match-section">
        <div class="match-section-title">已选面单明细（{{ selectedUnmatched.length }} 笔）</div>
        <el-table :data="selectedUnmatched" size="small" border height="180" class="match-table">
          <el-table-column prop="fromCustName" label="来源客户" min-width="110" show-overflow-tooltip header-align="center" />
          <el-table-column prop="toShopName" label="目的店铺" min-width="100" show-overflow-tooltip header-align="center" />
          <el-table-column prop="operateType" label="操作类型" width="76" header-align="center" />
          <el-table-column prop="operateQty" label="数量" width="60" align="right" header-align="center" />
          <el-table-column prop="unitPrice" label="单价" width="80" align="right" header-align="center">
            <template #default="{ row }">{{ fmt(row.unitPrice) }}</template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="88" align="right" header-align="center">
            <template #default="{ row }">¥{{ fmt(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="operateTime" label="操作时间" width="150" header-align="center" />
        </el-table>
      </div>

      <!-- 下半部分：未匹配资金流水（收入，按账户 Tab 过滤） -->
      <div class="match-section">
        <div class="match-section-title">未匹配资金流水（收入）</div>
        <el-tabs v-model="matchActiveAccount" class="match-account-tabs" @tab-change="getMatchFlows">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane v-for="a in accounts" :key="a.id" :label="a.accountName" :name="String(a.id)" />
        </el-tabs>
        <el-table
          ref="matchFlowTableRef"
          :data="matchFlows"
          v-loading="matchLoading"
          size="small"
          border
          height="320"
          class="match-table"
          row-key="id"
          @selection-change="onMatchFlowSelect"
        >
          <el-table-column type="selection" width="42" />
          <el-table-column prop="operateTime" label="操作时间" width="150" header-align="center" />
          <el-table-column prop="custName" label="客户名称" min-width="120" show-overflow-tooltip header-align="center" />
          <el-table-column prop="category" label="类目" width="100" show-overflow-tooltip header-align="center" />
          <el-table-column label="金额" width="104" align="right" header-align="center">
            <template #default="{ row }">
              <span :class="row.actualType === 1 ? 'num-green' : 'num-orange'">
                {{ row.actualType === 1 ? '+' : '-' }}¥{{ fmt(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="110" show-overflow-tooltip header-align="center" />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="matchVisible = false">取消</el-button>
        <el-button type="success" :loading="matchSubmitting" :disabled="matchSelectedFlows.length === 0" @click="doMatch">
          确认匹配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'RechargeFlow'
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
const today = fmtDate(new Date())

/* =========================================================
   数据
   ---------------------------------------------------------
   已接入：
     GET  /api/flowDetail/recharge/list   面单明细（支持筛选）
     POST /api/flowDetail/recharge/import 面单导入
     POST /api/flowDetail/recharge/update 面单行内编辑保存
   ========================================================= */
const loading = ref(false)
const waybills = ref([])

/* 默认查询 T-1 全天 */
const yesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return fmtDate(d)
}
const defaultTimeRange = () => [`${yesterdayStr()} 00:00:00`, `${yesterdayStr()} 23:59:59`]
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

/* 后端 LocalDateTime 序列化兼容 */
const fmtDateTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '')

/* 行规范化 */
function normalizeWaybill(r) {
  const unmatched = r.matchStatus !== 1
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

/* 面单流水导入 */
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

/* 勾选暂存 */
const selectedWaybills = ref([])
const waybillTableRef = ref(null)
const onWaybillSelect = (rows) => {
  selectedWaybills.value = rows
}

/* 批量删除面单明细 */
const doBatchDelete = async () => {
  const ids = selectedWaybills.value.map((w) => w.id)
  if (ids.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条面单明细吗？该操作会同时解除相关匹配关系，且不可恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const res = await axios.delete('/api/flowDetail/recharge/batch', { data: ids })
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      getWaybillList()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    console.error('删除面单明细失败:', err)
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

/* =========================================================
   匹配弹窗
   ========================================================= */
const matchVisible = ref(false)
const matchLoading = ref(false)
const matchSubmitting = ref(false)
const matchFlows = ref([])            // 未匹配收入资金流水
const matchSelectedFlows = ref([])    // 弹窗内勾选的资金流水
const matchFlowTableRef = ref(null)
const matchActiveAccount = ref('all') // 弹窗内账户 Tab（'all' 或账户id）

/* 自动匹配：无需选中，服务端自动按规则匹配所有未匹配数据 */
const autoMatching = ref(false)
const doAutoMatch = async () => {
  autoMatching.value = true
  try {
    const res = await axios.post('/api/flowDetail/recharge/autoMatch')
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || '自动匹配完成')
      getWaybillList()
    } else {
      ElMessage.error(res.data.message || '自动匹配失败')
    }
  } catch (err) {
    console.error('自动匹配失败:', err)
    ElMessage.error(err.response?.data?.message || '自动匹配失败')
  } finally {
    autoMatching.value = false
  }
}

/* 账户列表（匹配弹窗 Tab 用） */
const accounts = ref([])
const loadAccounts = async () => {
  try {
    const res = await axios.get('/api/cashAccount/list')
    accounts.value = res.data.data || []
  } catch (err) {
    console.error('获取账户列表失败:', err)
  }
}

/* 拉取未匹配收入资金流水（按账户所属平台过滤） */
const getMatchFlows = async () => {
  matchLoading.value = true
  try {
    const params = { actualType: 1, matchStatus: 0 }
    if (matchActiveAccount.value !== 'all') {
      const acc = accounts.value.find((x) => String(x.id) === matchActiveAccount.value)
      if (acc) params.platform = acc.platform
    }
    const res = await axios.get('/api/flowDetail/cash/list', { params })
    matchFlows.value = (res.data.data || []).map((r) => ({
      ...r,
      amount: Number(r.amount || 0),
      operateTime: fmtDateTime(r.operateTime)
    }))
  } catch (err) {
    console.error('获取未匹配资金流水失败:', err)
  } finally {
    matchLoading.value = false
  }
}

/* 打开匹配弹窗：校验选中 + 拉取未匹配收入流水 */
const openMatchModal = () => {
  if (selectedWaybills.value.length === 0) {
    ElMessage.warning('请先选择要匹配的面单明细')
    return
  }
  if (selectedUnmatched.value.length === 0) {
    ElMessage.warning('选中的面单均已匹配，不能重复匹配')
    return
  }
  matchVisible.value = true
  matchFlows.value = []
  matchSelectedFlows.value = []
  matchActiveAccount.value = 'all'
  getMatchFlows()
}

const onMatchFlowSelect = (rows) => {
  matchSelectedFlows.value = rows
}

/* 取消匹配：选中已匹配的面单，后端反查并删除全部关联 */
const selectedMatchedCount = computed(
  () => selectedWaybills.value.filter((w) => w.matchStatus === 1).length
)

/* 可参与匹配的选中行：仅未匹配（已匹配的不允许重复匹配） */
const selectedUnmatched = computed(
  () => selectedWaybills.value.filter((w) => w.matchStatus !== 1)
)

const doUnmatch = async () => {
  const ids = selectedWaybills.value.filter((w) => w.matchStatus === 1).map((w) => w.id)
  if (ids.length === 0) {
    ElMessage.warning('请选择已匹配的面单明细')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定取消选中的 ${ids.length} 笔已匹配面单的匹配关系吗？取消后面单和资金流水都会回到未匹配状态。`,
      '取消匹配',
      { type: 'warning', confirmButtonText: '取消匹配', cancelButtonText: '再想想' }
    )
  } catch {
    return
  }
  try {
    const res = await axios.post('/api/flowDetail/unmatch', { rechargeIds: ids, cashIds: [] })
    if (res.data.code === 200) {
      ElMessage.success('取消匹配成功')
      getWaybillList()
    } else {
      ElMessage.error(res.data.message || '取消匹配失败')
    }
  } catch (err) {
    console.error('取消匹配失败:', err)
  }
}

/* 确认匹配：POST /api/flowDetail/match */
const doMatch = async () => {
  if (matchSelectedFlows.value.length === 0) {
    ElMessage.warning('请选择要匹配的资金流水')
    return
  }
  const rechargeIds = selectedUnmatched.value.map((w) => w.id)
  const cashIds = matchSelectedFlows.value.map((f) => f.id)
  matchSubmitting.value = true
  try {
    const res = await axios.post('/api/flowDetail/match', { rechargeIds, cashIds })
    if (res.data.code === 200) {
      ElMessage.success('匹配成功')
      matchVisible.value = false
      getWaybillList()
    } else {
      ElMessage.error(res.data.message || '匹配失败')
    }
  } catch (err) {
    console.error('匹配失败:', err)
    ElMessage.error(err.response?.data?.message || '匹配失败')
  } finally {
    matchSubmitting.value = false
  }
}

/* 行内编辑（单价 / 金额 / 支付方式） */
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

  cancelEdit()

  if (val === row[field]) return

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
        row.matched = row.matchStatus === 1 ? amount : 0
        row.remain = row.matchStatus === 1 ? 0 : amount
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
const todayHangList = computed(() => waybills.value.filter((w) => w.date === today))
const todayHangAmount = computed(() => round2(todayHangList.value.reduce((s, w) => s + w.amount, 0)))
const unmatchedCount = computed(() => waybills.value.filter((w) => w.matchStatus !== 1).length)

/* 展示辅助 */
const waybillStatus = (w) => {
  return w.matchStatus === 1
    ? { text: '已匹配', type: 'success' }
    : { text: '未匹配', type: 'danger' }
}

onMounted(() => {
  getWaybillList()
  loadAccounts()
})
</script>

<style scoped>
.recharge-flow {
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

/* ---------- 面板通用 ---------- */
.flow-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-waybill {
  flex: 1 1 auto;
  min-height: 0;
  /* 表格撑满剩余高度 */
  height: calc(100vh - 220px);
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
.waybill-search {
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
  font-size: 13px;
  color: #5a6577;
  padding-right: 6px;
}

/* 数字配色 */
.num-blue {
  color: #1259c3;
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

/* 数量/单价/金额 三列字号加大 */
:deep(.num-col .cell) {
  font-size: 15px;
  font-weight: 600;
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

/* 匹配弹窗 */
.match-section {
  margin-bottom: 16px;
}
.match-account-tabs {
  margin-bottom: 8px;
}
.match-account-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.match-section:last-child {
  margin-bottom: 0;
}
.match-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #67c23a;
}
.match-table {
  width: 100%;
}
</style>
