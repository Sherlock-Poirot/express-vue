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
      <button class="search-btn" @click="openImport" v-if="hasBtnPermission('settlement:bill:import', '导入Excel')">导入Excel</button>
      <button class="search-btn" @click="doClean" v-if="hasBtnPermission('settlement:bill:clean', '数据清洗')">数据清洗</button>
      <button class="search-btn" @click="doValidate" v-if="hasBtnPermission('settlement:bill:validate', '数据校验')">数据校验</button>
      <button class="search-btn" @click="doCalculate" v-if="hasBtnPermission('settlement:bill:calculate', '执行计算')">执行计算</button>
      <button class="search-btn" @click="doGenerateSummary" v-if="hasBtnPermission('settlement:bill:generateSummary', '生成汇总账单')">
        生成汇总账单
      </button>
      <button class="search-btn" @click="doExportSummary" v-if="hasBtnPermission('settlement:bill:exportSummary', '汇总导出')">
        汇总导出
      </button>
      <button class="search-btn" @click="doExportDetail" v-if="hasBtnPermission('settlement:bill:exportDetail', '明细导出')">
        明细导出
      </button>
      <button class="search-btn" @click="openDiffImport" v-if="hasBtnPermission('settlement:bill:importDiff', '导入差异重量')">
        导入差异重量
      </button>
      <button class="search-btn" @click="doArchive" v-if="hasBtnPermission('settlement:bill:archive', '归档')">归档</button>
      <button class="search-btn" @click="openVerify" v-if="hasBtnPermission('settlement:bill:verify', '账单验算')">账单验算</button>
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

    <!-- 导入差异重量 弹窗 -->
    <div class="modal" v-if="diffImportVisible" @click.self="closeDiffImport">
      <div class="modal-content">
        <div class="modal-header">
          <h3>导入差异重量数据</h3>
          <span class="close" @click="closeDiffImport">×</span>
        </div>
        <div style="padding: 20px">
          <input type="file" ref="diffFileRef" accept=".xlsx,.xls" />
          <div style="margin-top: 15px">
            <button
              class="search-btn"
              @click="submitDiffImport"
              :disabled="diffImporting"
            >
              {{ diffImporting ? "上传中..." : "确认导入" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据校验结果 弹窗 -->
    <div class="modal" v-if="validateVisible" @click.self="closeValidate">
      <div class="modal-content validate-modal">
        <div class="modal-header">
          <h3>数据校验结果</h3>
          <span class="close" @click="closeValidate">×</span>
        </div>
        <div class="validate-body">
          <div class="validate-summary" :class="validateResult.valid ? 'success' : 'error'">
            <el-icon :size="20" style="margin-right: 8px">
              <CircleCheck v-if="validateResult.valid" />
              <Warning v-else />
            </el-icon>
            <span>{{ validateResult.valid ? '校验通过，数据完整无误！' : `校验不通过，共 ${validateResult.errors.length} 条错误` }}</span>
          </div>
          <div v-if="!validateResult.valid && validateResult.errors.length > 0" class="error-list">
            <div class="error-table-container">
              <table class="error-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>客户名称</th>
                    <th>客户编码</th>
                    <th>错误类型</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(error, index) in validateResult.errors" :key="index">
                    <td>{{ index + 1 }}</td>
                    <td>{{ error.customerName }}</td>
                    <td>{{ error.customerCode }}</td>
                    <td class="error-type">{{ error.errorType }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="search-btn" @click="closeValidate">关闭</button>
        </div>
      </div>
    </div>

    <!-- 账单验算 弹窗 -->
    <div class="modal" v-if="verifyVisible" @click.self="closeVerify">
      <div class="modal-content verify-modal">
        <div class="modal-header">
          <h3>账单验算</h3>
          <span class="close" @click="closeVerify">×</span>
        </div>
        <div class="verify-body">
          <div class="verify-form-grid">
            <div class="verify-form-item">
              <label>客户编码</label>
              <div class="verify-select-wrapper">
                <input
                  v-model="verifyForm.code"
                  placeholder="请输入客户编码"
                  @input="handleVerifyCustomerSearch('code')"
                  @focus="handleVerifyCustomerSearch('code')"
                  @blur="() => setTimeout(() => (showVerifyDropdown = false), 150)"
                />
                <div
                  v-if="showVerifyDropdown && verifyActiveInput === 'code'"
                  class="verify-dropdown"
                  @mousedown.prevent
                >
                  <div
                    v-for="(item, index) in visibleVerifyCustomerList"
                    :key="index"
                    class="verify-dropdown-item"
                    @click="selectVerifyCustomer(item)"
                  >
                    {{ item.customerCode }} - {{ item.customerName }}
                  </div>
                  <div v-if="verifyHasMore" class="verify-load-more" @click="loadMoreVerifyCustomer">
                    加载更多...
                  </div>
                </div>
              </div>
            </div>
            <div class="verify-form-item">
              <label>客户名称</label>
              <div class="verify-select-wrapper">
                <input
                  v-model="verifyForm.name"
                  placeholder="请输入客户名称"
                  @input="handleVerifyCustomerSearch('name')"
                  @focus="handleVerifyCustomerSearch('name')"
                  @blur="() => setTimeout(() => (showVerifyDropdown = false), 150)"
                />
                <div
                  v-if="showVerifyDropdown && verifyActiveInput === 'name'"
                  class="verify-dropdown"
                  @mousedown.prevent
                >
                  <div
                    v-for="(item, index) in visibleVerifyCustomerList"
                    :key="index"
                    class="verify-dropdown-item"
                    @click="selectVerifyCustomer(item)"
                  >
                    {{ item.customerCode }} - {{ item.customerName }}
                  </div>
                  <div v-if="verifyHasMore" class="verify-load-more" @click="loadMoreVerifyCustomer">
                    加载更多...
                  </div>
                </div>
              </div>
            </div>
            <div class="verify-form-item">
              <label>扫描时间</label>
              <div class="verify-picker-box">
                <el-date-picker
                  v-model="verifyForm.scanTime"
                  type="date"
                  placeholder="请选择扫描时间"
                  value-format="YYYY-MM-DD"
                />
              </div>
            </div>
            <div class="verify-form-item">
              <label>计费重量（kg）</label>
              <input v-model="verifyForm.weight" type="number" placeholder="请输入计费重量" />
            </div>
            <div class="verify-form-item">
              <label>计费省份</label>
              <el-select
                v-model="verifyForm.province"
                placeholder="请选择计费省份"
                filterable
                clearable
                class="verify-select-box"
              >
                <el-option
                  v-for="item in provinceOptions"
                  :key="item.dictValue"
                  :label="item.dictLabel"
                  :value="item.dictLabel"
                />
              </el-select>
            </div>
            <div class="verify-form-item">
              <label>计费目的地名称</label>
              <input v-model="verifyForm.destName" placeholder="请输入计费目的地名称" />
            </div>
            <div class="verify-form-item">
              <label>加收</label>
              <input v-model="verifyForm.officeExtra" type="number" placeholder="请输入加收金额" />
            </div>
            <div class="verify-form-item">
              <label>账单显示费用</label>
              <input v-model="verifyForm.expense" readonly placeholder="由验算接口回填" class="verify-readonly" />
            </div>
            <div class="verify-form-item">
              <label>预付款</label>
              <input v-model="verifyForm.preFee" readonly placeholder="由验算接口回填" class="verify-readonly" />
            </div>
            <div class="verify-form-item">
              <label>快递费用</label>
              <input v-model="verifyForm.realFee" readonly placeholder="由验算接口回填" class="verify-readonly" />
            </div>
            <div class="verify-form-item"></div>
            <div class="verify-form-item verify-calc-cell">
              <button class="search-btn verify-calc-btn" @click="doVerifyCalc">计算</button>
            </div>
          </div>

          <!-- 价格表 -->
          <div class="verify-price-box" v-if="verifyPriceGroups.length > 0">
            <div class="verify-price-title">
              {{ verifyForm.name || verifyForm.code }} - 价格表
            </div>
            <div v-for="(group, idx) in verifyPriceGroups" :key="idx" class="verify-price-group">
              <table class="verify-table">
                <thead>
                  <tr>
                    <th width="90">开始日期</th>
                    <th width="90">结束日期</th>
                    <th width="70">预付款</th>
                    <th width="60">区域</th>
                    <th width="70" v-for="w in group.weightHeaders" :key="w">{{ w }}</th>
                    <th width="80">首重价格</th>
                    <th width="80">续重价格</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in group.items" :key="i">
                    <td>{{ item.startTime }}</td>
                    <td>{{ item.endTime }}</td>
                    <td>{{ item.prepayment }}</td>
                    <td>{{ item.area }}</td>
                    <td v-for="w in group.weightHeaders" :key="w">{{ item.prices[w] || "-" }}</td>
                    <td>{{ item.firstFee }}</td>
                    <td>{{ item.overFee }}</td>
                  </tr>
                  <tr v-if="group.remark" class="verify-remark-row">
                    <td :colspan="6 + group.weightHeaders.length">
                      <img src="/logo.jpg" class="verify-remark-logo" alt="logo" />
                      <strong>备注：</strong>{{ group.remark }}
                    </td>
                  </tr>
                  <tr v-if="verifyAreaRemarks.length > 0" class="verify-area-remark-row">
                    <td :colspan="6 + group.weightHeaders.length" class="verify-area-remark-td">
                      <span v-for="area in verifyAreaRemarks" :key="area.areaNum" class="verify-area-item">
                        {{ verifyAreaName(area.areaNum) }}：{{ area.areaCity }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
import { ElMessage, ElLoading, ElMessageBox } from "element-plus";
import { CircleCheck, Warning } from "@element-plus/icons-vue";
import Pagination from "@/components/Pagination.vue";
import { hasBtnPermission } from "@/utils/auth";

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
const diffImportVisible = ref(false);
const diffFileRef = ref(null);
const diffImporting = ref(false);
const validateVisible = ref(false);
const validateResult = reactive({
  valid: true,
  errors: []
});

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

function openDiffImport() {
  diffImportVisible.value = true;
}

function closeDiffImport() {
  diffImportVisible.value = false;
}

async function submitDiffImport() {
  const file = diffFileRef.value?.files?.[0];

  if (!file) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    diffImporting.value = true;
    closeDiffImport();

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/api/waybill/import/diff", formData);

    if (res.data.code === 200) {
      const taskNo = res.data.data;
      ElMessage.success("上传成功，后台正在导入差异重量数据...");
      startPollTask(taskNo);
    } else {
      ElMessage.error(res.data.message || "上传失败");
      diffImporting.value = false;
    }
  } catch (err) {
    ElMessage.error("上传失败：" + (err.message || err));
    diffImporting.value = false;
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

async function doValidate() {
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在校验数据...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const params = {};
    if (query.billMonth) {
      params.date = query.billMonth;
    }
    const res = await axios.post("/api/waybill/validate", null, { params });
    if (res.data.code === 200) {
      const data = res.data.data;
      validateResult.valid = data.valid;
      validateResult.errors = data.errors || [];
      validateVisible.value = true;
    } else {
      ElMessage.error(res.data.message || "数据校验失败");
    }
  } catch (err) {
    console.error("数据校验失败", err);
    ElMessage.error("数据校验失败，请稍后重试");
  } finally {
    loading.close();
  }
}

function closeValidate() {
  validateVisible.value = false;
}

// ==================== 账单验算 ====================
const verifyVisible = ref(false);
const verifyForm = reactive({
  code: "",
  name: "",
  scanTime: "",
  weight: "",
  province: "",
  destName: "",
  officeExtra: "",
  expense: "",
  preFee: "",
  realFee: "",
});

// 客户模糊匹配下拉（与店铺管理页面一致的模式）
const verifyCustomerList = ref([]);
const visibleVerifyCustomerList = ref([]);
const showVerifyDropdown = ref(false);
const verifyActiveInput = ref("");
const verifyHasMore = ref(false);
const VERIFY_PAGE_SIZE = 5;

// 价格表数据
const verifyPriceGroups = ref([]);
const verifyAreaRemarks = ref([]);

// 计费省份字典（dictCode: province_type）
const provinceOptions = ref([]);
let provinceDictLoaded = false;

async function fetchProvinceOptions() {
  if (provinceDictLoaded) return;
  try {
    const res = await axios.get("/api/dict/items/province_type");
    if (res.data.code === 200) {
      provinceOptions.value = res.data.data || [];
      provinceDictLoaded = true;
    }
  } catch (e) {
    console.error("获取计费省份字典失败", e);
  }
}

function openVerify() {
  verifyVisible.value = true;
  fetchProvinceOptions();
}

function closeVerify() {
  verifyVisible.value = false;
}

function resetVerifyCustomerList() {
  verifyCustomerList.value = [];
  visibleVerifyCustomerList.value = [];
  verifyHasMore.value = false;
  showVerifyDropdown.value = false;
}

// 输入搜索客户（互斥逻辑：填名称清编码，填编码清名称）
async function handleVerifyCustomerSearch(type) {
  verifyActiveInput.value = type;
  if (type === "name") verifyForm.code = "";
  if (type === "code") verifyForm.name = "";
  // 客户变更后，旧价格表和计算结果失效，先清空
  verifyPriceGroups.value = [];
  verifyAreaRemarks.value = [];
  verifyForm.expense = "";
  verifyForm.preFee = "";
  verifyForm.realFee = "";

  const param = {};
  if (type === "name") {
    param.name = verifyForm.name;
  } else {
    param.code = verifyForm.code;
  }
  if (!param.name && !param.code) {
    resetVerifyCustomerList();
    return;
  }
  try {
    const res = await axios.get("/api/shop/fuzzyMatch", { params: param });
    const data = res.data.data || [];
    verifyCustomerList.value = data;
    visibleVerifyCustomerList.value = data.slice(0, VERIFY_PAGE_SIZE);
    verifyHasMore.value = data.length > VERIFY_PAGE_SIZE;
    showVerifyDropdown.value = true;
  } catch (e) {}
}

function loadMoreVerifyCustomer() {
  const next = visibleVerifyCustomerList.value.length + VERIFY_PAGE_SIZE;
  visibleVerifyCustomerList.value = verifyCustomerList.value.slice(0, next);
  verifyHasMore.value = verifyCustomerList.value.length > next;
}

// 选中客户后拉取价格表
function selectVerifyCustomer(item) {
  verifyForm.code = item.customerCode;
  verifyForm.name = item.customerName;
  showVerifyDropdown.value = false;
  fetchVerifyPrice();
}

async function fetchVerifyPrice() {
  if (!verifyForm.code) return;
  try {
    const res = await axios.get("/api/customer/price", {
      params: { kCode: verifyForm.code },
    });
    if (res.data.code !== 200) {
      ElMessage.error(res.data.message || "获取价格表失败");
      return;
    }
    const data = res.data.data || {};
    const priceList = data.priceList || data || [];
    verifyAreaRemarks.value = priceList[0]?.areas || [];

    const groupResult = [];
    for (const parent of priceList) {
      const { startTime, endTime, prepayment, detail, remark } = parent;
      const weightSet = new Set();
      const items = [];
      for (const d of detail || []) {
        const prices = {};
        (d.fixedFee || []).forEach((f) => {
          const key = f.weight + "kg";
          prices[key] = f.fee;
          weightSet.add(key);
        });
        items.push({
          startTime,
          endTime,
          prepayment,
          area: d.area,
          firstFee: d.firstFee,
          overFee: d.overFee,
          prices,
        });
      }
      groupResult.push({
        weightHeaders: Array.from(weightSet).sort(
          (a, b) => parseFloat(a) - parseFloat(b)
        ),
        items,
        remark: remark || "",
      });
    }
    verifyPriceGroups.value = groupResult;
  } catch (e) {
    console.error("获取价格表失败", e);
  }
}

function verifyAreaName(num) {
  const map = { 1: "一区", 2: "二区", 3: "三区", 4: "四区", 5: "五区" };
  return map[num] || "其他";
}

// 验算：单条运单费用计算
async function doVerifyCalc() {
  if (!verifyForm.code || !verifyForm.name) {
    ElMessage.warning("请先选择客户");
    return;
  }
  if (!verifyForm.scanTime) {
    ElMessage.warning("请选择扫描时间");
    return;
  }
  if (verifyForm.weight === "" || verifyForm.weight === null) {
    ElMessage.warning("请输入计费重量");
    return;
  }
  if (!verifyForm.province) {
    ElMessage.warning("请选择计费省份");
    return;
  }
  if (!verifyForm.destName) {
    ElMessage.warning("请输入计费目的地名称");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在计算...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const payload = {
      scanDate: verifyForm.scanTime,
      weight: Number(verifyForm.weight),
      province: verifyForm.province,
      destination: verifyForm.destName,
      code: verifyForm.code,
      name: verifyForm.name,
      officeExtra: verifyForm.officeExtra === "" ? 0 : Number(verifyForm.officeExtra),
      overFlag: false,
      processed: false,
    };
    const res = await axios.post("/api/waybill/calculateSingle", payload);
    if (res.data.code === 200) {
      const data = res.data.data || {};
      verifyForm.expense = data.expense ?? "";
      verifyForm.preFee = data.preFee ?? "";
      verifyForm.realFee = data.realFee ?? "";
      ElMessage.success("计算完成");
    } else {
      ElMessage.error(res.data.message || "计算失败");
    }
  } catch (err) {
    console.error("账单验算失败", err);
    ElMessage.error(err?.response?.data?.message || "计算失败，请稍后重试");
  } finally {
    loading.close();
  }
}

async function doArchive() {
  try {
    const dateTip = query.billMonth ? `【${query.billMonth}】` : "【全部】";
    await ElMessageBox.confirm(
      `归档操作会将运单明细从原表迁移至归档表（迁移后清空原表），即将归档${dateTip}月份的数据，确认继续？`,
      "归档确认",
      {
        confirmButtonText: "确认归档",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: false,
      }
    );
  } catch (e) {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在归档数据...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const params = {};
    if (query.billMonth) {
      params.date = query.billMonth;
    }
    const res = await axios.post("/api/waybill/archive", null, { params });
    if (res.data.code === 200) {
      const count = res.data.data ?? 0;
      ElMessage.success(`归档成功，共归档 ${count} 条运单明细`);
      await doSearch();
    } else {
      ElMessage.error(res.data.message || "归档失败");
    }
  } catch (err) {
    console.error("归档失败", err);
    ElMessage.error("归档失败，请稍后重试");
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

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    gap: 12px;
    margin-bottom: 12px;
  }
}

.action-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    gap: 12px;
    margin-bottom: 16px;
  }
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  font-weight: 500;
  color: #333;
  font-size: 13px;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}

.search-item input {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 6px 10px;
    font-size: 14px;
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

.tab-box {
  display: flex;
  background: #fff;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  margin-bottom: -1px;
}

.tab-item {
  padding: 8px 20px;
  cursor: pointer;
  background: #f5f7fa;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 24px;
    font-size: 14px;
  }
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
  padding: 8px 8px;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 12px;
    font-size: 14px;
  }
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
  max-width: 460px;
  border-radius: 12px;
  overflow: hidden;

  @media (min-width: 1400px) {
    max-width: 500px;
  }
}

.modal-header {
  padding: 14px 18px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (min-width: 1400px) {
    padding: 16px 20px;
  }
}

.modal-footer {
  padding: 14px 18px;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #ebeef5;

  @media (min-width: 1400px) {
    padding: 16px 20px;
  }
}

.validate-modal {
  max-width: 650px;

  @media (min-width: 1400px) {
    max-width: 700px;
  }
}

.validate-body {
  padding: 16px;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.validate-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 500;

  @media (min-width: 1400px) {
    padding: 16px 20px;
    margin-bottom: 16px;
    font-size: 16px;
  }
}

.validate-summary.success {
  background: #f0f9eb;
  color: #67c23a;
}

.validate-summary.error {
  background: #fef0f0;
  color: #f56c6c;
}

.error-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.error-table-container {
  overflow-x: auto;
}

.error-table {
  width: 100%;
  border-collapse: collapse;
}

.error-table th {
  background: #f5f7fa;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  text-align: center;
  font-size: 13px;
  color: #606266;
  position: sticky;
  top: 0;
}

.error-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  text-align: center;
  font-size: 13px;
}

