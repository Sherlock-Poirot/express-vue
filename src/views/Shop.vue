<template>
  <div class="page-container">
    <div class="tool-box">
      <div class="search-group">
        <div class="search-item">
          <label>客户名称：</label>
          <div class="select-wrapper">
            <input
              v-model="queryParams.name"
              placeholder="请输入"
              @keyup.enter="doSearch"
              @input="handleCustomerSearch('name')"
              @focus="handleCustomerSearch('name')"
              @blur="
                () => setTimeout(() => (showCustomerDropdown = false), 150)
              "
            />
            <div
              v-if="showCustomerDropdown && activeInput === 'name'"
              class="dropdown"
              @mousedown.prevent
            >
              <div
                v-for="(item, index) in visibleCustomerList"
                :key="index"
                class="dropdown-item"
                @click="selectCustomer(item, 'query')"
              >
                {{ item.customerCode }} - {{ item.customerName }}
              </div>
              <div v-if="hasMore" class="load-more" ref="loadMoreRef">
                加载更多...
              </div>
            </div>
          </div>
        </div>
        <div class="search-item">
          <label>客户编码：</label>
          <div class="select-wrapper">
            <input
              v-model="queryParams.code"
              placeholder="请输入"
              @keyup.enter="doSearch"
              @input="handleCustomerSearch('code')"
              @focus="handleCustomerSearch('code')"
              @blur="
                () => setTimeout(() => (showCustomerDropdown = false), 150)
              "
            />
            <div
              v-if="showCustomerDropdown && activeInput === 'code'"
              class="dropdown"
              @mousedown.prevent
            >
              <div
                v-for="(item, index) in visibleCustomerList"
                :key="index"
                class="dropdown-item"
                @click="selectCustomer(item, 'query')"
              >
                {{ item.customerCode }} - {{ item.customerName }}
              </div>
              <div v-if="hasMore" class="load-more" ref="loadMoreRef">
                加载更多...
              </div>
            </div>
          </div>
        </div>
        <div class="search-item">
          <label>承包区名称：</label>
          <input
            v-model="queryParams.empName"
            placeholder="请输入"
            @keyup.enter="doSearch"
          />
        </div>
        <div class="search-item">
          <label>店铺名称：</label>
          <input
            v-model="queryParams.shopName"
            placeholder="请输入"
            @keyup.enter="doSearch"
          />
        </div>
        <button class="btn search" @click="doSearch">搜索</button>
      </div>

      <div class="btn-group">
        <button class="btn primary" @click="handleAdd" v-if="hasBtnPermission('新增', '新增店铺')">新增</button>
        <button class="btn danger" @click="handleBatchDelete" v-if="hasBtnPermission('批量删除', '删除')">批量删除</button>
        <button class="btn warning" @click="handleImport" v-if="hasBtnPermission('导入', '导入Excel')">导入</button>
      </div>
    </div>

    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                v-model="allChecked"
                @change="handleCheckAll"
              />
            </th>
            <th>客户编码</th>
            <th>客户名称</th>
            <th>店铺名称</th>
            <th>店铺ID</th>
            <th>平台</th>
            <th>直营/承包</th>
            <th>类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in tableData" :key="item.id">
            <td>
              <input type="checkbox" v-model="checkedIds" :value="item.id" />
            </td>
            <td>{{ item.code }}</td>
            <td>{{ item.custName }}</td>
            <td>{{ item.shopName }}</td>
            <td>{{ item.shopId }}</td>
            <td>{{ item.platform }}</td>
            <td>{{ item.empName }}</td>
            <td>{{ item.empType }}</td>
            <td>
              <button class="btn edit" @click="handleEdit(item)" v-if="hasBtnPermission('编辑', '修改')">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-model:current-page="queryParams.pageNo"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      @change="handlePageChange"
    />

    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <span class="close" @click="closeModal">×</span>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-item">
              <label><span class="red">*</span>客户编码：</label>
              <div class="select-wrapper">
                <input
                  v-model="form.code"
                  placeholder="请输入"
                  @input="handleModalCustomerSearch('code')"
                  @focus="handleModalCustomerSearch('code')"
                  @blur="
                    () =>
                      setTimeout(() => (showModalCustomerDropdown = false), 150)
                  "
                />
                <div
                  v-if="
                    showModalCustomerDropdown && modalActiveInput === 'code'
                  "
                  class="dropdown"
                  @mousedown.prevent
                >
                  <div
                    v-for="(item, index) in visibleModalCustomerList"
                    :key="index"
                    class="dropdown-item"
                    @click="selectCustomer(item, 'modal')"
                  >
                    {{ item.customerCode }} - {{ item.customerName }}
                  </div>
                  <div
                    v-if="modalHasMore"
                    class="load-more"
                    ref="modalLoadMoreRef"
                  >
                    加载更多...
                  </div>
                </div>
              </div>
            </div>

            <div class="form-item">
              <label><span class="red">*</span>客户名称：</label>
              <div class="select-wrapper">
                <input
                  v-model="form.name"
                  placeholder="请输入"
                  @input="handleModalCustomerSearch('name')"
                  @focus="handleModalCustomerSearch('name')"
                  @blur="
                    () =>
                      setTimeout(() => (showModalCustomerDropdown = false), 150)
                  "
                />
                <div
                  v-if="
                    showModalCustomerDropdown && modalActiveInput === 'name'
                  "
                  class="dropdown"
                  @mousedown.prevent
                >
                  <div
                    v-for="(item, index) in visibleModalCustomerList"
                    :key="index"
                    class="dropdown-item"
                    @click="selectCustomer(item, 'modal')"
                  >
                    {{ item.customerCode }} - {{ item.customerName }}
                  </div>
                  <div
                    v-if="modalHasMore"
                    class="load-more"
                    ref="modalLoadMoreRef"
                  >
                    加载更多...
                  </div>
                </div>
              </div>
            </div>

            <div class="form-item">
              <label><span class="red">*</span>店铺名称：</label>
              <input v-model="form.shopName" placeholder="请输入" />
            </div>

            <div class="form-item">
              <label><span class="red">*</span>店铺ID：</label>
              <input v-model="form.shopId" placeholder="请输入" />
            </div>

            <div class="form-item">
              <label>平台：</label>
              <select v-model="form.platform">
                <option value="">请选择</option>
                <option>菜鸟</option>
                <option>拼多多</option>
                <option>字节</option>
                <option>京东</option>
                <option>快手</option>
                <option>腾讯</option>
                <option>得物</option>
                <option>小红书</option>
                <option>唯品会</option>
                <option>圆通</option>
              </select>
            </div>

            <div class="form-item">
              <label>直营/承包：</label>
              <input v-model="form.empName" placeholder="请输入" />
            </div>

            <div class="form-item">
              <label>类型：</label>
              <select v-model="form.empType">
                <option value="">请选择</option>
                <option>散件</option>
                <option>淘宝</option>
                <option>限定</option>
                <option>特批</option>
              </select>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'Shop'
})

