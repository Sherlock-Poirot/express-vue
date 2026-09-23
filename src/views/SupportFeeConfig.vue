<template>
  <div class="support-fee-container">
    <!-- 搜索卡片 -->
    <div class="search-card">
      <div class="search-row">
        <div class="search-item">
          <label>省份：</label>
          <input
            v-model="query.province"
            placeholder="请输入省份"
            @keyup.enter="getList"
          />
        </div>
        <div class="search-item">
          <label>目的地市：</label>
          <input
            v-model="query.city"
            placeholder="请输入目的地市"
            @keyup.enter="getList"
          />
        </div>
        <div class="button-group">
          <button class="btn-search" @click="getList">搜索</button>
          <button class="btn-reset" @click="resetQuery">重置</button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <div class="action-bar">
        <button class="btn-primary" @click="handleAdd" v-if="hasBtnPermission('settlement:supportfee:add', '新增扶持派费配置', '新增')">
          <span class="icon">+</span>
          新增
        </button>
        <button
          class="btn-danger"
          @click="handleBatchDelete"
          :disabled="selectedIds.length === 0"
          v-if="hasBtnPermission('settlement:supportfee:delete', '删除扶持派费配置', '删除')"
        >
          批量删除<span v-if="selectedIds.length > 0">({{ selectedIds.length }})</span>
        </button>
      </div>

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
              <th class="text-center">省份</th>
              <th class="text-center">目的地市</th>
              <th class="text-center">加收金额</th>
              <th class="text-center">生效日期</th>
              <th class="text-center">备注</th>
              <th class="text-center">创建时间</th>
              <th class="text-center" style="width: 100px">操作</th>
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
              <td>{{ item.province || "—" }}</td>
              <td>{{ item.city || "全省" }}</td>
              <td class="text-center">
                <span class="fee-cell">¥{{ item.extraFee }}</span>
                <span class="fee-unit">/单</span>
              </td>
              <td class="text-center">
                {{ fmtDate(item.startTime) }} ~ {{ fmtDate(item.endTime) || "长期" }}
              </td>
              <td>{{ item.remark || "—" }}</td>
              <td>{{ fmtDateTime(item.createTime) }}</td>
              <td class="text-center">
                <button class="btn-link" @click="handleEdit(item)" v-if="hasBtnPermission('settlement:supportfee:edit', '编辑扶持派费配置', '编辑', '修改')">编辑</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="list.length === 0" class="empty-state">
          <p>暂无数据</p>
        </div>
      </div>

      <Pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :total="total"
        @change="handlePageChange"
        v-if="total > 0"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <div class="modal-overlay" v-if="modalVisible" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑扶持派费配置' : '新增扶持派费配置' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>省份<span class="required">*</span></label>
            <input v-model="form.province" placeholder="如：河南省" />
          </div>
          <div class="form-item">
            <label>目的地市</label>
            <input v-model="form.city" placeholder="留空表示该省全部加收" />
          </div>
          <div class="form-item">
            <label>加收金额(元/单)<span class="required">*</span></label>
            <input v-model.number="form.extraFee" type="number" step="0.01" placeholder="如：0.50" />
          </div>
          <div class="form-item">
            <label>生效开始日期<span class="required">*</span></label>
            <input v-model="form.startTime" type="date" />
          </div>
          <div class="form-item">
            <label>生效结束日期</label>
            <input v-model="form.endTime" type="date" placeholder="留空表示长期有效" />
          </div>
          <div class="form-item">
            <label>备注</label>
            <textarea v-model="form.remark" placeholder="可填写说明信息" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-confirm" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'SupportFeeConfig'
})

import { ref, reactive, computed, onMounted, inject, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination.vue";
import { hasBtnPermission } from "@/utils/auth";

const saveTabState = inject('saveTabState');
const getTabState = inject('getTabState');
const currentPath = '/settlement/supportFeeConfig';

const query = reactive({
  province: "",
  city: "",
});

const pageNo = ref(1);
const pageSize = ref(10);
const list = ref([]);
const total = ref(0);
const selectedIds = ref([]);

const modalVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);

const form = reactive({
  id: null,
  province: "",
  city: "",
  extraFee: null,
  startTime: "",
  endTime: "",
  remark: "",
});

// ========== 日期格式化 ==========
// 后端 LocalDate → 时间戳(毫秒) / LocalDateTime → 时间戳，统一转 yyyy-MM-dd
function fmtDate(val) {
  if (!val) return "";
  const d = new Date(typeof val === "number" ? val : val);
  if (isNaN(d.getTime())) return val;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDateTime(val) {
  if (!val) return "—";
  const d = new Date(typeof val === "number" ? val : val);
  if (isNaN(d.getTime())) return val;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return n < 10 ? "0" + n : "" + n; }

// ========== 选择 ==========
const isAllSelected = computed(() =>
  list.value.length > 0 && selectedIds.value.length === list.value.length
);
const isIndeterminate = computed(() =>
  selectedIds.value.length > 0 && selectedIds.value.length < list.value.length
);

function toggleSelectAll(e) {
  selectedIds.value = e.target.checked ? list.value.map((i) => i.id) : [];
}
function toggleSelectItem(id) {
  const idx = selectedIds.value.indexOf(id);
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id);
}

