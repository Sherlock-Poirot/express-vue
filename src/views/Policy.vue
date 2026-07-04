<template>
  <div class="policy-container">
    <div class="page-header">
      <div class="header-actions">
        <button class="search-btn" @click="openAddModal" v-if="hasBtnPermission('新增政策', '新增')">新增政策</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>政策类型</th>
            <th>重量左区间(kg/票)</th>
            <th>重量右区间(kg/票)</th>
            <th>基数</th>
            <th>金额(元)</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in tableData" :key="item.id" :class="{ 'even-row': index % 2 === 0 }">
            <td>{{ getPolicyTypeName(item.policyType) }}</td>
            <td>{{ formatWeight(item.weightLeft) }}</td>
            <td>{{ formatWeight(item.weightRight) }}</td>
            <td>{{ item.baseAmount }}</td>
            <td>{{ item.amount }}</td>
            <td>{{ formatDate(item.createTime) }}</td>
            <td>{{ formatDate(item.updateTime) }}</td>
            <td>
              <button class="edit-btn" @click="openEditModal(item)" v-if="hasBtnPermission('编辑', '修改')">编辑</button>
              <button class="delete-btn" @click="handleDelete(item.id)" v-if="hasBtnPermission('删除', '移除')">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" v-if="modalVisible" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑政策' : '新增政策' }}</h3>
          <span class="close" @click="closeModal">×</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>政策类型：</label>
            <select v-model="form.policyType">
              <option :value="1">基数返利</option>
              <option :value="2">固定收费</option>
              <option :value="3">动态返利</option>
            </select>
          </div>
          <div class="form-item">
            <label>重量左区间(kg/票)：</label>
            <input type="number" v-model="form.weightLeft" step="0.1" />
          </div>
          <div class="form-item">
            <label>重量右区间(kg/票)：</label>
            <input type="number" v-model="form.weightRight" step="0.1" />
          </div>
          <div class="form-item">
            <label>基数：</label>
            <input type="number" v-model="form.baseAmount" />
          </div>
          <div class="form-item">
            <label>金额(元)：</label>
            <input type="number" v-model="form.amount" step="0.01" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModal">取消</button>
          <button class="confirm-btn" @click="submitForm">{{ isEdit ? '保存修改' : '确认添加' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'Policy'
})

import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage, ElLoading } from 'element-plus';
import { hasBtnPermission } from '@/utils/auth';

const tableData = ref([]);
const modalVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
  policyType: 1,
  weightLeft: '',
  weightRight: '',
  baseAmount: '',
  amount: ''
});
const editId = ref(null);

const getPolicyTypeName = (type) => {
  const types = {
    1: '基数返利',
    2: '固定收费',
    3: '动态返利'
  };
  return types[type] || `类型${type}`;
};

const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return '-';
  return weight.toString();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const loadData = async () => {
  const loading = ElLoading.service({
    lock: true,
    text: '加载中...',
    background: 'rgba(0, 0, 0, 0.7)',
  });
  try {
    const res = await axios.get('/api/policy/list');
    if (res.data.code === 200) {
      tableData.value = res.data.data;
    } else {
      ElMessage.error(res.data.message || '加载失败');
    }
  } catch (err) {
    console.error('加载失败', err);
    ElMessage.error('加载失败，请稍后重试');
  } finally {
    loading.close();
  }
};

const openAddModal = () => {
  isEdit.value = false;
  editId.value = null;
  form.policyType = 1;
  form.weightLeft = '';
  form.weightRight = '';
  form.baseAmount = '';
  form.amount = '';
  modalVisible.value = true;
};

const openEditModal = (item) => {
  isEdit.value = true;
  editId.value = item.id;
  form.policyType = item.policyType;
  form.weightLeft = item.weightLeft?.toString() || '';
  form.weightRight = item.weightRight?.toString() || '';
  form.baseAmount = item.baseAmount?.toString() || '';
  form.amount = item.amount?.toString() || '';
  modalVisible.value = true;
};

const closeModal = () => {
  modalVisible.value = false;
};