/* ==================== 账单验算弹窗 ==================== */
.verify-modal {
  max-width: 1200px;

  @media (min-width: 1400px) {
    max-width: 1400px;
  }
}

.verify-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.verify-form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 16px;
}

.verify-form-item {
  display: flex;
  align-items: center;
}

.verify-form-item > label {
  width: 110px;
  flex-shrink: 0;
  font-size: 14px;
  color: #606266;
  text-align: right;
  margin-right: 10px;
}

/* 统一输入框样式：普通输入 / 客户模糊下拉输入 完全一致 */
.verify-form-item > input,
.verify-select-wrapper input {
  flex: 1;
  min-width: 0;
  height: 32px;
  box-sizing: border-box;
  line-height: 32px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.verify-form-item > input:focus,
.verify-select-wrapper input:focus {
  border-color: #1890ff;
}

.verify-form-item > input.verify-readonly {
  background: #f5f7fa;
  color: #f56c6c;
  font-weight: 700;
  cursor: not-allowed;
}

.verify-form-item > input.verify-readonly::placeholder {
  color: #c0c4cc;
  font-weight: 400;
}

.verify-select-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
}

.verify-select-wrapper input {
  width: 100%;
}

.verify-picker-box {
  flex: 1;
  min-width: 0;
}

/* 计费省份下拉，与其他输入框同宽同高 */
.verify-select-box {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.verify-select-box :deep(.el-select__wrapper) {
  min-height: 32px;
  height: 32px;
  box-sizing: border-box;
  border-radius: 4px;
  font-size: 13px;
}

.verify-picker-box :deep(.el-date-editor) {
  width: 100%;
  height: 32px;
}

.verify-picker-box :deep(.el-date-editor .el-input__wrapper) {
  height: 32px;
  box-sizing: border-box;
  padding: 0 10px;
  border-radius: 4px;
}

.verify-picker-box :deep(.el-date-editor .el-input__inner) {
  height: 30px;
  line-height: 30px;
  font-size: 13px;
}

.verify-calc-cell {
  justify-content: flex-end;
}

.verify-calc-btn {
  height: 32px;
  padding: 0 22px;
  box-sizing: border-box;
}

.verify-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}

