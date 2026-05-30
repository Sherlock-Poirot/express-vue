<template>
  <div class="staff-management-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>员工管理</h2>
    </div>

    <!-- 搜索卡片 -->
    <div class="search-card">
      <div class="search-row">
        <div class="search-item">
          <label>员工姓名：</label>
          <input
            v-model="query.staffName"
            placeholder="请输入员工姓名"
            @keyup.enter="getList"
          />
        </div>
        <div class="search-item">
          <label>手机号码：</label>
          <input
            v-model="query.phone"
            placeholder="请输入手机号码"
            @keyup.enter="getList"
          />
        </div>
        <!-- 按钮组直接放在 search-row 里，方便在同一行排列 -->
        <div class="button-group">
          <button class="btn-search" @click="getList">搜索</button>
          <button class="btn-reset" @click="resetQuery">重置</button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 55px">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="text-center">承包区</th>
              <th class="text-center">员工姓名</th>
              <th class="text-center">手机号码</th>
              <th class="text-center">入职日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td class="text-center">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelectItem(item.id)"
                />
              </td>
              <td>
                <span class="tag">{{ item.contractName }}</span>
              </td>
              <td>
                <strong>{{ item.realName }}</strong>
              </td>
              <td>{{ item.phone || "—" }}</td>
              <td>{{ item.entryDate }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="list.length === 0" class="empty-state">
          <p>暂无数据</p>
        </div>
      </div>

      <!-- 分页 -->
    <Pagination
      v-model:current-page="pageNo"
      v-model:page-size="pageSize"
      :total="total"
      @change="handlePageChange"
      v-if="total > 0"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination.vue";

const query = reactive({
  staffName: "",
  phone: "",
});

const pageNo = ref(1);
const pageSize = ref(10);
const list = ref([]);
const total = ref(0);
const selectedIds = ref([]);

const totalPages = computed(() => {
  return Math.ceil(total.value / pageSize.value);
});

const isAllSelected = computed(() => {
  return (
    list.value.length > 0 && selectedIds.value.length === list.value.length
  );
});
const isIndeterminate = computed(() => {
  return (
    selectedIds.value.length > 0 && selectedIds.value.length < list.value.length
  );
});

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedIds.value = list.value.map((item) => item.id);
  } else {
    selectedIds.value = [];
  }
}

function toggleSelectItem(id) {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
}

async function getList() {
  try {
    const res = await axios.get("/api/staff/page", {
      params: {
        staffName: query.staffName,
        phone: query.phone,
        pageNo: pageNo.value,
        pageSize: pageSize.value,
      },
    });

    if (res.data.code === 200) {
      list.value = res.data.data.records || [];
      total.value = res.data.data.total || 0;
      selectedIds.value = [];
    } else {
      ElMessage.error(res.data.message || "请求失败");
    }
  } catch (err) {
    console.error("请求错误:", err);
    ElMessage.error("网络错误或服务异常");
  }
}

function resetQuery() {
  query.staffName = "";
  query.phone = "";
  pageNo.value = 1;
  getList();
}

function handlePageChange({ pageNo: newPageNo, pageSize: newPageSize }) {
  pageNo.value = newPageNo;
  pageSize.value = newPageSize;
  getList();
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.staff-management-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  color: #1f2f3d;
  font-size: 22px;
  margin: 0;
}

/* --- 搜索区域样式修改 --- */
.search-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 20px;
  /* 去掉 flex-wrap: wrap，强制不换行 */
}

.search-item {
  display: flex;
  align-items: center;
  /* 去掉 min-width，改为固定宽度或者 flex: 0，防止被挤压 */
  flex: 0 0 auto;
}
.search-item label {
  width: 80px;
  color: #606266;
  font-weight: 500;
  font-size: 14px;
  flex-shrink: 0; /* 防止 label 被压缩 */
}
.search-item input {
  width: 200px; /* 给输入框一个固定宽度 */
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}
.search-item input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 3px rgba(64, 158, 255, 0.3);
}

.button-group {
  display: flex;
  gap: 12px;
  /* 按钮组靠右对齐，如果想去掉靠右效果，把 margin-left 删掉即可 */
  margin-left: auto;
}
.btn-search {
  background: #409eff;
  color: #fff;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-search:hover {
  background: #66b1ff;
}
.btn-reset {
  background: #f5f7fa;
  color: #606266;
  padding: 10px 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-reset:hover {
  background: #ecf5ff;
  color: #409eff;
}
/* --- 搜索区域样式修改结束 --- */

.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-wrapper {
  position: relative;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.data-table th {
  background: #f5f7fa;
  padding: 12px 20px;
  border-bottom: 1px solid #ebeef5;
  color: #909399;
  font-weight: 500;
  font-size: 14px;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: center;
}

.data-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.data-table tr:hover td {
  background-color: #f9fafc;
}

.tag {
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  color: #409eff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}


</style>