// ========== 列表 ==========
async function getList() {
  try {
    const res = await axios.get("/api/supportFeeConfig/search", {
      params: {
        province: query.province,
        city: query.city,
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
  }
}

function resetQuery() {
  query.province = "";
  query.city = "";
  pageNo.value = 1;
  getList();
}

function handlePageChange({ pageNo: newPageNo, pageSize: newPageSize }) {
  pageNo.value = newPageNo;
  pageSize.value = newPageSize;
  getList();
}

// ========== 新增/编辑 ==========
function handleAdd() {
  isEdit.value = false;
  resetForm();
  modalVisible.value = true;
}

function handleEdit(item) {
  isEdit.value = true;
  form.id = item.id;
  form.province = item.province || "";
  form.city = item.city || "";
  form.extraFee = item.extraFee ?? null;
  form.startTime = fmtDate(item.startTime);
  form.endTime = fmtDate(item.endTime);
  form.remark = item.remark || "";
  modalVisible.value = true;
}

function resetForm() {
  form.id = null;
  form.province = "";
  form.city = "";
  form.extraFee = null;
  form.startTime = "";
  form.endTime = "";
  form.remark = "";
}

function closeModal() {
  modalVisible.value = false;
  resetForm();
}

async function handleSubmit() {
  if (!form.province.trim()) { ElMessage.warning("请输入省份"); return; }
  if (form.extraFee === null || form.extraFee === "" || Number(form.extraFee) <= 0) {
    ElMessage.warning("请输入有效的加收金额"); return;
  }
  if (!form.startTime) { ElMessage.warning("请选择生效开始日期"); return; }
  if (form.endTime && form.endTime < form.startTime) {
    ElMessage.warning("结束日期不能早于开始日期"); return;
  }

  submitting.value = true;
  try {
    const url = isEdit.value ? "/api/supportFeeConfig/update" : "/api/supportFeeConfig/add";
    const res = await axios.post(url, {
      id: form.id,
      province: form.province,
      city: form.city,
      extraFee: Number(form.extraFee),
      startTime: form.startTime,
      endTime: form.endTime || null,
      remark: form.remark,
    });
    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? "编辑成功" : "新增成功");
      closeModal();
      getList();
    } else {
      ElMessage.error(res.data.message || "操作失败");
    }
  } catch (err) {
    console.error("提交错误:", err);
  } finally {
    submitting.value = false;
  }
}

// ========== 批量删除 ==========
async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 条扶持派费配置？该操作不可恢复。`,
      "批量删除",
      { confirmButtonText: "确认删除", cancelButtonText: "取消", type: "warning" }
    );
  } catch { return; }

  try {
    const res = await axios.delete("/api/supportFeeConfig/batch", {
      data: selectedIds.value,
    });
    if (res.data.code === 200) {
      ElMessage.success("删除成功");
      getList();
    } else {
      ElMessage.error(res.data.message || "删除失败");
    }
  } catch (err) {
    console.error("批量删除错误:", err);
  }
}

// ========== 状态持久化 ==========
watch([query, pageNo, pageSize], () => {
  if (saveTabState) {
    saveTabState(currentPath, {
      province: query.province,
      city: query.city,
      pageNo: pageNo.value,
      pageSize: pageSize.value,
    });
  }
}, { deep: true });

onMounted(() => {
  if (getTabState) {
    const saved = getTabState(currentPath);
    if (saved) {
      query.province = saved.province || "";
      query.city = saved.city || "";
      pageNo.value = saved.pageNo || 1;
      pageSize.value = saved.pageSize || 10;
    }
  }
  getList();
});
</script>

<style scoped>
.support-fee-container {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (min-width: 1400px) {
    padding: 24px;
  }
}

.support-fee-container > h2 {
  display: none;
}

.search-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: center;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.search-item input {
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  width: 180px;
  outline: none;
  transition: border-color 0.2s;
}

.search-item input:focus {
  border-color: #409eff;
}

.button-group {
  display: flex;
  gap: 8px;
}

.btn-search,
.btn-reset {
  padding: 6px 18px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.btn-search {
  background: #409eff;
  color: #fff;
}
.btn-search:hover { background: #66b1ff; }

.btn-reset {
  background: #f4f4f5;
  color: #606266;
  border: 1px solid #dcdfe6;
}
.btn-reset:hover { background: #e9e9eb; }

.action-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn-primary,
.btn-danger {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.2s;
}

.btn-primary {
  background: #409eff;
  color: #fff;
}
.btn-primary:hover { background: #66b1ff; }

.btn-danger {
  background: #f56c6c;
  color: #fff;
}
.btn-danger:hover:not(:disabled) { background: #f78989; }
.btn-danger:disabled {
  background: #fbc4c4;
  cursor: not-allowed;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: center;
}

.data-table thead th {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
  padding: 12px 8px;
  border-bottom: 1px solid #ebeef5;
}

.data-table tbody td {
  padding: 12px 8px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.data-table tbody tr:hover {
  background: #f5f7fa;
}

.text-center {
  text-align: center;
}

.fee-cell {
  color: #e6a23c;
  font-weight: 600;
}
.fee-unit {
  color: #909399;
  font-size: 12px;
  margin-left: 2px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

.btn-link {
  background: none;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
}
.btn-link:hover { color: #66b1ff; }

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 520px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}
.modal-header h3 { margin: 0; font-size: 16px; color: #303133; }
.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  color: #909399;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover { color: #606266; }

.modal-body {
  padding: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}
.form-item label {
  width: 130px;
  color: #606266;
  font-size: 14px;
  text-align: right;
  flex-shrink: 0;
}
.form-item label .required {
  color: #f56c6c;
  margin-left: 2px;
}
.form-item input,
.form-item textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  min-width: 0;
}
.form-item input:focus,
.form-item textarea:focus {
  border-color: #409eff;
}
.form-item textarea {
  resize: vertical;
  font-family: inherit;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.btn-cancel {
  background: #f4f4f5;
  color: #606266;
  border: 1px solid #dcdfe6;
}
.btn-cancel:hover { background: #e9e9eb; }

.btn-confirm {
  background: #409eff;
  color: #fff;
}
.btn-confirm:hover:not(:disabled) { background: #66b1ff; }
.btn-confirm:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}
</style>