import { ref, reactive, onMounted, onUnmounted, inject, watch } from "vue";
import axios from "axios";
import { getCurrentInstance } from "vue";
import Pagination from "@/components/Pagination.vue";
import { hasBtnPermission } from "@/utils/auth";
const { proxy } = getCurrentInstance();

const saveTabState = inject('saveTabState');
const getTabState = inject('getTabState');
const currentPath = '/settlement/shop';

const queryParams = reactive({
  name: "",
  code: "",
  empName: "",
  shopName: "",
  pageNo: 1,
  pageSize: 10,
});

const tableData = ref([]);
const total = ref(0);
const pages = ref(0);

const checkedIds = ref([]);
const allChecked = ref(false);

const showModal = ref(false);
const title = ref("新增店铺");
const form = reactive({
  id: "",
  shopId: "",
  code: "",
  name: "",
  shopName: "",
  platform: "",
  empName: "",
  empType: "",
});

// 搜索区域互斥下拉
const customerList = ref([]);
const visibleCustomerList = ref([]);
const showCustomerDropdown = ref(false);
const activeInput = ref(""); // 标记当前激活的输入框 name / code
const hasMore = ref(true);
const loadMoreRef = ref(null);
let observer = null;

// 弹窗区域互斥下拉
const modalCustomerList = ref([]);
const visibleModalCustomerList = ref([]);
const showModalCustomerDropdown = ref(false);
const modalActiveInput = ref("");
const modalHasMore = ref(true);
const modalLoadMoreRef = ref(null);
let modalObserver = null;

// 搜索框输入（互斥逻辑）
async function handleCustomerSearch(type) {
  activeInput.value = type;
  if (type === "name") queryParams.code = "";
  if (type === "code") queryParams.name = "";
  await fetchCustomerList(type, "query");
}

