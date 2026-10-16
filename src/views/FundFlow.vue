<template>
  <div class="fund-flow">
    <!-- ================= 顶部工具条 ================= -->
    <div class="flow-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-bar"></span>
        <span class="toolbar-title">资金流水</span>
        <el-tag type="info" effect="plain" round size="small">{{ today }}</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button @click="handleAutoMatch">自动匹配</el-button>
        <el-button @click="handleClearPlan">清空占配</el-button>
        <el-button type="primary" :disabled="!canConfirm" @click="handleConfirm">确认匹配</el-button>
      </div>
    </div>

    <!-- ================= 上半部：面单明细 + 资金流水明细 ================= -->
    <div class="flow-panels">
      <!-- 左：面单明细 -->
      <div class="flow-panel">
        <div class="panel-head">
          <span class="panel-title">面单明细</span>
          <span class="panel-sub">共 <b>{{ waybills.length }}</b> 笔 · 未匹配金额 ¥{{ fmt(sumWaybillRemain) }}</span>
        </div>
        <div class="panel-body">
          <!-- 筛选（对应 /flowDetail/recharge/list 的查询参数） -->
          <el-form :inline="true" :model="searchForm" size="small" class="waybill-search">
            <el-form-item label="来源客户">
              <el-input v-model="searchForm.fromCustName" placeholder="客户名称（模糊）" clearable style="width: 140px" />
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
            height="352"
            row-key="id"
            @selection-change="onWaybillSelect"
          >
            <el-table-column type="selection" width="42" :selectable="(w) => w.matchStatus === 0" />
            <el-table-column prop="fromCustName" label="来源客户" min-width="120" show-overflow-tooltip />
            <el-table-column prop="operateType" label="操作类型" width="88" />
            <el-table-column prop="rechargePlatform" label="充值平台" width="90" show-overflow-tooltip />
            <el-table-column prop="operateQty" label="数量" width="70" align="right" />
            <el-table-column label="单价" width="88" align="right">
              <template #default="{ row }">{{ fmt(row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="96" align="right">
              <template #default="{ row }"><span class="num-blue">¥{{ fmt(row.amount) }}</span></template>
            </el-table-column>
            <el-table-column prop="payType" label="支付方式" width="82" />
            <el-table-column prop="operateTime" label="操作时间" width="150" />
            <el-table-column prop="operator" label="操作人" width="80" show-overflow-tooltip />
            <el-table-column label="匹配状态" width="86" align="center">
              <template #default="{ row }">
                <el-tag :type="waybillStatus(row).type" size="small" effect="light">{{ waybillStatus(row).text }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 右：资金流水明细 -->
      <div class="flow-panel">
        <div class="panel-head">
          <span class="panel-title">资金流水明细</span>
          <span class="panel-sub">待匹配 <b>{{ visibleFlows.length }}</b> 笔 · 收款余额 ¥{{ fmt(sumFlowRemain) }}</span>
        </div>
        <div class="panel-body">
          <el-table
            ref="flowTableRef"
            :data="visibleFlows"
            v-loading="loading"
            size="small"
            border
            height="352"
            row-key="no"
            @selection-change="onFlowSelect"
          >
            <el-table-column type="selection" width="42" :selectable="(f) => f.remain > 0.005 && f.direction === '收入'" />
            <el-table-column prop="no" label="流水号" width="112" />
            <el-table-column prop="customer" label="客户/店铺" min-width="130" show-overflow-tooltip />
            <el-table-column label="收付" width="62" align="center">
              <template #default="{ row }">
                <el-tag :type="row.direction === '收入' ? 'success' : 'warning'" size="small" effect="plain">{{ row.direction }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="收款方式" width="90">
              <template #default="{ row }">
                <el-tag :type="methodType(row.method)" size="small" effect="plain">{{ row.method }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="92" align="right">
              <template #default="{ row }">¥{{ fmt(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="已匹配" width="82" align="right">
              <template #default="{ row }">¥{{ fmt(row.matched) }}</template>
            </el-table-column>
            <el-table-column label="未匹配" width="82" align="right">
              <template #default="{ row }"><span class="num-green">¥{{ fmt(row.remain) }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="82" align="center">
              <template #default="{ row }">
                <el-tag :type="flowStatus(row).type" size="small" effect="light">{{ flowStatus(row).text }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- ================= 下半部：今日挂/销账 + 明细匹配内容 ================= -->
    <div class="flow-panels bottom">
      <!-- 今日挂 / 销账 -->
      <div class="flow-panel hang-panel">
        <div class="panel-head">
          <span class="panel-title">今日挂 / 销账</span>
          <span class="panel-sub">{{ today }}</span>
        </div>
        <div class="panel-body">
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-label">今日挂账</div>
              <div class="stat-val num-blue">¥{{ fmt(todayHangAmount) }}</div>
              <div class="stat-sub">{{ todayHangCount }} 笔</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">今日销账</div>
              <div class="stat-val num-green">¥{{ fmt(todayWriteoffAmount) }}</div>
              <div class="stat-sub">{{ todayWriteoffCount }} 笔</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">待处理挂账余额</div>
              <div class="stat-val num-orange">¥{{ fmt(totalHangRemain) }}</div>
              <div class="stat-sub">累计未匹配</div>
            </div>
          </div>

          <div class="list-title">今日挂 / 销账明细</div>
          <el-table :data="todayActivities" size="small" border height="206">
            <el-table-column label="类型" width="76" align="center">
              <template #default="{ row }">
                <el-tag :type="row.kind === '挂账' ? 'info' : 'success'" size="small" effect="plain">{{ row.kind }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="no" label="单号" width="120" />
            <el-table-column prop="customer" label="客户" min-width="140" show-overflow-tooltip />
            <el-table-column label="金额" width="104" align="right">
              <template #default="{ row }">¥{{ fmt(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="time" label="时间" width="164" />
          </el-table>
        </div>
      </div>

      <!-- 明细匹配内容 -->
      <div class="flow-panel match-panel">
        <div class="panel-head">
          <span class="panel-title">明细匹配内容</span>
          <div class="match-tabs">
            <span class="match-tab" :class="{ active: matchTab === 'pending' }" @click="matchTab = 'pending'">
              待确认占配 ({{ plan.length }})
            </span>
            <span class="match-tab" :class="{ active: matchTab === 'done' }" @click="matchTab = 'done'">
              已匹配明细 ({{ matchRecords.length }})
            </span>
          </div>
        </div>
        <div class="panel-body">
          <!-- 待确认占配 -->
          <template v-if="matchTab === 'pending'">
            <div v-if="!plan.length" class="empty-tip">
              勾选左侧面单与右侧资金流水后，将按「日期优先、先勾先占」自动生成占配关系；也可点击「自动匹配」一键生成。
            </div>
            <template v-else>
              <el-table :data="plan" size="small" border height="272">
                <el-table-column type="index" label="#" width="48" align="center" />
                <el-table-column prop="waybillNo" label="面单号" width="120" />
                <el-table-column prop="flowNo" label="流水号" width="120" />
                <el-table-column prop="customer" label="客户" min-width="140" show-overflow-tooltip />
                <el-table-column label="匹配金额" width="168">
                  <template #default="{ row, $index }">
                    <el-input-number
                      v-model="row.amount"
                      :min="0"
                      :max="planRowMax(row)"
                      :step="100"
                      size="small"
                      controls-position="right"
                      @change="onPlanAmountChange($index)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="76" align="center">
                  <template #default="{ $index }">
                    <el-button link type="danger" size="small" @click="removePlanRow($index)">移除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="match-foot">共 {{ plan.length }} 条占配 · 合计 ¥{{ fmt(planTotal) }}</div>
            </template>
          </template>

          <!-- 已匹配明细 -->
          <template v-else>
            <div v-if="!matchRecords.length" class="empty-tip">暂无匹配记录，确认匹配后将在此显示。</div>
            <el-table v-else :data="matchRecords" size="small" border height="272">
              <el-table-column prop="no" label="匹配单号" width="120" />
              <el-table-column prop="waybillNo" label="面单号" width="120" />
              <el-table-column prop="flowNo" label="流水号" width="120" />
              <el-table-column prop="customer" label="客户" min-width="140" show-overflow-tooltip />
              <el-table-column label="匹配金额" width="104" align="right">
                <template #default="{ row }">¥{{ fmt(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="time" label="匹配时间" width="164" />
              <el-table-column prop="operator" label="操作人" width="82" />
              <el-table-column label="操作" width="76" align="center">
                <template #default="{ row }">
                  <el-button link type="danger" size="small" @click="handleReverse(row)">撤销</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'FundFlow'
})

import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getUser } from '@/utils/auth'

/* =========================================================
   基础工具
   ========================================================= */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const fmt = (n) =>
  Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = fmtDate(new Date())
const nowStr = () => {
  const d = new Date()
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* =========================================================
   展示字典（收款方式标签配色，非业务数据）
   ========================================================= */
const METHOD_TAG = { 银行转账: 'primary', 微信: 'success', 支付宝: 'info', 现金: 'warning', 月结: 'danger' }

const currentUser = getUser()

/* =========================================================
   数据
   ---------------------------------------------------------
   已接入：
     GET  /api/flowDetail/recharge/list   面单明细（支持筛选）
   待接入：
     GET  /api/flowDetail/cash/list       资金流水明细（后端待开发）
     POST /api/flowDetail/match           确认匹配 { rechargeIds, cashIds }
     POST /api/flowDetail/unmatch         取消匹配 { rechargeIds, cashIds }
   ========================================================= */
const loading = ref(false)
const waybills = ref([])     // 面单明细（接口原始行 + 规范化辅助字段）
const fundFlows = ref([])    // 资金流水明细（接口待开发）
const matchRecords = ref([]) // 已匹配记录（接口待开发）

/* 面单明细筛选（对应接口查询参数） */
const searchForm = ref({
  fromCustName: '',
  operateType: '',
  payType: '',
  matchStatus: null,
  timeRange: null
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
    operateType: '',
    payType: '',
    matchStatus: null,
    timeRange: null
  }
  getWaybillList()
}

const loadData = () => {
  getWaybillList()
  // TODO: 资金流水明细 / 已匹配记录接口开发完成后在此加载
}

/* 索引：id → 行对象（数据加载后自动更新） */
const waybillMap = computed(() => {
  const map = {}
  waybills.value.forEach((w) => (map[w.id] = w))
  return map
})
const flowMap = computed(() => {
  const map = {}
  fundFlows.value.forEach((f) => (map[f.id] = f))
  return map
})

/* =========================================================
   交互状态
   ========================================================= */
const selectedWaybills = ref([])
const selectedFlows = ref([])
const plan = ref([])
const matchTab = ref('pending')
const waybillTableRef = ref(null)
const flowTableRef = ref(null)

/* =========================================================
   派生数据
   ========================================================= */
const visibleFlows = computed(() => fundFlows.value)
const sumWaybillRemain = computed(() => round2(waybills.value.reduce((s, w) => s + w.remain, 0)))
const sumFlowRemain = computed(() =>
  round2(visibleFlows.value.filter((f) => f.direction === '收入').reduce((s, f) => s + f.remain, 0))
)
const planTotal = computed(() => round2(plan.value.reduce((s, p) => s + Number(p.amount || 0), 0)))
const canConfirm = computed(() => plan.value.length > 0 && planTotal.value > 0.005)

/* 今日挂 / 销账 */
const todayHangList = computed(() => waybills.value.filter((w) => w.date === today))
const todayHangAmount = computed(() => round2(todayHangList.value.reduce((s, w) => s + w.amount, 0)))
const todayHangCount = computed(() => todayHangList.value.length)
const todayWriteoffList = computed(() => matchRecords.value.filter((r) => r.time.startsWith(today)))
const todayWriteoffAmount = computed(() => round2(todayWriteoffList.value.reduce((s, r) => s + r.amount, 0)))
const todayWriteoffCount = computed(() => todayWriteoffList.value.length)
const totalHangRemain = computed(() => round2(waybills.value.reduce((s, w) => s + w.remain, 0)))
const todayActivities = computed(() => {
  const hangs = todayHangList.value.map((w) => ({
    kind: '挂账',
    no: String(w.id),
    customer: w.customer,
    amount: w.amount,
    time: w.operateTime
  }))
  const woffs = todayWriteoffList.value.map((r) => ({
    kind: '销账',
    no: r.no,
    customer: r.customer,
    amount: r.amount,
    time: r.time
  }))
  return [...hangs, ...woffs].sort((a, b) => (a.time < b.time ? 1 : -1))
})

/* =========================================================
   展示辅助
   ========================================================= */
/* 面单匹配状态：0未匹配，1部分匹配，2已匹配（接口文档约定） */
const waybillStatus = (w) => {
  if (w.matchStatus === 2) return { text: '已匹配', type: 'success' }
  if (w.matchStatus === 1) return { text: '部分匹配', type: 'warning' }
  return { text: '未匹配', type: 'danger' }
}
const flowStatus = (f) => {
  if (f.direction === '支出') return { text: '支出', type: 'info' }
  if (f.matched <= 0.005) return { text: '未匹配', type: 'danger' }
  if (f.matched < f.amount - 0.005) return { text: '部分匹配', type: 'warning' }
  return { text: '已匹配', type: 'success' }
}
const methodType = (m) => METHOD_TAG[m] || 'info'

/* =========================================================
   占配计算（按客户分组，日期优先、先勾先占的 FIFO 撮合）
   ========================================================= */
function recomputePlan() {
  const next = []
  const custs = new Set([...selectedWaybills.value, ...selectedFlows.value].map((x) => x.customer))
  custs.forEach((cust) => {
    const ws = selectedWaybills.value
      .filter((w) => w.customer === cust && w.remain > 0.005)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((w) => ({ row: w, need: w.remain }))
    const fs = selectedFlows.value
      .filter((f) => f.customer === cust && f.direction === '收入' && f.remain > 0.005)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((f) => ({ row: f, need: f.remain }))

    let i = 0
    let j = 0
    while (i < ws.length && j < fs.length) {
      const a = ws[i]
      const b = fs[j]
      const amt = round2(Math.min(a.need, b.need))
      if (amt > 0.005) next.push({ waybillId: a.row.id, flowId: b.row.id, waybillNo: String(a.row.id), flowNo: String(b.row.id), customer: cust, amount: amt })
      a.need = round2(a.need - amt)
      b.need = round2(b.need - amt)
      if (a.need <= 0.005) i++
      if (b.need <= 0.005) j++
    }
  })
  plan.value = next
}

const onWaybillSelect = (rows) => {
  selectedWaybills.value = rows
  recomputePlan()
}
const onFlowSelect = (rows) => {
  selectedFlows.value = rows
  recomputePlan()
}

/* 自动匹配：勾选当前列表中全部可匹配行，再由 FIFO 生成占配 */
function handleAutoMatch() {
  waybillTableRef.value?.clearSelection()
  flowTableRef.value?.clearSelection()
  nextTick(() => {
    waybills.value.forEach((w) => {
      if (w.remain > 0.005) waybillTableRef.value?.toggleRowSelection(w, true)
    })
    visibleFlows.value.forEach((f) => {
      if (f.remain > 0.005 && f.direction === '收入') {
        flowTableRef.value?.toggleRowSelection(f, true)
      }
    })
    if (!plan.value.length) ElMessage.info('没有可自动匹配的面单或资金流水')
    else ElMessage.success(`自动匹配完成：生成 ${plan.value.length} 条占配`)
  })
}

function handleClearPlan() {
  waybillTableRef.value?.clearSelection()
  flowTableRef.value?.clearSelection()
  selectedWaybills.value = []
  selectedFlows.value = []
  plan.value = []
  ElMessage.info('已清空本次占配')
}

/* 占配行的可编辑上限（扣除同面单/同流水其它占配行占用后的余量） */
function planRowMax(row) {
  const w = waybillMap.value[row.waybillId]
  const f = flowMap.value[row.flowId]
  if (!w || !f) return 0
  const otherW = plan.value
    .filter((p) => p.waybillId === row.waybillId && p !== row)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  const otherF = plan.value
    .filter((p) => p.flowId === row.flowId && p !== row)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  return Math.max(0, round2(Math.min(w.remain - otherW, f.remain - otherF)))
}

function onPlanAmountChange(index) {
  const row = plan.value[index]
  if (row && Number(row.amount) <= 0.005) plan.value.splice(index, 1)
}
function removePlanRow(index) {
  plan.value.splice(index, 1)
}

/* 确认匹配：写入匹配记录并回写双边余额
   TODO: 改为 POST /api/flowDetail/match，传 { rechargeIds, cashIds }，成功后刷新列表 */
function handleConfirm() {
  if (!canConfirm.value) return
  const time = nowStr()
  plan.value.forEach((p) => {
    const w = waybillMap.value[p.waybillId]
    const f = flowMap.value[p.flowId]
    if (!w || !f) return
    const amt = round2(Math.min(Number(p.amount || 0), w.remain, f.remain))
    if (amt <= 0.005) return
    w.matched = round2(w.matched + amt)
    w.remain = round2(w.remain - amt)
    f.matched = round2(f.matched + amt)
    f.remain = round2(f.remain - amt)
    matchRecords.value.unshift({
      no: '', // TODO: 匹配单号由后端生成
      waybillNo: p.waybillNo,
      flowNo: p.flowNo,
      customer: w.customer,
      amount: amt,
      time,
      operator: currentUser?.realName || currentUser?.username || ''
    })
  })
  waybillTableRef.value?.clearSelection()
  flowTableRef.value?.clearSelection()
  selectedWaybills.value = []
  selectedFlows.value = []
  plan.value = []
  matchTab.value = 'done'
  ElMessage.success('匹配成功，已生成匹配记录')
}

/* 撤销匹配：恢复双边余额并移除记录
   TODO: 改为 POST /api/flowDetail/unmatch，成功后刷新列表 */
function handleReverse(row) {
  const idx = matchRecords.value.findIndex((r) => r === row || (r.no && r.no === row.no))
  if (idx < 0) return
  const rec = matchRecords.value[idx]
  const w = waybills.value.find((x) => String(x.id) === rec.waybillNo)
  const f = fundFlows.value.find((x) => String(x.id) === rec.flowNo)
  if (w) {
    w.matched = round2(w.matched - rec.amount)
    w.remain = round2(w.remain + rec.amount)
  }
  if (f) {
    f.matched = round2(f.matched - rec.amount)
    f.remain = round2(f.remain + rec.amount)
  }
  matchRecords.value.splice(idx, 1)
  ElMessage.success('已撤销匹配')
}

onMounted(loadData)
</script>

<style scoped>
.fund-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 顶部工具条 ---------- */
.flow-toolbar {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
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
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ---------- 面板通用 ---------- */
.flow-panels {
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.flow-panels > .flow-panel {
  flex: 1 1 0;
  min-width: 0;
}
.flow-panels.bottom > .match-panel {
  flex: 1.4 1 0;
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

/* ---------- 今日挂/销账 ---------- */
.stat-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1 1 0;
  min-width: 120px;
  background: #f8fafd;
  border: 1px solid #eef2f8;
  border-radius: 8px;
  padding: 12px 14px;
}
.stat-label {
  font-size: 12.5px;
  color: #8a94a6;
  margin-bottom: 6px;
}
.stat-val {
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.stat-sub {
  font-size: 12px;
  color: #8a94a6;
  margin-top: 4px;
}
.list-title {
  font-size: 13px;
  font-weight: 600;
  color: #5a6577;
  margin-bottom: 8px;
}

/* ---------- 明细匹配内容 ---------- */
.match-tabs {
  display: flex;
  gap: 4px;
  background: #f2f5f9;
  padding: 3px;
  border-radius: 7px;
}
.match-tab {
  padding: 5px 14px;
  border-radius: 5px;
  font-size: 12.5px;
  color: #5a6577;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.match-tab:hover {
  color: #1677ff;
}
.match-tab.active {
  background: #fff;
  color: #1677ff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 35, 70, 0.14);
}
.empty-tip {
  padding: 56px 24px;
  text-align: center;
  color: #8a94a6;
  font-size: 13px;
  line-height: 1.9;
}
.match-foot {
  margin-top: 12px;
  text-align: right;
  font-size: 13px;
  color: #5a6577;
}

/* ---------- 窄屏堆叠 ---------- */
@media (max-width: 1200px) {
  .flow-panels {
    flex-direction: column;
  }
  .flow-panels.bottom > .match-panel {
    flex: 1 1 auto;
  }
}
</style>