const submitForm = async () => {

  const loading = ElLoading.service({
    lock: true,
    text: '提交中...',
    background: 'rgba(0, 0, 0, 0.7)',
  });

  try {
    const data = {
      policyType: Number(form.policyType),
      weightLeft: Number(form.weightLeft),
      weightRight: Number(form.weightRight),
      baseAmount: Number(form.baseAmount),
      amount: Number(form.amount)
    };

    let res;
    if (isEdit.value) {
      res = await axios.put(`/api/policy/${editId.value}`, data);
    } else {
      res = await axios.post('/api/policy/create', data);
    }

    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? '修改成功' : '添加成功');
      closeModal();
      loadData();
    } else {
      ElMessage.error(res.data.message || '操作失败');
    }
  } catch (err) {
    console.error('操作失败', err);
    ElMessage.error('操作失败，请稍后重试');
  } finally {
    loading.close();
  }
};

const handleDelete = async (id) => {
  if (!confirm('确定要删除这条政策吗？')) {
    return;
  }

  try {
    const res = await axios.delete(`/api/policy/${id}`);
    if (res.data.code === 200) {
      ElMessage.success('删除成功');
      loadData();
    } else {
      ElMessage.error(res.data.message || '删除失败');
    }
  } catch (err) {
    console.error('删除失败', err);
    ElMessage.error('删除失败，请稍后重试');
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.policy-container {
  padding: 16px;
  min-height: 100vh;
  background: #f5f7fa;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.page-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    margin-bottom: 20px;
  }
}

.header-actions {
  display: flex;
  gap: 10px;

  @media (min-width: 1400px) {
    gap: 12px;
  }
}

.search-btn {
  background: #1890ff;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;

  @media (min-width: 1400px) {
    padding: 8px 20px;
    font-size: 14px;
  }
}

.search-btn:hover {
  background: #40a9ff;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  background-color: #fafafa;
}

tbody tr:hover {
  background-color: #e6f7ff;
}

.edit-btn {
  background: #52c41a;
  color: #fff;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 6px;
  transition: background 0.3s;

  @media (min-width: 1400px) {
    padding: 4px 12px;
    margin-right: 8px;
  }
}

.edit-btn:hover {
  background: #73d13d;
}

.delete-btn {
  background: #ff4d4f;
  color: #fff;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.3s;

  @media (min-width: 1400px) {
    padding: 4px 12px;
  }
}

.delete-btn:hover {
  background: #ff7875;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 420px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  @media (min-width: 1400px) {
    width: 450px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #ebeef5;

  @media (min-width: 1400px) {
    padding: 16px 20px;
  }
}

.modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: #333;

  @media (min-width: 1400px) {
    font-size: 16px;
  }
}

.modal-header .close {
  font-size: 22px;
  color: #999;
  cursor: pointer;
  line-height: 1;

  @media (min-width: 1400px) {
    font-size: 24px;
  }
}

.modal-header .close:hover {
  color: #666;
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
    margin-bottom: 16px;
  }
}

.form-item label {
  display: inline-block;
  width: 110px;
  text-align: right;
  margin-right: 10px;
  font-size: 13px;
  color: #333;

  @media (min-width: 1400px) {
    width: 120px;
    margin-right: 12px;
    font-size: 14px;
  }
}

.form-item input,
.form-item select {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  width: 200px;

  @media (min-width: 1400px) {
    padding: 8px 12px;
    font-size: 14px;
    width: 220px;
  }
}

.form-item input:focus,
.form-item select:focus {
  outline: none;
  border-color: #1890ff;
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

.cancel-btn {
  background: #f5f5f5;
  color: #666;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;

  @media (min-width: 1400px) {
    padding: 8px 20px;
    font-size: 14px;
  }
}

.cancel-btn:hover {
  background: #e8e8e8;
}

.confirm-btn {
  background: #1890ff;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;

  @media (min-width: 1400px) {
    padding: 8px 20px;
    font-size: 14px;
  }
}

.confirm-btn:hover {
  background: #40a9ff;
}
</style>