.verify-dropdown-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.verify-dropdown-item:hover {
  background: #f5f7fa;
  color: #1890ff;
}

.verify-load-more {
  padding: 8px 12px;
  text-align: center;
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
  border-top: 1px solid #ebeef5;
}

.verify-price-box {
  margin-top: 22px;
  border-top: 1px dashed #dcdfe6;
  padding-top: 16px;
}

.verify-price-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #303133;
}

.verify-price-group {
  margin-bottom: 8px;

  @media (min-width: 1400px) {
    margin-bottom: 10px;
  }
}

.verify-table {
  width: 100%;
  border-collapse: collapse;
}

.verify-table th,
.verify-table td {
  text-align: center;
  padding: 8px 6px;
  border: 1px solid #ebeef5;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 10px 8px;
    font-size: 14px;
  }
}

.verify-table th {
  background: #f5f7fa;
  font-weight: 600;
}

.verify-table tr:hover {
  background: #fafafa;
}

/* 备注行（与价格管理详情一致） */
.verify-remark-row {
  background-color: #f9fafb;
}

.verify-remark-row td {
  text-align: left !important;
  padding: 12px 14px;
  font-size: 13px;
  color: #333;
  border-top: 1px solid #ebeef5;

  @media (min-width: 1400px) {
    padding: 14px 16px;
    font-size: 14px;
  }
}

.verify-remark-row strong {
  color: #1890ff;
  margin-right: 8px;
}

.verify-remark-logo {
  width: 80px;
  height: auto;
  opacity: 0.25;
  vertical-align: middle;
  margin-right: 8px;

  @media (min-width: 1400px) {
    width: 100px;
    margin-right: 10px;
  }
}

/* 区域备注行（与价格管理详情一致） */
.verify-area-remark-row td {
  background: #f9f9f9;
  text-align: left !important;
  padding: 6px 12px;
  border-top: 1px dashed #eee;
}

.verify-area-remark-td {
  font-size: 12px !important;
  color: #666 !important;
  line-height: 1.5;
}

.verify-area-item {
  display: block;
  margin-bottom: 2px;
}

.error-table tr:hover {
  background: #f5f7fa;
}

.error-type {
  color: #f56c6c;
  font-weight: 500;
}

.close {
  font-size: 20px;
  cursor: pointer;
}
</style>