// 弹窗输入（互斥逻辑）
async function handleModalCustomerSearch(type) {
  modalActiveInput.value = type;
  if (type === "name") form.code = "";
  if (type === "code") form.name = "";
  await fetchCustomerList(type, "modal");
}

// 统一请求接口
async function fetchCustomerList(type, target = "query") {
  const param = {};
  if (type === "name") {
    param.name = target === "query" ? queryParams.name : form.name;
  } else {
    param.code = target === "query" ? queryParams.code : form.code;
  }

  if (!param.name && !param.code) {
    if (target === "query") {
      customerList.value = [];
      visibleCustomerList.value = [];
      showCustomerDropdown.value = false;
    } else {
      modalCustomerList.value = [];
      visibleModalCustomerList.value = [];
      showModalCustomerDropdown.value = false;
    }
    return;
  }

  try {
    const res = await axios.get("/api/shop/fuzzyMatch", { params: param });
    const data = res.data.data || [];

    if (target === "query") {
      customerList.value = data;
      visibleCustomerList.value = data.slice(0, 5);
      hasMore.value = data.length > 5;
      showCustomerDropdown.value = true;
    } else {
      modalCustomerList.value = data;
      visibleModalCustomerList.value = data.slice(0, 5);
      modalHasMore.value = data.length > 5;
      showModalCustomerDropdown.value = true;
    }
  } catch (e) {}
}

// 选中客户
function selectCustomer(item, target = "query") {
  if (target === "query") {
    queryParams.code = item.customerCode;
    queryParams.name = item.customerName;
    showCustomerDropdown.value = false;
  } else {
    form.code = item.customerCode;
    form.name = item.customerName;
    showModalCustomerDropdown.value = false;
  }
}

// 滚动加载
function initLoadMore() {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value) {
      const start = visibleCustomerList.value.length;
      const add = customerList.value.slice(start, start + 5);
      visibleCustomerList.value = [...visibleCustomerList.value, ...add];
      hasMore.value =
        visibleCustomerList.value.length < customerList.value.length;
    }
  });

  modalObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && modalHasMore.value) {
      const start = visibleModalCustomerList.value.length;
      const add = modalCustomerList.value.slice(start, start + 5);
      visibleModalCustomerList.value = [
        ...visibleModalCustomerList.value,
        ...add,
      ];
      modalHasMore.value =
        visibleModalCustomerList.value.length < modalCustomerList.value.length;
    }
  });
}

watch(queryParams, (newVal) => {
  if (saveTabState) {
    saveTabState(currentPath, {
      name: newVal.name,
      code: newVal.code,
      empName: newVal.empName,
      shopName: newVal.shopName,
      pageNo: newVal.pageNo,
      pageSize: newVal.pageSize
    });
  }
}, { deep: true });

onMounted(() => {
  if (getTabState) {
    const savedState = getTabState(currentPath);
    if (savedState) {
      queryParams.name = savedState.name || '';
      queryParams.code = savedState.code || '';
      queryParams.empName = savedState.empName || '';
      queryParams.shopName = savedState.shopName || '';
      queryParams.pageNo = savedState.pageNo || 1;
      queryParams.pageSize = savedState.pageSize || 10;
    }
  }
  getList();
  initLoadMore();
  setTimeout(() => {
    if (loadMoreRef.value) observer.observe(loadMoreRef.value);
    if (modalLoadMoreRef.value) modalObserver.observe(modalLoadMoreRef.value);
  }, 200);
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  if (modalObserver) modalObserver.disconnect();
});

function handleAdd() {
  title.value = "新增店铺";
  showModal.value = true;
  form.id = "";
  form.shopId = "";
  form.code = "";
  form.name = "";
  form.shopName = "";
  form.platform = "";
  form.empName = "";
  form.empType = "";
}

function handleEdit(row) {
  title.value = "编辑店铺";
  showModal.value = true;
  form.id = row.id;
  form.shopId = row.shopId || "";
  form.code = row.code;
  form.name = row.custName;
  form.shopName = row.shopName;
  form.platform = row.platform || "";
  form.empName = row.empName || "";
  form.empType = row.empType || "";
}

function closeModal() {
  showModal.value = false;
}

