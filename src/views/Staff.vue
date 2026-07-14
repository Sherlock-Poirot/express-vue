<template>
  <div class="staff-management-container">
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
        <!-- 按钮组 -->
        <div class="button-group">
          <button class="btn-search" @click="getList">搜索</button>
          <button class="btn-reset" @click="resetQuery">重置</button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <!-- 操作按钮 -->
      <div class="action-bar">
        <button class="btn-primary" @click="handleAdd" v-if="hasBtnPermission('settlement:employee:add', '新增员工', '新增')">
          <span class="icon">+</span>
          新增
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
              <th class="text-center">承包区</th>
              <th class="text-center">员工姓名</th>
              <th class="text-center">手机号码</th>
              <th class="text-center">入职日期</th>
              <th class="text-center">操作</th>
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
              <td class="text-center">
                <button class="btn-link" @click="handleEdit(item)" v-if="hasBtnPermission('settlement:employee:edit', '编辑员工', '编辑', '修改')">编辑</button>
              </td>
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

    <!-- 新增/编辑弹窗 -->
    <div class="modal-overlay" v-if="modalVisible" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑员工' : '新增员工' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>承包区<span class="required">*</span></label>
            <input
              v-model="form.contractName"
              placeholder="请输入承包区"
            />
          </div>
          <div class="form-item">
            <label>姓名<span class="required">*</span></label>
            <input
              v-model="form.realName"
              placeholder="请输入姓名"
            />
          </div>
          <div class="form-item">
            <label>手机号码<span class="required">*</span></label>
            <input
              v-model="form.phone"
              placeholder="请输入手机号码"
            />
          </div>
          <div class="form-item">
            <label>入职日期<span class="required">*</span></label>
            <input
              v-model="form.entryDate"
              type="date"
            />
          </div>
          <div class="form-item">
            <label>职员类型<span class="required">*</span></label>
            <select v-model="form.staffType">
              <option :value="0">承包区</option>
              <option :value="1">业务员</option>
            </select>
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
  name: 'Staff'
})

import { ref, reactive, computed, onMounted, inject, watch } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination.vue";
import { hasBtnPermission } from "@/utils/auth";

const saveTabState = inject('saveTabState');
const getTabState = inject('getTabState');
const currentPath = '/settlement/employee';

const query = reactive({
  staffName: "",
  phone: "",
});

const pageNo = ref(1);
const pageSize = ref(10);
const list = ref([]);
const total = ref(0);
const selectedIds = ref([]);

// 弹窗相关
const modalVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);

const form = reactive({
  id: null,
  contractName: "",
  realName: "",
  phone: "",
  entryDate: "",
  staffType: 0
});

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

// 新增
function handleAdd() {
  isEdit.value = false;
  resetForm();
  modalVisible.value = true;
}

// 编辑
function handleEdit(item) {
  isEdit.value = true;
  form.id = item.id;
  form.contractName = item.contractName || '';
  form.realName = item.realName || '';
  form.phone = item.phone || '';
  form.entryDate = item.entryDate || '';
  form.staffType = item.staffType !== undefined ? item.staffType : 0;
  modalVisible.value = true;
}

// 重置表单
function resetForm() {
  form.id = null;
  form.contractName = "";
  form.realName = "";
  form.phone = "";
  form.entryDate = "";
  form.staffType = 0;
}

// 关闭弹窗
function closeModal() {
  modalVisible.value = false;
  resetForm();
}

// 提交表单
async function handleSubmit() {
  // 表单验证
  if (!form.contractName.trim()) {
    ElMessage.warning('请输入承包区');
    return;
  }
  if (!form.realName.trim()) {
    ElMessage.warning('请输入姓名');
    return;
  }
  if (!form.phone.trim()) {
    ElMessage.warning('请输入手机号码');
    return;
  }
  if (!form.entryDate) {
    ElMessage.warning('请选择入职日期');
    return;
  }

  submitting.value = true;
  try {
    const url = isEdit.value ? '/api/staff/update' : '/api/staff/add';
    const res = await axios.post(url, {
      id: form.id,
      contractName: form.contractName,
      realName: form.realName,
      phone: form.phone,
      entryDate: form.entryDate,
      staffType: form.staffType
    });

    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功');
      closeModal();
      getList();
    } else {
      ElMessage.error(res.data.message || '操作失败');
    }
  } catch (err) {
    console.error("提交错误:", err);
    ElMessage.error("网络错误或服务异常");
  } finally {
    submitting.value = false;
  }
}

