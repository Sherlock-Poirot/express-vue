<template>
  <div class="bill-management-page">
    <h2>账单管理</h2>

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
      <button class="search-btn" @click="doCalculate">执行计算</button>
      <button class="search-btn" @click="doGenerateSummary">
        生成汇总账单
      </button>
    </div>

    <!-- TAB 切换：直营 / 承包区 / 业务员 -->
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
        承包区
      </div>
      <div
        class="tab-item"
        :class="{ active: query.billType === 3 }"
        @click="switchTab(3)"
      >
        业务员
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>账单日期</th>
            <th>客户名称</th>
            <th>收件量</th>
            <th>应收金额</th>
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
import { ref, reactive, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination.vue";

const query = reactive({
  dimension: "time",
  billMonth: "",
  customerName: "",
  billType: 1,
  pageNo: 1,
  pageSize: 10,
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
    // 这里替换为实际的接口地址
    const res = await axios.get("/api/bill/search", { params: query });
    if (res.data.code === 200) {
      tableData.value = res.data.data.records || [];
      total.value = res.data.data.total || 0;
    } else {
      ElMessage.error(res.data.message || "查询失败");
    }
  } catch (err) {
    console.error("请求错误:", err);
    ElMessage.error("网络错误或服务异常");
  }
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

onMounted(() => {
  getList();
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

function doCalculate() {
  console.log("执行计算");
}

function doGenerateSummary() {
  console.log("生成汇总");
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
}

td {
  padding: 12px;
  border: 1px solid #ebeef5;
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
