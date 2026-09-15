<template>
  <div class="download-manage-page">
    <h2>下载管理</h2>

    <!-- 操作栏 -->
    <div class="action-toolbar">
      <button class="search-btn" @click="getList">刷新</button>
      <span class="refresh-tip" v-if="refreshing">有任务生成中，每5秒自动刷新...</span>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>账单月份</th>
            <th>文件名</th>
            <th>状态</th>
            <th>失败原因</th>
            <th>文件大小</th>
            <th>生成时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in tableData" :key="item.id">
            <td>{{ item.billMonth || "-" }}</td>
            <td class="file-name-cell">{{ item.fileName || "-" }}</td>
            <td>
              <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </td>
            <td class="error-cell">{{ item.errorMsg || "-" }}</td>
            <td>{{ formatSize(item.fileSize) }}</td>
            <td>{{ formatTime(item.createTime) }}</td>
            <td>
              <button
                class="edit-btn"
                :disabled="item.status !== 'SUCCESS'"
                v-if="hasBtnPermission('download:file:download', '下载')"
                @click="doDownload(item)"
              >
                下载
              </button>
            </td>
          </tr>
          <tr v-if="tableData.length === 0">
            <td colspan="7" class="empty-cell">暂无导出记录</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'DownloadManage'
})

import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { ElMessage, ElLoading } from "element-plus";
import { hasBtnPermission } from "@/utils/auth";

const tableData = ref([]);
const refreshing = ref(false);
let refreshTimer = null;

// 状态展示
const statusMap = {
  RUNNING: { text: "生成中", cls: "status-running" },
  SUCCESS: { text: "已完成", cls: "status-success" },
  FAILED: { text: "失败", cls: "status-failed" },
};

function statusText(status) {
  return statusMap[status]?.text || status || "-";
}

function statusClass(status) {
  return statusMap[status]?.cls || "";
}

// 文件大小格式化：字节 → 可读单位
function formatSize(size) {
  if (size === null || size === undefined) return "-";
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
  return (size / 1024 / 1024).toFixed(2) + " MB";
}

// 时间格式化（后端时间戳 → yyyy-MM-dd HH:mm:ss）
function formatTime(time) {
  if (!time) return "-";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 获取导出记录列表（后端固定返回最新50条）
async function getList() {
  try {
    const res = await axios.get("/api/exportFile/records");
    if (res.data.code === 200) {
      tableData.value = res.data.data || [];
      // 存在生成中的任务时自动轮询刷新
      const hasRunning = tableData.value.some((item) => item.status === "RUNNING");
      if (hasRunning) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    } else {
      ElMessage.error(res.data.message || "获取导出记录失败");
    }
  } catch (err) {
    console.error("获取导出记录失败", err);
    ElMessage.error("获取导出记录失败，请稍后重试");
  }
}

function startAutoRefresh() {
  refreshing.value = true;
  if (refreshTimer) return;
  refreshTimer = setInterval(getList, 5000);
}

function stopAutoRefresh() {
  refreshing.value = false;
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// 下载导出文件（需携带satoken请求头，走blob方式）
async function doDownload(item) {
  const loading = ElLoading.service({
    lock: true,
    text: "正在下载文件...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const response = await axios.get(`/api/exportFile/download/${item.id}`, {
      responseType: "blob",
    });

    // 后端业务异常会返回JSON，blob类型下需手动解析
    if (response.data.type === "application/json") {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(text);
      ElMessage.error(errorData.message || "下载失败");
      return;
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", item.fileName || "导出文件.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("下载失败", err);
    ElMessage.error("下载失败，请稍后重试");
  } finally {
    loading.close();
  }
}

onMounted(() => {
  getList();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.download-manage-page {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

h2 {
  margin: 0 0 14px 0;
  font-size: 18px;
  color: #333;

  @media (min-width: 1400px) {
    margin: 0 0 16px 0;
    font-size: 20px;
  }
}

.action-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    gap: 12px;
    margin-bottom: 16px;
  }
}

.refresh-tip {
  font-size: 12px;
  color: #e6a23c;

  @media (min-width: 1400px) {
    font-size: 13px;
  }
}

button {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 6px 14px;
    font-size: 14px;
  }
}

.search-btn {
  background: #1890ff;
  color: #fff;
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

  @media (min-width: 1400px) {
    padding: 12px;
    font-size: 14px;
  }
}

td {
  padding: 8px 8px;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 12px;
    font-size: 14px;
  }
}

.file-name-cell {
  max-width: 320px;
  word-break: break-all;
  text-align: left;
}

.error-cell {
  max-width: 240px;
  word-break: break-all;
  color: #f56c6c;
}

.empty-cell {
  color: #999;
  padding: 32px 0;
}

.status-running {
  color: #e6a23c;
  font-weight: 500;
}

.status-success {
  color: #67c23a;
  font-weight: 500;
}

.status-failed {
  color: #f56c6c;
  font-weight: 500;
}

.edit-btn {
  background: #1890ff;
  color: #fff;
}

.edit-btn:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}
</style>
