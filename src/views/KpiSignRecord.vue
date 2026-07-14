<template>
  <div class="page-container">
    <div class="section-row">
      <div class="card">
        <div class="card-title">快递员单量分布</div>
        <div class="bar-chart-scroll">
          <div v-for="(item, index) in courierRank" :key="item.courierCode" class="bar-item">
            <span class="bar-label">{{ item.courierName }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: maxCourierCount > 0 ? (item.totalCount / maxCourierCount * 100) + '%' : '0%', background: getCourierBarColor(index, courierRank.length) }"></div>
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
      </div>

      <div class="card">
        <div class="card-title">散单未达标排名</div>
        <div class="bar-chart-scroll">
          <div v-for="(item, index) in salesmanRank" :key="item.salesmanName" class="bar-item">
            <span class="bar-label">{{ item.salesmanName }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: maxSalesmanCount > 0 ? (item.totalCount / maxSalesmanCount * 100) + '%' : '0%', background: getSalesmanBarColor(index, salesmanRank.length) }"></div>
            </div>
            <span class="bar-count">{{ item.totalCount }}单</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card detail-card">
      <div class="kpi-tabs">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="虚假签收" name="fakeSign" />
          <el-tab-pane label="散单首揽" name="collection" />
        </el-tabs>
      </div>

      <template v-if="activeTab === 'fakeSign'">
        <div class="search-box">
          <el-form :inline="true" :model="fakeSignSearch">
            <el-form-item label="日期范围">
              <el-date-picker v-model="fakeSignDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="快递员">
              <el-select v-model="fakeSignSearch.courierName" placeholder="请选择快递员" clearable style="width: 120px">
                <el-option v-for="courier in courierOptions" :key="courier" :value="courier" :label="courier" />
              </el-select>
            </el-form-item>
            <el-form-item label="达标">
              <el-select v-model="fakeSignSearch.isQualified" placeholder="全部" clearable style="width: 80px">
                <el-option :value="1" label="是" />
                <el-option :value="0" label="否" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="getFakeSignList">查询</el-button>
              <el-button @click="resetFakeSignSearch">重置</el-button>
              <el-button type="primary" @click="showFakeSignImport = true" v-if="hasBtnPermission('report:quality:fakeSign:import', '导入虚假签收记录', '导入')">导入</el-button>
            </el-form-item>
          </el-form>
        </div>
        <div class="table-box">
          <el-table :data="fakeSignTableData" v-loading="fakeSignLoading" border style="width: 100%" :default-alignment="'center'">
            <el-table-column prop="dataDate" label="数据日期" width="120" />
            <el-table-column prop="waybillNo" label="运单号" width="160">
              <template #default="{ row }">
                <span class="waybill-link">{{ row.waybillNo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reportTime" label="投递/上报时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.reportTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="fakeSignType" label="虚假签收大类" width="140">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.fakeSignType)">{{ row.fakeSignType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="signTime" label="签收时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.signTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="isQualified" label="达标" width="70">
              <template #default="{ row }">
                <el-tag :type="row.isQualified === 1 ? 'success' : 'danger'">{{ row.isQualified === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="preSignCall" label="签前电联" width="90">
              <template #default="{ row }">
                <el-tag :type="row.preSignCall === 1 ? 'success' : 'danger'">{{ row.preSignCall === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="efficiencyHours" label="时效(h)" width="90" />
            <el-table-column prop="courierName" label="快递员" min-width="100" />
          </el-table>
        </div>
        <div class="pagination-box">
          <el-pagination
            v-model:current-page="fakeSignPageNo"
            v-model:page-size="fakeSignPageSize"
            :total="fakeSignTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="getFakeSignList"
            @current-change="getFakeSignList"
          />
        </div>
      </template>

      <template v-else-if="activeTab === 'collection'">
        <div class="search-box">
          <el-form :inline="true" :model="collectionSearch">
            <el-form-item label="日期范围">
              <el-date-picker v-model="collectionDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="业务员">
              <el-select v-model="collectionSearch.salesmanName" placeholder="请选择业务员" clearable style="width: 120px">
                <el-option v-for="salesman in salesmanOptions" :key="salesman" :value="salesman" :label="salesman" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="getCollectionList">查询</el-button>
              <el-button @click="resetCollectionSearch">重置</el-button>
              <el-button type="primary" @click="showCollectionImport = true" v-if="hasBtnPermission('report:quality:collection:import', '导入散单首揽记录', '导入')">导入</el-button>
            </el-form-item>
          </el-form>
        </div>
        <div class="table-box">
          <el-table :data="collectionTableData" v-loading="collectionLoading" border style="width: 100%; table-layout: fixed;" :default-alignment="'center'">
            <el-table-column prop="waybillNo" label="运单号" width="250">
              <template #default="{ row }">
                <span class="waybill-link">{{ row.waybillNo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="orderNo" label="订单号" width="430" />
            <el-table-column prop="expectedCollectionTime" label="期望揽收时间" width="250">
              <template #default="{ row }">
                {{ formatDateTime(row.expectedCollectionTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="actualCollectionTime" label="实际揽收时间" width="250">
              <template #default="{ row }">
                {{ formatDateTime(row.actualCollectionTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="salesmanName" label="业务员" width="150" />
            <el-table-column prop="collectionDelayMinutes" label="延误分钟" width="120" />
            <el-table-column prop="isDelay" label="是否延误" width="150">
              <template #default="{ row }">
                <el-tag :type="row.isDelay === 1 ? 'danger' : 'success'">{{ row.isDelay === 1 ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination-box">
          <el-pagination
            v-model:current-page="collectionPageNo"
            v-model:page-size="collectionPageSize"
            :total="collectionTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="getCollectionList"
            @current-change="getCollectionList"
          />
        </div>
      </template>
    </div>
  </div>

  <el-dialog
    v-model="showFakeSignImport"
    title="导入虚假签收Excel"
    width="400px"
    destroy-on-close
  >
    <div class="import-box">
      <el-upload
        class="upload-demo"
        action="/api/kpi/sign-record/import"
        :headers="uploadHeaders"
        :on-success="handleFakeSignImportSuccess"
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
    <template #footer>
      <el-button @click="showFakeSignImport = false">取消</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showCollectionImport"
    title="导入散单首揽Excel"
    width="400px"
    destroy-on-close
  >
    <div class="import-box">
      <el-upload
        class="upload-demo"
        action="/api/collection/record/import"
        :headers="uploadHeaders"
        :on-success="handleCollectionImportSuccess"
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
    <template #footer>
      <el-button @click="showCollectionImport = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '../utils/auth'

const activeTab = ref('fakeSign')

const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

const fakeSignDateRange = ref([yesterdayStr, yesterdayStr])
const fakeSignLoading = ref(false)
const fakeSignTableData = ref([])
const fakeSignTotal = ref(0)
const fakeSignPageNo = ref(1)
const fakeSignPageSize = ref(10)
const showFakeSignImport = ref(false)

const courierRank = ref([])
const fakeSignTypeStats = ref([])
const courierOptions = ref([])

const fakeSignSearch = reactive({
  startDate: yesterdayStr,
  endDate: yesterdayStr,
  courierName: '',
  isQualified: ''
})

const collectionDateRange = ref([yesterdayStr, yesterdayStr])
const collectionLoading = ref(false)
const collectionTableData = ref([])
const collectionTotal = ref(0)
const collectionPageNo = ref(1)
const collectionPageSize = ref(10)
const showCollectionImport = ref(false)

const salesmanRank = ref([])
const salesmanOptions = ref([])

const collectionSearch = reactive({
  startDate: yesterdayStr,
  endDate: yesterdayStr,
  salesmanName: ''
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const maxCourierCount = computed(() => {
  return Math.max(...courierRank.value.map(item => item.totalCount), 1)
})

const maxSalesmanCount = computed(() => {
  return Math.max(...salesmanRank.value.map(item => item.totalCount), 1)
})

const getFakeSignList = async () => {
  fakeSignLoading.value = true
  try {
    if (fakeSignDateRange.value.length === 2) {
      fakeSignSearch.startDate = fakeSignDateRange.value[0]
      fakeSignSearch.endDate = fakeSignDateRange.value[1]
    } else {
      fakeSignSearch.startDate = ''
      fakeSignSearch.endDate = ''
    }

    const params = {
      ...fakeSignSearch,
      pageNum: fakeSignPageNo.value,
      pageSize: fakeSignPageSize.value
    }

    if (params.isQualified !== '') {
      params.isQualified = parseInt(params.isQualified)
    }

    const res = await axios.get('/api/kpi/sign-record/page', { params })
    fakeSignTableData.value = res.data.data?.records || []
    fakeSignTotal.value = res.data.data?.total || 0

    const couriers = [...new Set(fakeSignTableData.value.map(item => item.courierName))]
    courierOptions.value = couriers.filter(Boolean)

    if (fakeSignSearch.startDate && fakeSignSearch.endDate) {
      loadCourierRank()
      loadFakeSignTypeStats()
    }
  } catch (err) {
    console.error('查询虚假签收失败:', err)
  } finally {
    fakeSignLoading.value = false
  }
}

const loadCourierRank = async () => {
  try {
    const res = await axios.get('/api/kpi/sign-record/courier-rank', {
      params: {
        startDate: fakeSignSearch.startDate,
        endDate: fakeSignSearch.endDate
      }
    })
    courierRank.value = res.data.data || []
  } catch (err) {
    console.error('获取快递员排名失败:', err)
  }
}

const loadFakeSignTypeStats = async () => {
  try {
    const res = await axios.get('/api/kpi/sign-record/fake-sign-type', {
      params: {
        startDate: fakeSignSearch.startDate,
        endDate: fakeSignSearch.endDate
      }
    })
    fakeSignTypeStats.value = res.data.data || []
  } catch (err) {
    console.error('获取虚假签收类型统计失败:', err)
  }
}

const resetFakeSignSearch = () => {
  fakeSignDateRange.value = [yesterdayStr, yesterdayStr]
  Object.assign(fakeSignSearch, {
    startDate: yesterdayStr,
    endDate: yesterdayStr,
    courierName: '',
    isQualified: ''
  })
  fakeSignPageNo.value = 1
  getFakeSignList()
}

const getCollectionList = async () => {
  collectionLoading.value = true
  try {
    if (collectionDateRange.value.length === 2) {
      collectionSearch.startDate = collectionDateRange.value[0]
      collectionSearch.endDate = collectionDateRange.value[1]
    } else {
      collectionSearch.startDate = ''
      collectionSearch.endDate = ''
    }

    const params = {
      ...collectionSearch,
      pageNum: collectionPageNo.value,
      pageSize: collectionPageSize.value
    }

    const res = await axios.get('/api/collection/record/page', { params })
    collectionTableData.value = res.data.data?.records || []
    collectionTotal.value = res.data.data?.total || 0

    const salesmen = [...new Set(collectionTableData.value.map(item => item.salesmanName))]
    salesmanOptions.value = salesmen.filter(Boolean)

    if (collectionSearch.startDate && collectionSearch.endDate) {
      loadSalesmanRank()
    }
  } catch (err) {
    console.error('查询散单首揽失败:', err)
  } finally {
    collectionLoading.value = false
  }
}

const loadSalesmanRank = async () => {
  try {
    const res = await axios.get('/api/collection/record/salesman-rank', {
      params: {
        startDate: collectionSearch.startDate,
        endDate: collectionSearch.endDate
      }
    })
    salesmanRank.value = res.data.data || []
  } catch (err) {
    console.error('获取业务员排名失败:', err)
  }
}

const resetCollectionSearch = () => {
  collectionDateRange.value = [yesterdayStr, yesterdayStr]
  Object.assign(collectionSearch, {
    startDate: yesterdayStr,
    endDate: yesterdayStr,
    salesmanName: ''
  })
  collectionPageNo.value = 1
  getCollectionList()
}

const handleTabChange = (tab) => {
  if (tab === 'fakeSign') {
    getFakeSignList()
  } else {
    getCollectionList()
  }
}

const handleFakeSignImportSuccess = (res) => {
  ElMessage.success(`导入成功，共导入 ${res.data.count || 0} 条记录`)
  showFakeSignImport.value = false
  getFakeSignList()
}

const handleCollectionImportSuccess = (res) => {
  ElMessage.success(`导入成功，共导入 ${res.data.count || 0} 条记录`)
  showCollectionImport.value = false
  getCollectionList()
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

const getCourierBarColor = (index, total) => {
  if (total <= 1) return 'linear-gradient(90deg, #378ADD, #5BA8FF)'
  const ratio = index / (total - 1)
  const r = Math.round(55 + ratio * 91)
  const g = Math.round(138 - ratio * 30)
  const b = Math.round(221 - ratio * 10)
  return `linear-gradient(90deg, rgb(${r},${g},${b}), rgb(${Math.round(r+30)},${Math.round(g+30)},${Math.round(b+30)}))`
}

const getSalesmanBarColor = (index, total) => {
  if (total <= 1) return 'linear-gradient(90deg, #E24B4A, #FF8C8C)'
  const ratio = index / (total - 1)
  const r = Math.round(226 - ratio * 60)
  const g = Math.round(75 + ratio * 80)
  const b = Math.round(74 + ratio * 90)
  return `linear-gradient(90deg, rgb(${r},${g},${b}), rgb(${Math.round(r+30)},${Math.round(g+30)},${Math.round(b+30)}))`
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
  getFakeSignList()
  loadSalesmanRank()
})
</script>

<style scoped>
.section-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;

  @media (min-width: 1400px) {
    font-size: 16px;
    margin-bottom: 16px;
  }
}

.kpi-tabs {
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    margin-bottom: 16px;
  }
}

.bar-chart-scroll {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (min-width: 1400px) {
    max-height: 180px;
    gap: 12px;
  }
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 10px;

  @media (min-width: 1400px) {
    gap: 12px;
  }
}

.bar-label {
  font-size: 12px;
  color: #666;
  width: 60px;
  text-align: right;
  flex-shrink: 0;

  @media (min-width: 1400px) {
    font-size: 13px;
    width: 70px;
  }
}

.bar-track {
  flex: 1;
  height: 16px;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;

  @media (min-width: 1400px) {
    height: 20px;
    border-radius: 10px;
  }
}

.bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s ease;

  @media (min-width: 1400px) {
    border-radius: 10px;
  }
}

.bar-count {
  font-size: 12px;
  color: #333;
  width: 50px;
  text-align: left;
  flex-shrink: 0;

  @media (min-width: 1400px) {
    font-size: 13px;
    width: 60px;
  }
}

.pie-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;

  @media (min-width: 1400px) {
    gap: 24px;
  }
}

.pie-chart {
  flex-shrink: 0;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (min-width: 1400px) {
    gap: 12px;
  }
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;

  @media (min-width: 1400px) {
    gap: 8px;
    font-size: 13px;
  }
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;

  @media (min-width: 1400px) {
    width: 12px;
    height: 12px;
  }
}

.legend-count {
  margin-left: auto;
  font-weight: 500;
  color: #333;
}

.detail-card {
  margin-bottom: 0;
}

.search-box {
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    margin-bottom: 16px;
  }
}

.table-box {
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    margin-bottom: 16px;
  }
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

.import-box {
  text-align: center;
  padding: 30px;
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  background: #fafafa;

  @media (min-width: 1400px) {
    padding: 40px;
  }
}

.import-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #999;

  @media (min-width: 1400px) {
    margin-top: 12px;
    font-size: 13px;
  }
}

.upload-demo {
  display: inline-block;
}

:deep(.el-table) {
  font-size: 12px;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}

:deep(.el-table th) {
  padding: 8px 8px;

  @media (min-width: 1400px) {
    padding: 10px 12px;
  }
}

:deep(.el-table td) {
  padding: 8px 8px;

  @media (min-width: 1400px) {
    padding: 10px 12px;
  }
}
</style>