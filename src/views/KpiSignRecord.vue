<template>
  <div class="page-container">
    <div class="kpi-tabs">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="月度汇总" name="summary" />
        <el-tab-pane label="按日期查询" name="query" />
        <el-tab-pane label="小件员排名" name="rank" />
        <el-tab-pane label="导入Excel" name="import" />
      </el-tabs>
    </div>

    <template v-if="activeTab === 'summary'">
      <div class="month-selector">
        <el-select v-model="selectedMonth" placeholder="选择月份" @change="loadSummaryData" style="width: 150px">
          <el-option v-for="m in monthOptions" :key="m.value" :value="m.value" :label="m.label" />
        </el-select>
      </div>

      <div class="kpi-cards">
        <div class="kpi-card">
          <div class="kpi-label">本月总单量</div>
          <div class="kpi-value">{{ summaryData.totalCount || 0 }}</div>
          <div class="kpi-trend" :class="summaryData.totalCountTrend && summaryData.totalCountTrend > 0 ? 'up' : 'down'">
            {{ summaryData.totalCountTrend ? (summaryData.totalCountTrend > 0 ? '+' : '') + summaryData.totalCountTrend + '%' : '-' }}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">投诉单量</div>
          <div class="kpi-value">{{ summaryData.complaintCount || 0 }}</div>
          <div class="kpi-trend" :class="summaryData.complaintCountTrend && summaryData.complaintCountTrend > 0 ? 'up' : 'down'">
            {{ summaryData.complaintCountTrend ? (summaryData.complaintCountTrend > 0 ? '+' : '') + summaryData.complaintCountTrend + '%' : '-' }}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">虚假签收</div>
          <div class="kpi-value">{{ summaryData.fakeSignCount || 0 }}</div>
          <div class="kpi-trend" :class="summaryData.fakeSignCountTrend && summaryData.fakeSignCountTrend > 0 ? 'up' : 'down'">
            {{ summaryData.fakeSignCountTrend ? (summaryData.fakeSignCountTrend > 0 ? '+' : '') + summaryData.fakeSignCountTrend + '%' : '-' }}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">签前电联率</div>
          <div class="kpi-value">{{ (summaryData.preSignCallRate || 0) + '%' }}</div>
          <div class="kpi-trend" :class="summaryData.preSignCallRateTrend && summaryData.preSignCallRateTrend > 0 ? 'up' : 'down'">
            {{ summaryData.preSignCallRateTrend ? (summaryData.preSignCallRateTrend > 0 ? '+' : '') + summaryData.preSignCallRateTrend + '%' : '-' }}
          </div>
        </div>
      </div>

      <div class="section-row">
        <div class="card">
          <div class="card-title">小件员单量分布</div>
          <div class="bar-chart">
            <div v-for="item in courierRank" :key="item.courierCode" class="bar-item">
              <span class="bar-label">{{ item.courierName }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: maxCount > 0 ? (item.totalCount / maxCount * 100) + '%' : '0%' }"></div>
              </div>
              <span class="bar-count">{{ item.totalCount }}单</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">虚假签收大类占比</div>
          <div class="pie-section">
            <div class="pie-chart">
              <svg width="120" height="120" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" stroke-width="8" />
                <circle
                  v-for="(item, index) in fakeSignTypeStats"
                  :key="item.fakeSignType"
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  :stroke="getTypeColor(item.fakeSignType)"
                  stroke-width="8"
                  :stroke-dasharray="getStrokeDasharray(item.percentage, index)"
                  :stroke-dashoffset="getStrokeDashoffset(index)"
                  transform="rotate(-90 18 18)"
                />
                <circle cx="18" cy="18" r="9" fill="#fff" />
              </svg>
            </div>
            <div class="pie-legend">
              <div v-for="item in fakeSignTypeStats" :key="item.fakeSignType" class="legend-item">
                <span class="legend-dot" :style="{ background: getTypeColor(item.fakeSignType) }"></span>
                <span>{{ item.fakeSignType }}</span>
                <span class="legend-count">{{ item.percentage }}%</span>
              </div>
            </div>
          </div>
          <div class="sign-call-rate">
            <div class="bar-item">
              <span class="bar-label">签前电联</span>
              <div class="bar-track">
                <div class="bar-fill sign-call" :style="{ width: (summaryData.preSignCallRate || 0) + '%' }"></div>
              </div>
              <span class="bar-count">{{ (summaryData.preSignCallRate || 0) + '%' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card detail-card">
        <div class="card-title">明细查询</div>
        <div class="search-box">
          <el-form :inline="true" :model="searchForm">
            <el-form-item label="日期范围">
              <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
            </el-form-item>
            <el-form-item label="小件员">
              <el-select v-model="searchForm.courierName" placeholder="请选择小件员" clearable style="width: 120px">
                <el-option v-for="courier in courierOptions" :key="courier" :value="courier" :label="courier" />
              </el-select>
            </el-form-item>
            <el-form-item label="达标">
              <el-select v-model="searchForm.isQualified" placeholder="全部" clearable style="width: 80px">
                <el-option :value="1" label="是" />
                <el-option :value="0" label="否" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="getList">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
        <div class="table-box">
          <el-table :data="tableData" v-loading="loading" border>
            <el-table-column prop="dataDate" label="数据日期" width="120" />
            <el-table-column prop="waybillNo" label="运单号" width="160">
              <template #default="{ row }">
                <span class="waybill-link">{{ row.waybillNo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reportTime" label="投递/上报时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.reportTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="fakeSignType" label="虚假签收大类" width="120">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.fakeSignType)">{{ row.fakeSignType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="signTime" label="签收时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.signTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="isQualified" label="达标" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isQualified === 1 ? 'success' : 'danger'">{{ row.isQualified === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="preSignCall" label="签前电联" width="100">
              <template #default="{ row }">
                <el-tag :type="row.preSignCall === 1 ? 'success' : 'danger'">{{ row.preSignCall === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="efficiencyHours" label="时效(h)" width="100" />
            <el-table-column prop="courierName" label="小件员" width="100" />
            <el-table-column prop="branchName" label="分部名称" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="handleDelete(row)" v-if="hasBtnPermission('删除虚假签收记录', '删除', '移除')">删除</el-button>
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
      </div>
    </template>

    <template v-else-if="activeTab === 'query'">
      <div class="card">
        <div class="card-title">按日期查询</div>
        <div class="search-box">
          <el-form :inline="true" :model="searchForm">
            <el-form-item label="日期范围">
              <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
            </el-form-item>
            <el-form-item label="运单号">
              <el-input v-model="searchForm.waybillNo" placeholder="请输入运单号" clearable style="width: 200px" />
            </el-form-item>
            <el-form-item label="小件员">
              <el-select v-model="searchForm.courierName" placeholder="请选择小件员" clearable style="width: 120px">
                <el-option v-for="courier in courierOptions" :key="courier" :value="courier" :label="courier" />
              </el-select>
            </el-form-item>
            <el-form-item label="达标">
              <el-select v-model="searchForm.isQualified" placeholder="全部" clearable style="width: 80px">
                <el-option :value="1" label="是" />
                <el-option :value="0" label="否" />
              </el-select>
            </el-form-item>
            <el-form-item label="虚假签收类型">
              <el-select v-model="searchForm.fakeSignType" placeholder="全部" clearable style="width: 120px">
                <el-option v-for="type in fakeSignTypes" :key="type" :value="type" :label="type" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="getList">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
        <div class="table-box">
          <el-table :data="tableData" v-loading="loading" border>
            <el-table-column prop="dataDate" label="数据日期" width="120" />
            <el-table-column prop="waybillNo" label="运单号" width="160">
              <template #default="{ row }">
                <span class="waybill-link">{{ row.waybillNo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reportTime" label="投递/上报时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.reportTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="fakeSignType" label="虚假签收大类" width="120">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.fakeSignType)">{{ row.fakeSignType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="signTime" label="签收时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.signTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="isQualified" label="达标" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isQualified === 1 ? 'success' : 'danger'">{{ row.isQualified === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="preSignCall" label="签前电联" width="100">
              <template #default="{ row }">
                <el-tag :type="row.preSignCall === 1 ? 'success' : 'danger'">{{ row.preSignCall === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="efficiencyHours" label="时效(h)" width="100" />
            <el-table-column prop="courierName" label="小件员" width="100" />
            <el-table-column prop="branchName" label="分部名称" />
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
      </div>
    </template>

    <template v-else-if="activeTab === 'rank'">
      <div class="month-selector">
        <el-select v-model="selectedMonth" placeholder="选择月份" @change="loadCourierRank" style="width: 150px">
          <el-option v-for="m in monthOptions" :key="m.value" :value="m.value" :label="m.label" />
        </el-select>
      </div>
      <div class="card">
        <div class="card-title">小件员排名</div>
        <div class="table-box">
          <el-table :data="courierRank" v-loading="rankLoading" border>
            <el-table-column label="排名" width="60">
              <template #default="{ row, $index }">
                <span class="rank-num">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="courierName" label="小件员" width="120" />
            <el-table-column prop="totalCount" label="总单量" width="100" />
            <el-table-column prop="qualifiedCount" label="达标量" width="100" />
            <el-table-column prop="qualifiedRate" label="达标率" width="120">
              <template #default="{ row }">
                <div class="rate-bar">
                  <div class="rate-fill" :style="{ width: row.qualifiedRate + '%' }"></div>
                  <span class="rate-text">{{ row.qualifiedRate }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="preSignCallRate" label="签前电联率" width="120">
              <template #default="{ row }">
                <div class="rate-bar">
                  <div class="rate-fill call-rate" :style="{ width: row.preSignCallRate + '%' }"></div>
                  <span class="rate-text">{{ row.preSignCallRate }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="avgEfficiencyHours" label="平均时效(h)" width="120" />
          </el-table>
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'import'">
      <div class="card">
        <div class="card-title">导入Excel</div>
        <div class="import-box">
          <el-upload
            class="upload-demo"
            action="/kpi/sign-record/import"
            :headers="uploadHeaders"
            :on-success="handleImportSuccess"
            :on-error="handleImportError"
            :before-upload="beforeUpload"
            accept=".xlsx,.xls"
            :show-file-list="false"
          >
            <el-button type="primary" size="large">
              <el-icon><Upload /></el-icon>
              选择Excel文件
            </el-button>
          </el-upload>
          <p class="import-tip">支持 .xlsx 和 .xls 格式文件</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '../utils/auth'

const activeTab = ref('summary')
const selectedMonth = ref('')
const dateRange = ref([])
const loading = ref(false)
const rankLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

const summaryData = reactive({
  totalCount: 0,
  complaintCount: 0,
  fakeSignCount: 0,
  otherCount: 0,
  preSignCallRate: 0,
  qualifiedRate: 0,
  avgEfficiencyHours: 0,
  totalCountTrend: 0,
  complaintCountTrend: 0,
  fakeSignCountTrend: 0,
  preSignCallRateTrend: 0
})

const courierRank = ref([])
const fakeSignTypeStats = ref([])
const courierOptions = ref([])
const fakeSignTypes = ['投诉', '虚假签收', '其他']

const monthOptions = computed(() => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    months.push({
      value: `${year}-${month}`,
      label: `${year}-${month}`
    })
  }
  return months
})

const searchForm = reactive({
  startDate: '',
  endDate: '',
  month: '',
  courierName: '',
  isQualified: '',
  waybillNo: '',
  fakeSignType: ''
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const maxCount = computed(() => {
  return Math.max(...courierRank.value.map(item => item.totalCount), 1)
})

const getList = async () => {
  loading.value = true
  try {
    if (dateRange.value.length === 2) {
      searchForm.startDate = dateRange.value[0]
      searchForm.endDate = dateRange.value[1]
    } else {
      searchForm.startDate = ''
      searchForm.endDate = ''
    }
    searchForm.month = activeTab.value === 'summary' ? selectedMonth.value : ''

    const params = {
      ...searchForm,
      pageNum: pageNo.value,
      pageSize: pageSize.value
    }

    if (params.isQualified !== '') {
      params.isQualified = parseInt(params.isQualified)
    }

    const res = await axios.get('/kpi/sign-record/page', { params })
    tableData.value = res.data.data?.records || []
    total.value = res.data.data?.total || 0

    const couriers = [...new Set(tableData.value.map(item => item.courierName))]
    courierOptions.value = couriers.filter(Boolean)
  } catch (err) {
    console.error('查询失败:', err)
  } finally {
    loading.value = false
  }
}

const loadSummaryData = async () => {
  if (!selectedMonth.value) return
  try {
    const res = await axios.get(`/kpi/sign-record/summary/${selectedMonth.value}`)
    const data = res.data.data || {}
    Object.assign(summaryData, data)
  } catch (err) {
    console.error('获取月度汇总失败:', err)
  }
}

const loadCourierRank = async () => {
  if (!selectedMonth.value) return
  rankLoading.value = true
  try {
    const res = await axios.get(`/kpi/sign-record/courier-rank/${selectedMonth.value}`)
    courierRank.value = res.data.data || []
  } catch (err) {
    console.error('获取小件员排名失败:', err)
  } finally {
    rankLoading.value = false
  }
}

const loadFakeSignTypeStats = async () => {
  if (!selectedMonth.value) return
  try {
    const res = await axios.get(`/kpi/sign-record/fake-sign-type/${selectedMonth.value}`)
    fakeSignTypeStats.value = res.data.data || []
  } catch (err) {
    console.error('获取虚假签收类型统计失败:', err)
  }
}

const resetSearch = () => {
  dateRange.value = []
  Object.assign(searchForm, {
    startDate: '',
    endDate: '',
    month: '',
    courierName: '',
    isQualified: '',
    waybillNo: '',
    fakeSignType: ''
  })
  pageNo.value = 1
  getList()
}

const handleTabChange = (tab) => {
  if (tab === 'summary') {
    if (!selectedMonth.value) {
      selectedMonth.value = monthOptions.value[0].value
    }
    loadSummaryData()
    loadCourierRank()
    loadFakeSignTypeStats()
    getList()
  } else if (tab === 'rank') {
    if (!selectedMonth.value) {
      selectedMonth.value = monthOptions.value[0].value
    }
    loadCourierRank()
  } else {
    getList()
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete(`/kpi/sign-record/${row.id}`)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const handleImportSuccess = (res) => {
  ElMessage.success(`导入成功，共导入 ${res.data.count || 0} 条记录`)
  getList()
}

const handleImportError = () => {
  ElMessage.error('导入失败')
}

const beforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.ms-excel' || 
                  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (!isExcel) {
    ElMessage.error('请上传Excel文件')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过5MB')
    return false
  }
  return true
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const getTypeColor = (type) => {
  const colors = {
    '投诉': '#378ADD',
    '虚假签收': '#E24B4A',
    '其他': '#639922'
  }
  return colors[type] || '#999'
}

const getTypeTagType = (type) => {
  const types = {
    '投诉': 'info',
    '虚假签收': 'danger',
    '其他': 'success'
  }
  return types[type] || 'default'
}

const getStrokeDasharray = (percentage, index) => {
  return `${percentage * 8.796} 100`
}

const getStrokeDashoffset = (index) => {
  let offset = 25
  for (let i = 0; i < index; i++) {
    offset -= fakeSignTypeStats.value[i]?.percentage * 8.796 || 0
  }
  return offset
}

onMounted(() => {
  selectedMonth.value = monthOptions.value[0].value
  loadSummaryData()
  loadCourierRank()
  loadFakeSignTypeStats()
  getList()
})
</script>

<style scoped>
.kpi-tabs {
  margin-bottom: 16px;
}

.month-selector {
  margin-bottom: 16px;
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.kpi-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
}

.kpi-label {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 4px;
}

.kpi-trend {
  font-size: 12px;
  opacity: 0.8;
}

.kpi-trend.up {
  color: #9FE1CB;
}

.kpi-trend.down {
  color: #FCEBEB;
}

.section-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 13px;
  color: #666;
  width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #378ADD, #5BA8FF);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.bar-fill.sign-call {
  background: linear-gradient(90deg, #9FE1CB, #5BC49F);
}

.bar-count {
  font-size: 13px;
  color: #333;
  width: 60px;
  text-align: left;
  flex-shrink: 0;
}

.pie-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.pie-chart {
  flex-shrink: 0;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-count {
  margin-left: auto;
  font-weight: 500;
  color: #333;
}

.sign-call-rate {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.detail-card {
  margin-bottom: 0;
}

.search-box {
  margin-bottom: 16px;
}

.table-box {
  margin-bottom: 16px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
}

.waybill-link {
  color: #185FA5;
  cursor: pointer;
}

.waybill-link:hover {
  text-decoration: underline;
}

.rank-num {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  background: #f0f0f0;
  font-size: 12px;
}

.rate-bar {
  position: relative;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, #5BC49F, #37B88B);
  border-radius: 10px;
}

.rate-fill.call-rate {
  background: linear-gradient(90deg, #5BA8FF, #378ADD);
}

.rate-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #666;
}

.import-box {
  text-align: center;
  padding: 40px;
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  background: #fafafa;
}

.import-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

.upload-demo {
  display: inline-block;
}
</style>