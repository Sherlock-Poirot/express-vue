<template>
  <div class="profit-report-page">
    <div class="search-toolbar">
      <div class="search-item">
        <label>统计日期：</label>
        <input type="date" v-model="query.date" />
      </div>
      <button class="search-btn" @click="doSearch">查询</button>
      <button class="search-btn" @click="openUpload" v-if="hasBtnPermission('report:profit:upload', '数据上传', '上传')">数据上传</button>
      <button class="search-btn" @click="doSyncAndCalculate" v-if="hasBtnPermission('report:profit:calculate', '清洗计算', '计算')">清洗计算</button>
    </div>

    <div class="summary-card">
      <div class="summary-item">
        <span class="summary-label">客户总数</span>
        <span class="summary-value">{{ summary.customerCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">总发货量</span>
        <span class="summary-value">{{ summary.totalCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">平均均重</span>
        <span class="summary-value">{{ summary.avgWeight }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">平均日环比</span>
        <span class="summary-value" :class="getDayOnDayClass(summary.dayOnDayRatio)">{{ summary.dayOnDayRatio }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">系统发件成本</span>
        <span class="summary-value total-cost">{{ summary.totalAmount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">物料成本</span>
        <span class="summary-value">{{ summary.materialFee }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">客户总中转费</span>
        <span class="summary-value">{{ summary.totalFee }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">总返利</span>
        <span class="summary-value">{{ summary.totalRebate }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">基数返利（估算）</span>
        <span class="summary-value">{{ summary.estimatedRebateAmount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">动态返利（估算）</span>
        <span class="summary-value">{{ summary.dynamicRebateAmount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">政策固定收费</span>
        <span class="summary-value">{{ summary.fixedPolicyFee }}</span>
      </div>
      <div class="summary-item highlight">
        <span class="summary-label">毛利</span>
        <span class="summary-value profit">{{ summary.totalProfit }}</span>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>客户名称</th>
            <th>发货量</th>
            <th>均重</th>
            <th>占比</th>
            <th>0.5kg</th>
            <th>1kg</th>
            <th>1.5kg</th>
            <th>2kg</th>
            <th>3kg</th>
            <th>超过3kg</th>
            <th>一区</th>
            <th>二区</th>
            <th>三区</th>
            <th>四区</th>
            <th>日环比</th>
            <th>成本</th>
            <th>客户中转费</th>
            <th>毛利</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in tableData" :key="index" :class="{ 'even-row': index % 2 === 0 }">
            <td>{{ item.customerName }}</td>

            <td>{{ item.totalCount }}</td>
            <td>{{ item.avgWeight }}</td>
            <td>{{ formatPercent(item.proportion) }}</td>
            <td>{{ formatPercent(item.weight05Percent) }}</td>
            <td>{{ formatPercent(item.weight10Percent) }}</td>
            <td>{{ formatPercent(item.weight15Percent) }}</td>
            <td>{{ formatPercent(item.weight20Percent) }}</td>
            <td>{{ formatPercent(item.weight30Percent) }}</td>
            <td>{{ formatPercent(item.weightOver30Percent) }}</td>
            <td>{{ formatPercent(item.area1Percent) }}</td>
            <td>{{ formatPercent(item.area2Percent) }}</td>
            <td :class="{ 'highlight-area3': item.area3Percent > 0.3 }">{{ formatPercent(item.area3Percent) }}</td>
            <td :class="{ 'highlight-area4': item.area4Percent > 0.06 }">{{ formatPercent(item.area4Percent) }}</td>
            <td :class="{ 'highlight-dayratio': item.dayOnDayRatio && item.dayOnDayRatio < 0 }">{{ formatPercent(item.dayOnDayRatio) }}</td>
            <td>{{ item.totalAmount }}</td>
            <td>{{ item.customerFee }}</td>
            <td>{{ item.profit }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" v-if="uploadVisible" @click.self="closeUpload">
      <div class="modal-content">
        <div class="modal-header">
          <h3>上传每日账单</h3>
          <span class="close" @click="closeUpload">×</span>
        </div>
        <div style="padding: 20px">
          <input type="file" ref="fileRef" accept=".xlsx,.xls,.csv" />
          <div style="margin-top: 15px">
            <button
              class="search-btn"
              @click="submitUpload"
              :disabled="uploading"
            >
              {{ uploading ? "上传中..." : "确认上传" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import axios from "axios";
import { ElMessage, ElLoading } from "element-plus";
import { hasBtnPermission } from "@/utils/auth";

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const query = reactive({
  date: getYesterday(),
});

const tableData = ref([]);
const uploadVisible = ref(false);
const fileRef = ref(null);
const uploading = ref(false);

const summary = reactive({
  customerCount: 0,
  totalCount: 0,
  avgWeight: '0.00',
  dayOnDayRatio: '0.00%',
  totalAmount: '0.00',
  materialFee: '0.00',
  totalFee: '0.00',
  totalRebate: '0.00',
  estimatedRebateAmount: '0.00',
  dynamicRebateAmount: '0.00',
  fixedPolicyFee: '0.00',
  totalProfit: '0.00',
});

const formatPercent = (value) => {
  if (!value && value !== 0) return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  return (num * 100).toFixed(2) + '%';
};

const getDayOnDayClass = (ratio) => {
  if (!ratio || ratio === '-') return '';
  const num = parseFloat(ratio);
  if (isNaN(num)) return '';
  if (num < 0) return 'negative';
  if (num > 0) return 'positive';
  return '';
};

const calculateSummary = () => {
  const data = tableData.value || [];
  summary.customerCount = data.length;
  
  let totalCount = 0;
  let totalWeightSum = 0;
  let totalAmount = 0;
  let totalFee = 0;
  let totalRebate = 0;
  let totalProfit = 0;
  let dayOnDayWeightedSum = 0;
  let dayOnDayTotalCount = 0;
  
  data.forEach(item => {
    const count = Number(item.totalCount) || 0;
    const avgWeight = Number(item.avgWeight) || 0;
    const dayOnDayRatio = Number(item.dayOnDayRatio);
    totalCount += count;
    totalWeightSum += count * avgWeight;
    totalAmount += Number(item.totalAmount) || 0;
    totalFee += Number(item.customerFee) || 0;
    totalRebate += Number(item.rebateAmount) || 0;
    totalProfit += Number(item.profit) || 0;
    if (!isNaN(dayOnDayRatio) && count > 0) {
      dayOnDayWeightedSum += dayOnDayRatio * count;
      dayOnDayTotalCount += count;
    }
  });
  
  summary.totalCount = totalCount;
  summary.avgWeight = totalCount > 0 ? (totalWeightSum / totalCount).toFixed(2) : '0.00';
  summary.dayOnDayRatio = dayOnDayTotalCount > 0 ? ((dayOnDayWeightedSum / dayOnDayTotalCount) * 100).toFixed(2) + '%' : '-';
  summary.totalAmount = totalAmount.toFixed(2);
  summary.totalFee = totalFee.toFixed(2);
  summary.totalRebate = totalRebate.toFixed(2);
  summary.totalProfit = totalProfit.toFixed(2);
};

async function doSearch() {
  const loading = ElLoading.service({
    lock: true,
    text: "查询中...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const [dataRes, summaryRes] = await Promise.all([
      axios.get("/api/dailyBill/statistics", { params: { date: query.date } }),
      axios.get("/api/dailyBill/statistics/summary", { params: { date: query.date } })
    ]);
    
    if (dataRes.data.code === 200) {
      tableData.value = dataRes.data.data;
    } else {
      ElMessage.error(dataRes.data.message || "查询失败");
    }
    
    if (summaryRes.data.code === 200) {
      const data = summaryRes.data.data;
      summary.customerCount = data.customerCount || 0;
      summary.totalCount = data.totalCount || 0;
      summary.avgWeight = data.avgWeight ? data.avgWeight.toString() : '0.00';
      summary.dayOnDayRatio = data.avgDayOnDayRatio ? (Number(data.avgDayOnDayRatio) * 100).toFixed(2) + '%' : '-';
      summary.totalAmount = data.totalAmount ? data.totalAmount.toString() : '0.00';
      summary.materialFee = data.materialFee ? data.materialFee.toString() : '0.00';
      summary.totalFee = data.totalCustomerFee ? data.totalCustomerFee.toString() : '0.00';
      summary.totalRebate = data.totalRebateAmount ? data.totalRebateAmount.toString() : '0.00';
      summary.estimatedRebateAmount = data.estimatedRebateAmount ? data.estimatedRebateAmount.toString() : '0.00';
      summary.dynamicRebateAmount = data.dynamicRebateAmount ? data.dynamicRebateAmount.toString() : '0.00';
      summary.fixedPolicyFee = data.fixedPolicyFee ? data.fixedPolicyFee.toString() : '0.00';
      summary.totalProfit = data.totalProfit ? data.totalProfit.toString() : '0.00';
    } else {
      ElMessage.error(summaryRes.data.message || "获取汇总数据失败");
    }
  } catch (err) {
    console.error("查询失败", err);
    ElMessage.error("查询失败，请稍后重试");
  } finally {
    loading.close();
  }
}

function openUpload() {
  uploadVisible.value = true;
}

function closeUpload() {
  uploadVisible.value = false;
}

async function submitUpload() {
  const file = fileRef.value?.files?.[0];
  if (!file) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  const loading = ElLoading.service({
    lock: true,
    text: "上传中...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    closeUpload();

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/api/dailyBill/upload", formData);
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "上传成功");
    } else {
      ElMessage.error(res.data.message || "上传失败");
    }
  } catch (err) {
    ElMessage.error("上传失败：" + (err.message || err));
  } finally {
    loading.close();
  }
}

async function doSyncAndCalculate() {
  const loading = ElLoading.service({
    lock: true,
    text: "正在清洗计算...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const params = {};
    if (query.date) {
      params.date = query.date;
    }
    const res = await axios.post("/api/dailyBill/syncAndCalculate", null, { params });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "清洗计算成功");
      await doSearch();
    } else {
      ElMessage.error(res.data.message || "清洗计算失败");
    }
  } catch (err) {
    console.error("清洗计算失败", err);
    ElMessage.error("清洗计算失败，请稍后重试");
  } finally {
    loading.close();
  }
}

onMounted(() => {
  doSearch();
});
</script>

<style scoped>
.profit-report-page {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.search-item input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.search-btn {
  background: #1890ff;
  color: #fff;
}

.summary-card {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    gap: 16px;
    padding: 16px 20px;
  }
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 90px;
  padding: 6px 12px;
  border-right: 1px solid #f0f0f0;

  @media (min-width: 1400px) {
    min-width: 100px;
    padding: 8px 16px;
  }
}

.summary-item:last-child {
  border-right: none;
}

.summary-item.highlight {
  background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
  border-radius: 8px;
  padding: 12px 20px;
  border-right: none;
}

.summary-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;

  @media (min-width: 1400px) {
    font-size: 18px;
  }
}

.summary-value.profit {
  color: #52c41a;
}

.summary-value.total-cost {
  color: #fa8c16;
}

.summary-value.negative {
  color: #ff4d4f;
}

.summary-value.positive {
  color: #52c41a;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #fafafa;
  padding: 8px 8px;
  border: 1px solid #ebeef5;
  font-weight: 600;
  text-align: center;
  font-size: 12px;
  color: #333;
  white-space: nowrap;

  @media (min-width: 1400px) {
    padding: 12px 10px;
    font-size: 14px;
  }
}

td {
  padding: 8px 8px;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;
  color: #666;
  white-space: nowrap;

  @media (min-width: 1400px) {
    padding: 10px 10px;
    font-size: 13px;
  }
}

tbody tr.even-row {
  background-color: #f5f7fa;
}

tbody tr:hover {
  background-color: #e6f7ff;
}

.highlight-area3 {
  background-color: #fff7e6;
  color: #fa8c16;
  font-weight: 600;
}

.highlight-area4 {
  background-color: #fff1f0;
  color: #ff4d4f;
  font-weight: 600;
}

.highlight-dayratio {
  background-color: #e6fffb;
  color: #13c2c2;
  font-weight: 600;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close {
  font-size: 20px;
  cursor: pointer;
}
</style>