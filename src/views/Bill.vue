<template>
  <div class="bill-management-page">
    <!-- 第一行：搜索区域 -->
    <div class="search-toolbar">
      <div class="search-item">
        <label>汇总维度：</label>
        <label style="margin-right: 12px">
          <input type="radio" v-model="query.dimension" value="time" />
          时间维度
        </label>
        <label>
          <input type="radio" v-model="query.dimension" value="customer" />
          客户维度
        </label>
      </div>

      <div class="search-item">
        <label>账单月份：</label>
        <input type="month" v-model="query.billMonth" />
      </div>

      <div class="search-item">
        <label>客户名称：</label>
        <input
          v-model="query.customerName"
          style="width: 180px"
          placeholder="请输入客户名称"
          @keyup.enter="doSearch"
        />
      </div>

      <button class="search-btn" @click="doSearch">搜索</button>
    </div>

    <!-- 第二行：功能按钮 单独一行 -->
    <div class="action-toolbar">
      <button class="search-btn" @click="openImport">导入Excel</button>
      <button class="search-btn" @click="doClean">数据清洗</button>
      <button class="search-btn" @click="doCalculate">执行计算</button>
      <button class="search-btn" @click="doGenerateSummary">
        生成汇总账单
      </button>
      <button class="search-btn" @click="doExportSummary">
        汇总导出
      </button>
      <button class="search-btn" @click="doExportDetail">
        明细导出
      </button>
    </div>

    <!-- TAB 切换：直营 / 业务员 / 承包区 -->
    <div class="tab-box">
      <div
        class="tab-item"
        :class="{ active: query.billType === 1 }"
        @click="switchTab(1)"
      >
        直营客户
      </div>
      <div
        class="tab-item"
        :class="{ active: query.billType === 2 }"
        @click="switchTab(2)"
      >
        业务员
      </div>
      <div
        class="tab-item"
        :class="{ active: query.billType === 3 }"
        @click="switchTab(3)"
      >
        承包区
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>账单日期</th>
            <th class="sortable" @click="handleSort('custName')">
              客户名称
              <span class="sort-icon" v-if="query.sortField !== 'custName'">⇅</span>
              <span class="sort-icon active" v-else>
                {{ query.sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="sortable" @click="handleSort('receiveCount')">
              收件量
              <span class="sort-icon" v-if="query.sortField !== 'receiveCount'">⇅</span>
              <span class="sort-icon active" v-else>
                {{ query.sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="sortable" @click="handleSort('receivableAmount')">
              应收金额
              <span class="sort-icon" v-if="query.sortField !== 'receivableAmount'">⇅</span>
              <span class="sort-icon active" v-else>
                {{ query.sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>调整金额</th>
            <th>特殊备注</th>
            <th>转账方式</th>
            <th>实付金额</th>
            <th>转账日期</th>
            <th>备注</th>
            <th>核实签名</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in tableData" :key="item.id">
            <td>{{ item.billDate }}</td>
            <td>{{ item.customerName }}</td>
            <td>{{ item.totalCount }}</td>
            <td>{{ item.receivableAmount }}</td>
            <td>{{ item.adjustAmount }}</td>
            <td>{{ item.specialRemark || "-" }}</td>
            <td>{{ item.payType || "-" }}</td>
            <td>{{ item.paidAmount }}</td>
            <td>{{ item.payDate || "-" }}</td>
            <td>{{ item.remark || "-" }}</td>
            <td>{{ item.signUser || "-" }}</td>
            <td>
              <button class="edit-btn" @click="openEdit(item)">编辑</button>
              <button class="sign-btn" @click="doSign(item)">签名</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <Pagination
      v-model:current-page="query.pageNo"
      v-model:page-size="query.pageSize"
      :total="total"
      @change="handlePageChange"
      v-if="total > 0"
    />

    <!-- 导入Excel 弹窗 -->
    <div class="modal" v-if="importVisible" @click.self="closeImport">
      <div class="modal-content">
        <div class="modal-header">
          <h3>导入Excel账单</h3>
          <span class="close" @click="closeImport">×</span>
        </div>
        <div style="padding: 20px">
          <input type="file" ref="fileRef" accept=".xlsx,.xls" />
          <div style="margin-top: 15px">
            <button
              class="search-btn"
              @click="submitImport"
              :disabled="importing"
            >
              {{ importing ? "上传中..." : "确认导入" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'Bill'
})

import { ref, reactive, onMounted, onUnmounted, inject, watch } from "vue";
import axios from "axios";
import { ElMessage, ElLoading } from "element-plus";
import Pagination from "@/components/Pagination.vue";

const saveTabState = inject('saveTabState');
const getTabState = inject('getTabState');
const currentPath = '/settlement/bill';

const getLastMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const query = reactive({
  dimension: "time",
  billMonth: getLastMonth(),
  customerName: "",
  billType: 1,
  pageNo: 1,
  pageSize: 10,
  sortField: "",
  sortOrder: "",
});

const tableData = ref([]);
const total = ref(0);
const importVisible = ref(false);
const fileRef = ref(null);
const importing = ref(false);

let pollTimer = null;
const POLL_INTERVAL = 3000; // 调整为3秒轮询一次，体验更好

async function doSearch() {
  query.pageNo = 1;
  await getList();
}

async function switchTab(type) {
  query.billType = type;
  await doSearch();
}

async function getList() {
  try {
    // 将前端 query 转换为后端需要的格式
    const requestData = {
      type: query.billType - 1, // 前端 1/2/3 -> 后端 0/1/2
      dimensionType: query.dimension,
      billMonth: query.billMonth,
      customerName: query.customerName,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      sortField: query.sortField,
      sortOrder: query.sortOrder,
    };

    const res = await axios.post("/api/monthlyBill/search", requestData);
    if (res.data.code === 200) {
      // 将后端数据转换为前端需要的格式
      const records = res.data.data.records || [];
      tableData.value = records.map(item => ({
        id: item.id,
        billDate: item.billMonth,
        customerName: item.custName,
        totalCount: item.receiveCount,
        receivableAmount: item.receivableAmount,
        adjustAmount: item.adjustAmount,
        specialRemark: item.specialRemark,
        payType: item.transferType,
        paidAmount: item.actualAmount,
        payDate: item.transferDate,
        remark: item.remark,
        signUser: item.verifySign,
      }));
      total.value = res.data.data.total || 0;
    } else {
      ElMessage.error(res.data.message || "查询失败");
    }
  } catch (err) {
    console.error("请求错误:", err);
    ElMessage.error("网络错误或服务异常");
  }
}

function handleSort(field) {
  if (query.sortField === field) {
    // 如果点击的是同一个字段，切换排序方向
    query.sortOrder = query.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    // 点击新字段，默认升序
    query.sortField = field;
    query.sortOrder = 'asc';
  }
  query.pageNo = 1; // 重置到第一页
  getList();
}

function handlePageChange({ pageNo, pageSize }) {
  query.pageNo = pageNo;
  query.pageSize = pageSize;
  getList();
}

function openImport() {
  importVisible.value = true;
}
function closeImport() {
  importVisible.value = false;
}

// ✅ 提交导入（已修正路径 /waybill/import）
// 提交导入
async function submitImport() {
  // ✅ 修复点：补全了 [0]
  const file = fileRef.value?.files?.[0];

  if (!file) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    importing.value = true;
    closeImport();

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/api/waybill/import", formData);

    const taskNo = res.data.data;
    ElMessage.success("上传成功，后台正在导入...");
    startPollTask(taskNo);
  } catch (err) {
    ElMessage.error("上传失败：" + (err.message || err));
    importing.value = false;
  }
}

// ✅ 轮询（已修正路径 /waybill/import/task）
function startPollTask(taskNo) {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    try {
      const res = await axios.get("/api/waybill/import/task", {
        params: { taskNo },
      });

      const task = res.data.data;
      const status = task.status;

      if (status === "SUCCESS") {
        clearInterval(pollTimer);
        pollTimer = null;
        importing.value = false; // 重置按钮状态
        ElMessage.success(task.message || "导入完成");
      }

      if (status === "FAILED") {
        clearInterval(pollTimer);
        pollTimer = null;
        importing.value = false;
        ElMessage.error(task.message || "导入失败");
      }
    } catch (err) {
      console.error("查询任务失败", err);
    }
  }, POLL_INTERVAL);
}

watch(query, (newVal) => {
  if (saveTabState) {
    saveTabState(currentPath, {
      dimension: newVal.dimension,
      billMonth: newVal.billMonth,
      customerName: newVal.customerName,
      billType: newVal.billType,
      pageNo: newVal.pageNo,
      pageSize: newVal.pageSize,
      sortField: newVal.sortField,
      sortOrder: newVal.sortOrder,
    });
  }
}, { deep: true });

onMounted(() => {
  if (getTabState) {
    const savedState = getTabState(currentPath);
    if (savedState) {
      query.dimension = savedState.dimension || 'time';
      query.billMonth = savedState.billMonth || '';
      query.customerName = savedState.customerName || '';
      query.billType = savedState.billType || 1;
      query.pageNo = savedState.pageNo || 1;
      query.pageSize = savedState.pageSize || 10;
      query.sortField = savedState.sortField || '';
      query.sortOrder = savedState.sortOrder || '';
    }
  }
  getList();
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

async function doClean() {
  const loading = ElLoading.service({
    lock: true,
    text: "正在清洗数据...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const params = {};
    if (query.billMonth) {
      params.date = query.billMonth;
    }
    const res = await axios.post("/api/waybill/clean", null, { params });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "数据清洗成功");
    } else {
      ElMessage.error(res.data.message || "数据清洗失败");
    }
  } catch (err) {
    console.error("数据清洗失败", err);
    ElMessage.error("数据清洗失败，请稍后重试");
  } finally {
    loading.close();
  }
}

async function doCalculate() {
  const loading = ElLoading.service({
    lock: true,
    text: "正在执行计算...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const params = {};
    if (query.billMonth) {
      params.date = query.billMonth;
    }
    const res = await axios.post("/api/waybill/calculate", null, { params });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "计算成功");
    } else {
      ElMessage.error(res.data.message || "计算失败");
    }
  } catch (err) {
    console.error("计算失败", err);
    ElMessage.error("计算失败，请稍后重试");
  } finally {
    loading.close();
  }
}

async function doGenerateSummary() {
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在生成汇总账单...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/monthlyBill/generate", null, {
      params: { billMonth: query.billMonth }
    });
    if (res.data.code === 200) {
      ElMessage.success("生成汇总账单成功");
      await getList();
    } else {
      ElMessage.error(res.data.message || "生成失败");
    }
  } catch (err) {
    console.error("生成汇总账单失败", err);
    ElMessage.error("生成汇总账单失败，请稍后重试");
  } finally {
    loading.close();
  }
}