watch([query, pageNo, pageSize], () => {
  if (saveTabState) {
    saveTabState(currentPath, {
      staffName: query.staffName,
      phone: query.phone,
      pageNo: pageNo.value,
      pageSize: pageSize.value,
    });
  }
}, { deep: true });

onMounted(() => {
  if (getTabState) {
    const savedState = getTabState(currentPath);
    if (savedState) {
      query.staffName = savedState.staffName || '';
      query.phone = savedState.phone || '';
      pageNo.value = savedState.pageNo || 1;
      pageSize.value = savedState.pageSize || 10;
    }
  }
  getList();
});
</script>

<style scoped>
.staff-management-container {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (min-width: 1400px) {
    padding: 24px;
  }
}

.staff-management-container > h2 {
  display: none;
}

.page-header {
  padding: 12px 0 16px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    padding: 16px 0 20px;
    margin-bottom: 20px;
  }
}
.page-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;

  @media (min-width: 1400px) {
    font-size: 18px;
  }
}

/* --- 搜索区域样式 --- */
.search-card {
  background: #fff;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    padding: 20px;
    margin-bottom: 20px;
  }
}

.search-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    gap: 20px;
  }
}

.search-item {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.search-item label {
  width: 70px;
  color: #606266;
  font-weight: 500;
  font-size: 13px;
  flex-shrink: 0;

  @media (min-width: 1400px) {
    width: 80px;
    font-size: 14px;
  }
}
.search-item input {
  width: 180px;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.3s;

  @media (min-width: 1400px) {
    width: 200px;
    padding: 10px 12px;
    font-size: 14px;
  }
}
.search-item input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 3px rgba(64, 158, 255, 0.3);
}

.button-group {
  display: flex;
  gap: 10px;
  margin-left: auto;

  @media (min-width: 1400px) {
    gap: 12px;
  }
}
.btn-search {
  background: #409eff;
  color: #fff;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}
.btn-search:hover {
  background: #66b1ff;
}
.btn-reset {
  background: #f5f7fa;
  color: #606266;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* --- 表格区域样式 --- */
.table-card {
  background: #fff;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.action-bar {
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    margin-bottom: 16px;
  }
}

.btn-primary {
  background: #409eff;
  color: #fff;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  @media (min-width: 1400px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}
.btn-primary:hover {
  background: #66b1ff;
}

.btn-primary .icon {
  font-size: 14px;
  font-weight: bold;

  @media (min-width: 1400px) {
    font-size: 16px;
  }
}

.btn-link {
  background: none;
  color: #409eff;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}
.btn-link:hover {
  color: #66b1ff;
}

.table-wrapper {
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    margin-bottom: 20px;
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  text-align: left;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 12px 16px;
    font-size: 14px;
  }
}

.data-table th {
  background: #fafafa;
  color: #606266;
  font-weight: 500;
}

.text-center {
  text-align: center;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 4px 12px;
    font-size: 13px;
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;

  @media (min-width: 1400px) {
    padding: 60px 20px;
  }
}

/* --- 弹窗样式 --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 440px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  @media (min-width: 1400px) {
    width: 480px;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #ebeef5;

  @media (min-width: 1400px) {
    padding: 16px 20px;
  }
}

.modal-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;

  @media (min-width: 1400px) {
    font-size: 16px;
  }
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.modal-close:hover {
  color: #606266;
}

.modal-body {
  padding: 16px;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.form-item {
  margin-bottom: 14px;

  @media (min-width: 1400px) {
    margin-bottom: 18px;
  }
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;

  @media (min-width: 1400px) {
    margin-bottom: 8px;
    font-size: 14px;
  }
}

.form-item .required {
  color: #f56c6c;
  margin-left: 4px;
}

.form-item input,
.form-item select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;

  @media (min-width: 1400px) {
    padding: 10px 12px;
    font-size: 14px;
  }
}

.form-item input:focus,
.form-item select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 3px rgba(64, 158, 255, 0.3);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid #ebeef5;

  @media (min-width: 1400px) {
    gap: 12px;
    padding: 16px 20px;
  }
}

.btn-cancel {
  background: #fff;
  color: #606266;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}
.btn-cancel:hover {
  border-color: #409eff;
  color: #409eff;
}

.btn-confirm {
  background: #409eff;
  color: #fff;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 20px;
    font-size: 14px;
  }
}
.btn-confirm:hover:not(:disabled) {
  background: #66b1ff;
}
.btn-confirm:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}
</style>
