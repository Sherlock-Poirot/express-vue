<template>
  <div class="cost-management-page">
    <div class="toolbar">
      <div class="search-section">
        <input type="month" v-model="query.month" class="search-input" />
        <select v-model="query.costType" class="search-select">
          <option value="">全部类型</option>
          <option v-for="item in costTypeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
        <button class="btn btn-primary" @click="handleSearch">查询</button>
        <button class="btn btn-primary" @click="openAddModal" v-if="hasBtnPermission('新增成本', '新增')">新增成本</button>
        <button class="btn btn-delete-batch" @click="handleBatchDelete" :disabled="selectedIds.length === 0" v-if="hasBtnPermission('批量删除', '删除')">
          批量删除
        </button>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-item" v-for="item in typeSummary" :key="item.costType">
        <span class="summary-label">{{ item.costTypeName }}</span>
        <span class="summary-value">{{ formatAmount(item.totalAmount) }}</span>
      </div>
      <div class="summary-item highlight">
        <span class="summary-label">总成本</span>
        <span class="summary-value total-cost">{{ totalCost }}</span>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="checkbox-column">
              <input type="checkbox" v-model="selectAll" @change="handleSelectAll" />
            </th>
            <th>月份</th>
            <th>成本类型</th>
            <th>成本名称</th>
            <th>金额</th>
            <th>备注</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in costList" :key="item.id">
            <td class="checkbox-column">
              <input type="checkbox" :checked="selectedIds.includes(item.id)" @change="handleRowSelect(item.id, $event.target.checked)" />
            </td>
            <td>{{ item.month || '-' }}</td>
            <td>{{ getCostTypeName(item.costType) }}</td>
            <td>{{ item.costName }}</td>
            <td>{{ formatAmount(item.amount) }}</td>
            <td>{{ item.remark || '-' }}</td>
            <td>{{ formatDateTime(item.createTime) }}</td>
            <td>
              <button class="btn btn-edit" @click="openEditModal(item)" v-if="hasBtnPermission('编辑', '修改')">编辑</button>
              <button class="btn btn-delete" @click="handleDelete(item.id)" v-if="hasBtnPermission('删除', '移除')">删除</button>
            </td>
          </tr>
          <tr v-if="costList.length === 0">
            <td colspan="8" class="empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" v-if="modalVisible" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑成本' : '新增成本' }}</h3>
          <span class="close-btn" @click="closeModal">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>月份：</label>
            <input type="month" v-model="form.month" class="form-input" />
          </div>
          <div class="form-group">
            <label>成本类型：</label>
            <select v-model="form.costType" class="form-select">
              <option value="" disabled>请选择成本类型</option>
              <option v-for="item in costTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>成本名称：</label>
            <input type="text" v-model="form.costName" class="form-input" placeholder="请输入成本名称" />
          </div>
          <div class="form-group">
            <label>金额：</label>
            <input type="number" v-model="form.amount" class="form-input" placeholder="请输入金额" step="0.01" />
          </div>
          <div class="form-group">
            <label>备注：</label>
            <textarea v-model="form.remark" class="form-textarea" placeholder="请输入备注"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="closeModal">取消</button>
          <button class="btn btn-confirm" @click="submitForm">{{ isEdit ? '保存修改' : '确认添加' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { hasBtnPermission } from "@/utils/auth";

const costTypeOptions = [
  { value: 1, label: '场地成本' },
  { value: 2, label: '人工成本' },
  { value: 3, label: '操作成本' },
  { value: 4, label: '运能成本' },
  { value: 5, label: '折旧成本' },
  { value: 6, label: '其他' },
];

const getCostTypeName = (type) => {
  const option = costTypeOptions.find(item => item.value === type);
  return option ? option.label : '未知';
};

const getCurrentMonth = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const query = reactive({
  month: getCurrentMonth(),
  costType: '',
});

const costList = ref([]);
const typeSummary = ref([]);
const totalCost = ref('0.00');

const selectedIds = ref([]);
const selectAll = ref(false);

const modalVisible = ref(false);
const isEdit = ref(false);
const editingId = ref(null);

const form = reactive({
  month: '',
  costType: '',
  costName: '',
  amount: '',
  remark: '',
});

const formatAmount = (amount) => {
  if (!amount) return '0';
  const formatted = Number(amount).toFixed(3);
  return formatted.replace(/\.?0+$/, '');
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-';
  return dateTime.replace('T', ' ').substring(0, 19);
};

const handleSearch = async () => {
  await loadCostList();
  await loadSummary();
};

const loadCostList = async () => {
  try {
    const params = {};
    if (query.month) {
      params.month = query.month;
    }
    if (query.costType) {
      params.costType = query.costType;
    }
    const res = await axios.get('/api/cost/list', { params });
    if (res.data.code === 200) {
      costList.value = res.data.data;
    } else {
      ElMessage.error(res.data.message || '查询失败');
    }
  } catch (err) {
    console.error('查询失败', err);
    ElMessage.error('查询失败，请稍后重试');
  }
};

const loadSummary = async () => {
  try {
    const month = query.month;
    const res = await axios.get(`/api/cost/summary/${month}`);
    if (res.data.code === 200) {
      const data = res.data.data;
      typeSummary.value = data.typeSummaryList || [];
      totalCost.value = formatAmount(data.totalAmount);
    } else {
      ElMessage.error(res.data.message || '获取汇总数据失败');
    }
  } catch (err) {
    console.error('获取汇总数据失败', err);
    ElMessage.error('获取汇总数据失败，请稍后重试');
  }
};

const handleSelectAll = (event) => {
  const checked = event.target.checked;
  if (checked) {
    selectedIds.value = costList.value.map(item => item.id);
  } else {
    selectedIds.value = [];
  }
};

const handleRowSelect = (id, checked) => {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id);
    }
  } else {
    selectedIds.value = selectedIds.value.filter(itemId => itemId !== id);
  }
};

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  try {
    const res = await axios.delete('/api/cost/batch/delete', { data: selectedIds.value });
    if (res.data.code === 200) {
      ElMessage.success('批量删除成功');
      selectedIds.value = [];
      selectAll.value = false;
      await handleSearch();
    } else {
      ElMessage.error(res.data.message || '批量删除失败');
    }
  } catch (err) {
    console.error('批量删除失败', err);
    ElMessage.error('批量删除失败，请稍后重试');
  }
};