async function save() {
  if (!form.shopId) {
    proxy.$msg("请输入店铺ID");
    return;
  }
  if (!form.code) {
    proxy.$msg("请输入客户编码");
    return;
  }
  if (!form.name) {
    proxy.$msg("请输入客户名称");
    return;
  }
  if (!form.shopName) {
    proxy.$msg("请输入店铺名称");
    return;
  }

  try {
    const submitData = {
      id: form.id,
      shopId: form.shopId,
      code: form.code,
      custName: form.name,
      shopName: form.shopName,
      platform: form.platform,
      empName: form.empName,
      empType: form.empType,
    };

    if (form.id) {
      await axios.post("/api/shop/update", submitData);
      proxy.$msg("编辑成功！");
    } else {
      await axios.post("/api/shop/add", submitData);
      proxy.$msg("新增成功！");
    }
    closeModal();
    getList();
  } catch (e) {}
}

const handleCheckAll = () => {
  if (allChecked.value) {
    checkedIds.value = tableData.value.map((item) => item.id);
  } else {
    checkedIds.value = [];
  }
};

async function getList() {
  try {
    const res = await axios.get("/api/shop/search", { params: queryParams });
    const data = res.data.data;
    tableData.value = data.records;
    total.value = data.total;
    pages.value = data.pages;
    checkedIds.value = [];
    allChecked.value = false;
  } catch (e) {}
}

function doSearch() {
  queryParams.pageNo = 1;
  getList();
}

function handlePageChange({ pageNo, pageSize }) {
  queryParams.pageNo = pageNo;
  queryParams.pageSize = pageSize;
  getList();
}

async function handleBatchDelete() {
  if (checkedIds.value.length === 0) {
    proxy.$msg("请选择要删除的数据");
    return;
  }

  try {
    await proxy.$confirm(
      `确定要删除选中的 ${checkedIds.value.length} 条数据吗？`,
    );
    await axios.post("/api/shop/batchDelete", checkedIds.value);
    proxy.$msg("删除成功！");
    await getList();
    if (tableData.value.length === 0 && queryParams.pageNo > 1) {
      queryParams.pageNo--;
      getList();
    }
  } catch (e) {}
}

async function handleImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx,.xls";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/shop/import", formData);
      proxy.$msg("导入成功！共导入：" + res.data.data + " 条数据");
      getList();
    } catch (err) {}
  };
  input.click();
}
</script>

<style scoped>
.page-container {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px #00000008;
}
.page-container h2 {
  margin-bottom: 18px;
  font-size: 18px;
  color: #333;
}
.tool-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.search-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.search-item label {
  font-size: 14px;
  color: #555;
}
.search-item input {
  padding: 7px 10px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  outline: none;
  width: 160px;
}
.btn {
  padding: 7px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn.search {
  background: #409eff;
  color: white;
}
.btn.primary {
  background: #00b42a;
  color: white;
}
.btn.danger {
  background: #f53f3f;
  color: white;
}
.btn.warning {
  background: #ff7d00;
  color: white;
}
.btn.edit {
  background: #409eff;
  color: white;
  padding: 4px 10px;
}
.btn-group {
  display: flex;
  gap: 8px;
}
.table-box {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  background: #fafafa;
  padding: 12px;
  text-align: center;
  font-weight: 600;
  color: #333;
  border: 1px solid #ebeef5;
}
td {
  padding: 12px;
  text-align: center;
  border: 1px solid #ebeef5;
}
tbody tr:hover {
  background: #fafafa;
}


.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #fff;
  width: 700px;
  border-radius: 8px;
  overflow: hidden;
}
.modal-header {
  padding: 15px 20px;
  background: #f8f8f8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header .close {
  font-size: 20px;
  cursor: pointer;
  color: #666;
}
.modal-body {
  padding: 20px;
}
.modal-footer {
  padding: 15px 20px;
  text-align: right;
  border-top: 1px solid #eee;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-item label {
  font-size: 14px;
  color: #333;
}
.form-item input,
.form-item select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}
.red {
  color: red;
}
.modal-content::after {
  content: "";
  position: absolute;
  top: 15px;
  right: 15px;
  width: 120px;
  height: 120px;
  background-image: url("../public/logo.jpg");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.4;
  pointer-events: none;
  z-index: 10;
}

.select-wrapper {
  position: relative;
}
.dropdown {
  position: absolute;
  top: 34px;
  left: 0;
  width: 100%;
  max-height: 160px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.dropdown-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
}
.dropdown-item:hover {
  background: #f0f7ff;
}
.load-more {
  padding: 6px 10px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