async function doExportSummary() {
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在导出汇总...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const response = await axios.get("/api/monthlyBill/export", {
      params: { billMonth: query.billMonth },
      responseType: "blob",
    });
    
    if (response.data.type === 'application/json') {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(text);
      ElMessage.error(errorData.message || "导出失败");
      return;
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${query.billMonth}月账单汇总.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch (err) {
    console.error("导出失败", err);
    ElMessage.error("导出失败，请稍后重试");
  } finally {
    loading.close();
  }
}

async function doExportDetail() {
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在导出明细...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const response = await axios.get("/api/monthlyBill/exportDetail", {
      params: { billMonth: query.billMonth },
      responseType: "blob",
    });
    
    if (response.data.type === 'application/json') {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(text);
      ElMessage.error(errorData.message || "导出失败");
      return;
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${query.billMonth}_明细.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success("明细导出成功");
  } catch (err) {
    console.error("明细导出失败", err);
    ElMessage.error("明细导出失败，请稍后重试");
  } finally {
    loading.close();
  }
}

function openEdit(row) {
  console.log("编辑", row);
}

function doSign(row) {
  console.log("签名", row);
}
</script>

<style scoped>
.bill-management-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #333;
}

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.action-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
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
}

.search-item input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.search-btn {
  background: #1890ff;
  color: #fff;
}

.tab-box {
  display: flex;
  background: #fff;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  margin-bottom: -1px;
}

.tab-item {
  padding: 10px 24px;
  cursor: pointer;
  background: #f5f7fa;
}

.tab-item.active {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

.table-container {
  background: #fff;
  border-radius: 0 0 8px 8px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #fafafa;
  padding: 12px;
  border: 1px solid #ebeef5;
  font-weight: 600;
  text-align: center;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover {
  background: #e6f7ff;
  color: #1890ff;
}

.sort-icon {
  margin-left: 4px;
  color: #999;
  font-size: 12px;
}

.sort-icon.active {
  color: #1890ff;
  font-weight: bold;
}

td {
  padding: 12px;
  border: 1px solid #ebeef5;
  text-align: center;
}

.edit-btn {
  background: #1890ff;
  color: #fff;
  margin-right: 6px;
}
.sign-btn {
  background: #1890ff;
  color: #fff;
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
