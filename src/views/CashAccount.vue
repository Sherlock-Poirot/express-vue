<template>
  <div class="cash-account">
    <div class="account-panel">
      <div class="panel-head">
        <span class="panel-title">账户管理</span>
        <span class="panel-sub">共 <b>{{ total }}</b> 个账户</span>
        <el-button type="primary" size="small" @click="openEditModal()">新增</el-button>
        <el-button
          type="warning"
          size="small"
          :disabled="selectedAccounts.length !== 1"
          @click="openEditModal(selectedAccounts[0])"
        >
          编辑
        </el-button>
        <el-button type="danger" size="small" :disabled="selectedAccounts.length === 0" @click="doBatchDelete">
          删除
        </el-button>
      </div>

      <div class="panel-body">
        <!-- 筛选 -->
        <el-form :inline="true" :model="searchForm" class="account-search">
          <el-form-item label="账户名称">
            <el-input
              v-model="searchForm.accountName"
              placeholder="账户名称（模糊）"
              clearable
              style="width: 200px"
              @keyup.enter="doSearch"
            />
          </el-form-item>
          <el-form-item label="平台">
            <el-select v-model="searchForm.platform" placeholder="全部" clearable style="width: 150px">
              <el-option v-for="p in platformOptions" :key="p.value" :label="p.label" :value="p.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="doSearch">查询</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table
          :data="accounts"
          v-loading="loading"
          border
          height="100%"
          class="flex-table"
          row-key="id"
          @selection-change="onSelect"
        >
          <el-table-column type="selection" width="42" />
          <el-table-column prop="accountName" label="账户名称" min-width="160" show-overflow-tooltip header-align="center" />
          <el-table-column prop="accountNo" label="账号" min-width="170" show-overflow-tooltip header-align="center" />
          <el-table-column label="平台" width="110" header-align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="platformTagType(row.platform)">{{ platformName(row.platform) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip header-align="center" />
          <el-table-column label="创建时间" width="150" header-align="center">
            <template #default="{ row }">{{ fmtDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="150" header-align="center">
            <template #default="{ row }">{{ fmtDateTime(row.updateTime) }}</template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pager">
          <el-pagination
            v-model:current-page="pageNo"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @current-change="getAccounts"
            @size-change="onSizeChange"
          />
        </div>
      </div>
    </div>

    <!-- ================= 新增/编辑弹窗 ================= -->
    <el-dialog
      v-model="editVisible"
      :title="editForm.id ? '编辑账户' : '新增账户'"
      width="460px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="80px" size="default">
        <el-form-item label="账户名称" required>
          <el-input v-model="editForm.accountName" placeholder="同平台下不允许重复" maxlength="50" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="editForm.platform" placeholder="请选择平台" style="width: 100%">
            <el-option v-for="p in platformOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="editForm.accountNo" placeholder="选填" maxlength="64" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" maxlength="200" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";

/* =========================================================
   平台字典（/api/cashAccount/platforms）
   ========================================================= */
const platformOptions = ref([]);
const getPlatforms = async () => {
  try {
    const res = await axios.get("/api/cashAccount/platforms");
    platformOptions.value = res.data.data || [];
  } catch (err) {
    console.error("获取平台字典失败:", err);
  }
};
const platformName = (v) => platformOptions.value.find((p) => p.value === v)?.label || `平台${v ?? "-"}`;
const platformTagType = (v) => {
  const map = { 1: "success", 2: "warning", 3: "", 4: "danger", 5: "info" };
  return map[v] ?? "info";
};

/* =========================================================
   列表查询（/api/cashAccount/search 分页）
   ========================================================= */
const loading = ref(false);
const accounts = ref([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(10);
const searchForm = reactive({ accountName: "", platform: null });

const fmtDateTime = (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "-");

const getAccounts = async () => {
  loading.value = true;
  try {
    const params = { pageNo: pageNo.value, pageSize: pageSize.value };
    if (searchForm.accountName) params.accountName = searchForm.accountName;
    if (searchForm.platform != null && searchForm.platform !== "") params.platform = searchForm.platform;
    const res = await axios.get("/api/cashAccount/search", { params });
    const page = res.data.data || {};
    accounts.value = page.records || [];
    total.value = Number(page.total || 0);
  } catch (err) {
    console.error("查询账户列表失败:", err);
  } finally {
    loading.value = false;
  }
};

const doSearch = () => {
  pageNo.value = 1;
  getAccounts();
};
const resetSearch = () => {
  searchForm.accountName = "";
  searchForm.platform = null;
  doSearch();
};
const onSizeChange = () => {
  pageNo.value = 1;
  getAccounts();
};

/* =========================================================
   勾选
   ========================================================= */
const selectedAccounts = ref([]);
const onSelect = (rows) => {
  selectedAccounts.value = rows;
};

/* =========================================================
   新增/编辑
   ========================================================= */
const editVisible = ref(false);
const submitting = ref(false);
const editForm = reactive({ id: null, accountName: "", platform: null, accountNo: "", remark: "" });

const openEditModal = (row) => {
  editForm.id = row?.id ?? null;
  editForm.accountName = row?.accountName || "";
  editForm.platform = row?.platform ?? null;
  editForm.accountNo = row?.accountNo || "";
  editForm.remark = row?.remark || "";
  editVisible.value = true;
};

const submitEdit = async () => {
  if (!editForm.accountName.trim()) {
    ElMessage.warning("请填写账户名称");
    return;
  }
  if (editForm.platform == null) {
    ElMessage.warning("请选择平台");
    return;
  }
  submitting.value = true;
  try {
    const url = editForm.id ? "/api/cashAccount/update" : "/api/cashAccount/add";
    const res = await axios.post(url, { ...editForm });
    if (res.data.code === 200) {
      ElMessage.success(editForm.id ? "修改成功" : "新增成功");
      editVisible.value = false;
      getAccounts();
    } else {
      ElMessage.error(res.data.message || "操作失败");
    }
  } catch (err) {
    console.error("保存账户失败:", err);
  } finally {
    submitting.value = false;
  }
};

/* =========================================================
   批量删除（/api/cashAccount/batch）
   ========================================================= */
const doBatchDelete = async () => {
  if (selectedAccounts.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedAccounts.value.length} 个账户吗？删除后不可恢复。`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消", confirmButtonClass: "el-button--danger" }
    );
  } catch {
    return;
  }
  try {
    const ids = selectedAccounts.value.map((r) => r.id);
    const res = await axios.delete("/api/cashAccount/batch", { data: ids });
    if (res.data.code === 200) {
      ElMessage.success("删除成功");
      getAccounts();
    } else {
      ElMessage.error(res.data.message || "删除失败");
    }
  } catch (err) {
    console.error("删除账户失败:", err);
  }
};

onMounted(async () => {
  await getPlatforms();
  getAccounts();
});
</script>

<style scoped>
.cash-account {
  padding: 12px 16px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.account-panel {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 160px);
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.panel-sub {
  flex: 1;
  font-size: 12px;
  color: #909399;
}
.panel-sub b {
  color: #1677ff;
  font-weight: 600;
}

.panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 16px 12px;
}
.account-search {
  margin-bottom: 6px;
}
.account-search :deep(.el-form-item) {
  margin-bottom: 8px;
  margin-right: 14px;
}

.flex-table {
  flex: 1;
  min-height: 0;
}
/* 表头加粗 */
.flex-table :deep(th.el-table__cell .cell) {
  font-weight: 700;
}
/* 单元格内容水平垂直居中 + 字号加大 */
.flex-table :deep(.cell) {
  text-align: center;
  font-size: 14px;
}
.flex-table :deep(td.el-table__cell),
.flex-table :deep(th.el-table__cell) {
  vertical-align: middle;
  text-align: center;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