const openAddModal = () => {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  form.month = query.month; // 默认使用查询的月份
  modalVisible.value = true;
};

const openEditModal = (item) => {
  isEdit.value = true;
  editingId.value = item.id;
  form.month = item.month || '';
  form.costType = item.costType;
  form.costName = item.costName;
  form.amount = item.amount;
  form.remark = item.remark || '';
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
  resetForm();
};

const resetForm = () => {
  form.month = '';
  form.costType = '';
  form.costName = '';
  form.amount = '';
  form.remark = '';
};

const submitForm = async () => {
  if (!form.month) {
    ElMessage.warning('请选择月份');
    return;
  }
  if (!form.costType) {
    ElMessage.warning('请选择成本类型');
    return;
  }
  if (!form.costName) {
    ElMessage.warning('请输入成本名称');
    return;
  }
  if (!form.amount || Number(form.amount) <= 0) {
    ElMessage.warning('请输入有效的金额');
    return;
  }

  try {
    const data = {
      month: form.month,
      costType: Number(form.costType),
      costName: form.costName,
      amount: Number(form.amount),
      remark: form.remark,
    };

    if (isEdit.value) {
      const res = await axios.put(`/api/cost/${editingId.value}`, data);
      if (res.data.code === 200) {
        ElMessage.success('修改成功');
      } else {
        ElMessage.error(res.data.message || '修改失败');
      }
    } else {
      const res = await axios.post('/api/cost/create', data);
      if (res.data.code === 200) {
        ElMessage.success('添加成功');
      } else {
        ElMessage.error(res.data.message || '添加失败');
      }
    }

    closeModal();
    await loadCostList();
    await loadSummary();
  } catch (err) {
    console.error('操作失败', err);
    ElMessage.error('操作失败，请稍后重试');
  }
};

const handleDelete = async (id) => {
  if (!confirm('确定要删除这条记录吗？')) {
    return;
  }

  try {
    const res = await axios.delete(`/api/cost/${id}`);
    if (res.data.code === 200) {
      ElMessage.success('删除成功');
      await loadCostList();
      await loadSummary();
    } else {
      ElMessage.error(res.data.message || '删除失败');
    }
  } catch (err) {
    console.error('删除失败', err);
    ElMessage.error('删除失败，请稍后重试');
  }
};

onMounted(() => {
  loadCostList();
  loadSummary();
});
</script>

<style scoped>
.cost-management-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-edit {
  background: #52c41a;
  color: #fff;
  padding: 4px 10px;
  font-size: 12px;
  margin-right: 6px;
}

.btn-delete {
  background: #ff4d4f;
  color: #fff;
  padding: 4px 10px;
  font-size: 12px;
}

.btn-delete-batch {
  background: #ff4d4f;
  color: #fff;
}

.btn-delete-batch:disabled {
  background: #ff4d4f;
  color: #fff;
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.btn-cancel {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #ddd;
}

.btn-confirm {
  background: #1890ff;
  color: #fff;
}

.summary-card {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 100px;
  padding: 8px 16px;
  border-right: 1px solid #f0f0f0;
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
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.summary-value.total-cost {
  color: #fa8c16;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #fafafa;
  padding: 12px 10px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  text-align: left;
  font-size: 14px;
  color: #333;
}

td {
  padding: 12px 10px;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
  color: #666;
}

tbody tr:hover {
  background-color: #f5f7fa;
}

.empty {
  text-align: center;
  color: #999;
  padding: 40px;
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
  max-width: 480px;
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

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
