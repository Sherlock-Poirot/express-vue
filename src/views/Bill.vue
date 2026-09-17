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
      <button class="search-btn" @click="openFlow" v-if="hasBtnPermission('settlement:bill:flow', '流程图')">流程图</button>
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
    <div class="modal validate-overlay" v-if="validateVisible" @click.self="closeValidate">
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

    <!-- 账单工作流流程图弹窗 -->
    <div class="modal" v-if="flowVisible" @click.self="closeFlow">
      <div class="modal-content flow-modal">
        <div class="modal-header">
          <h3>账单工作流</h3>
          <span class="close" @click="closeFlow">×</span>
        </div>
        <div class="flow-body">
          <!-- 月份切换（联动：优先取列表当前选中的账单月份） -->
          <div class="flow-toolbar">
            <el-select
              v-model="flowMonth"
              placeholder="选择账单月份"
              filterable
              class="flow-month-select"
              @change="fetchFlowDetail"
            >
              <el-option v-for="m in flowMonths" :key="m" :label="m" :value="m" />
            </el-select>
            <button class="search-btn" @click="fetchFlowDetail">刷新</button>
            <span class="flow-current-tip" v-if="flowBatch">
              当前进度：{{ flowStepName(flowBatch.currentStepCode) }}
            </span>
          </div>

          <!-- 空状态 -->
          <div v-if="!flowBatch && !flowLoading" class="flow-empty">该月份暂无工作流批次</div>

          <!-- 流程节点横向流水线 -->
          <div v-else class="flow-pipeline" v-loading="flowLoading">
            <template v-for="(step, idx) in flowBatch.steps" :key="step.stepCode">
              <div
                class="flow-node"
                :class="[
                  flowStatusClass(step.status),
                  {
                    current: flowBatch.currentStepCode === step.stepCode,
                    active: flowActiveStep === step.stepCode,
                  },
                ]"
                @click="flowActiveStep = step.stepCode"
              >
                <div class="flow-node-order">{{ idx + 1 }}</div>
                <div class="flow-node-name">{{ step.stepName }}</div>
                <div class="flow-node-status">{{ step.statusDesc || step.status }}</div>
              </div>
              <div
                v-if="idx < flowBatch.steps.length - 1"
                class="flow-arrow"
                :class="{ done: flowArrowDone(idx) }"
              >
                →
              </div>
            </template>
          </div>

          <!-- 节点详情 -->
          <div v-if="flowActiveStepObj" class="flow-detail">
            <div class="flow-detail-title">{{ flowActiveStepObj.stepName }} · 详情</div>
            <!-- 操作按钮：按当前节点与状态动态显示（前置条件由后端校验） -->
            <div
              class="flow-detail-actions"
              v-if="flowShowImport || flowShowDiffImport || flowShowClean || flowShowValidate || flowShowCalculate || flowShowConfirm || flowShowSkip"
            >
              <button class="search-btn" v-if="flowShowImport" @click="openFlowImport">导入账单文件</button>
              <button class="search-btn" v-if="flowShowDiffImport" @click="openFlowDiffImport">导入差异数据</button>
              <button class="search-btn" v-if="flowShowClean" @click="flowRunClean">执行清洗</button>
              <button class="search-btn" v-if="flowShowValidate" @click="flowRunValidate">执行校验</button>
              <button class="search-btn" v-if="flowShowCalculate" @click="flowRunCalculate">执行计算</button>
              <button class="search-btn" v-if="flowShowConfirm" @click="doConfirmStep">人工确认通过</button>
              <button class="search-btn flow-skip-btn" v-if="flowShowSkip" @click="doSkipStep">跳过此步骤</button>
            </div>
            <div class="flow-detail-row">
              <span class="flow-detail-label">说明</span>{{ flowActiveStepObj.remark || "-" }}
            </div>
            <div class="flow-detail-row">
              <span class="flow-detail-label">状态</span>{{ flowActiveStepObj.statusDesc || flowActiveStepObj.status }}
            </div>
            <div class="flow-detail-row" v-if="flowActiveStepObj.operator">
              <span class="flow-detail-label">操作人</span>{{ flowActiveStepObj.operator }}
            </div>
            <div class="flow-detail-row" v-if="flowActiveStepObj.startTime">
              <span class="flow-detail-label">开始时间</span>{{ flowFormatTime(flowActiveStepObj.startTime) }}
            </div>
            <div class="flow-detail-row" v-if="flowActiveStepObj.endTime">
              <span class="flow-detail-label">结束时间</span>{{ flowFormatTime(flowActiveStepObj.endTime) }}
            </div>
            <div class="flow-detail-row flow-detail-error" v-if="flowActiveStepObj.errorMsg">
              <span class="flow-detail-label">失败原因</span>{{ flowActiveStepObj.errorMsg }}
            </div>

            <!-- IMPORT步骤：导入文件清单 -->
            <template v-if="flowActiveStepObj.stepCode === 'IMPORT' && flowImportFiles.length > 0">
              <div class="flow-detail-title">导入文件清单（{{ flowImportFiles.length }} 个）</div>
              <table class="flow-file-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>状态</th>
                    <th>导入条数</th>
                    <th>上传人</th>
                    <th>上传时间</th>
                    <th>失败原因</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(f, i) in flowImportFiles" :key="i">
                    <td class="flow-file-name">{{ f.fileName }}</td>
                    <td>{{ f.statusDesc || f.status }}</td>
                    <td>{{ f.rowCount ?? "-" }}</td>
                    <td>{{ f.operator || "-" }}</td>
                    <td>{{ flowFormatTime(f.createTime) }}</td>
                    <td class="flow-file-error">{{ f.errorMsg || "-" }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
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

import { ref, reactive, computed, onMounted, onUnmounted, inject, watch } from "vue";
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

// 导入目标月份：工具栏打开取列表选中月份，流程图打开取流程图当前月份
const importMonthTarget = ref("");
const diffMonthTarget = ref("");

function openImport() {
  importMonthTarget.value = query.billMonth || "";
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
  if (!importMonthTarget.value) {
    ElMessage.warning("请先选择账单月份");
    return;
  }

  try {
    importing.value = true;
    closeImport();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("billMonth", importMonthTarget.value);

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
  diffMonthTarget.value = query.billMonth || "";
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
  if (!diffMonthTarget.value) {
    ElMessage.warning("请先选择账单月份");
    return;
  }

  try {
    diffImporting.value = true;
    closeDiffImport();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("billMonth", diffMonthTarget.value);

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
        // 流程图弹窗打开时联动刷新步骤状态
        if (flowVisible.value) fetchFlowDetail();
      }

      if (status === "FAILED") {
        clearInterval(pollTimer);
        pollTimer = null;
        importing.value = false;
        ElMessage.error(task.message || "导入失败");
        if (flowVisible.value) fetchFlowDetail();
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
  stopFlowPoll();
});

async function doClean() {
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交清洗任务...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/waybill/clean", null, {
      params: { billMonth: query.billMonth },
    });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "清洗任务已提交，正在异步执行");
    } else {
      ElMessage.error(res.data.message || "数据清洗失败");
    }
  } catch (err) {
    console.error("数据清洗失败", err);
    ElMessage.error(err?.response?.data?.message || "数据清洗失败，请稍后重试");
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
    const res = await axios.post("/api/waybill/validate", null, {
      params: { billMonth: query.billMonth },
    });
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

// ==================== 账单工作流流程图 ====================
const flowVisible = ref(false);
const flowMonths = ref([]);
const flowMonth = ref("");
const flowBatch = ref(null);
const flowLoading = ref(false);
const flowActiveStep = ref("");
let flowPollTimer = null;

// 当前选中步骤的对象
const flowActiveStepObj = computed(() => {
  if (!flowBatch.value || !flowActiveStep.value) return null;
  return flowBatch.value.steps.find((s) => s.stepCode === flowActiveStep.value) || null;
});

// IMPORT步骤的导入文件清单
const flowImportFiles = computed(() => {
  if (flowActiveStepObj.value && flowActiveStepObj.value.stepCode === "IMPORT") {
    return flowBatch.value.importFiles || [];
  }
  return [];
});

// 已完成的步骤状态集合（用于箭头高亮）
const FLOW_DONE_STATUSES = ["SUCCESS", "PASSED", "SKIPPED"];

// 是否显示"人工确认通过"按钮：IMPORT/VALIDATE 步骤执行成功后待人工确认
const flowShowConfirm = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s &&
    (s.stepCode === "IMPORT" || s.stepCode === "VALIDATE") &&
    s.status === "SUCCESS"
  );
});

// 是否显示"跳过此步骤"按钮：仅 IMPORT_DIFF 且处于待执行状态
const flowShowSkip = computed(() => {
  const s = flowActiveStepObj.value;
  return !!s && s.stepCode === "IMPORT_DIFF" && s.status === "WAITING";
});

// ==================== 流程图节点操作按钮显隐 ====================
// IMPORT：允许分多次导入，待执行/成功/失败状态均可继续导入（RUNNING时禁止重复上传）
const flowShowImport = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s &&
    s.stepCode === "IMPORT" &&
    ["WAITING", "SUCCESS", "FAILED"].includes(s.status)
  );
});

// IMPORT_DIFF：可选步骤，待执行/失败时可导入
const flowShowDiffImport = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s && s.stepCode === "IMPORT_DIFF" && ["WAITING", "FAILED"].includes(s.status)
  );
});

// CLEAN：支持重复执行，非执行中/跳过状态均可发起
const flowShowClean = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s && s.stepCode === "CLEAN" && !["RUNNING", "SKIPPED"].includes(s.status)
  );
});

// VALIDATE：待执行/失败时可发起校验
const flowShowValidate = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s && s.stepCode === "VALIDATE" && ["WAITING", "FAILED"].includes(s.status)
  );
});

// CALCULATE：待执行/失败时可发起计算
const flowShowCalculate = computed(() => {
  const s = flowActiveStepObj.value;
  return (
    !!s && s.stepCode === "CALCULATE" && ["WAITING", "FAILED"].includes(s.status)
  );
});

function flowStepName(code) {
  if (!flowBatch.value) return code;
  const step = flowBatch.value.steps.find((s) => s.stepCode === code);
  return step ? step.stepName : code;
}

// 状态 → 样式类
function flowStatusClass(status) {
  const map = {
    WAITING: "st-waiting",
    RUNNING: "st-running",
    SUCCESS: "st-success",
    PASSED: "st-passed",
    FAILED: "st-failed",
    SKIPPED: "st-skipped",
  };
  return map[status] || "";
}

// 第idx个步骤与下一步之间的箭头是否已走完
function flowArrowDone(idx) {
  const step = flowBatch.value && flowBatch.value.steps[idx];
  return !!step && FLOW_DONE_STATUSES.includes(step.status);
}

// 时间格式化（后端时间戳 → yyyy-MM-dd HH:mm:ss）
function flowFormatTime(time) {
  if (!time) return "-";
  const d = new Date(time);
  if (isNaN(d.getTime())) return String(time);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 打开流程图弹窗（联动：优先展示账单列表当前选中的月份）
async function openFlow() {
  flowVisible.value = true;
  flowActiveStep.value = "";
  flowBatch.value = null;
  flowMonths.value = [];
  try {
    const res = await axios.get("/api/waybill/flow/list");
    if (res.data.code === 200) {
      const batches = res.data.data || [];
      flowMonths.value = batches.map((b) => b.billMonth);
      if (flowMonths.value.includes(query.billMonth)) {
        flowMonth.value = query.billMonth;
      } else {
        flowMonth.value = flowMonths.value[0] || "";
      }
      if (flowMonth.value) {
        fetchFlowDetail();
      }
    } else {
      ElMessage.error(res.data.message || "获取工作流批次列表失败");
    }
  } catch (err) {
    console.error("获取工作流批次列表失败", err);
    ElMessage.error("获取工作流批次列表失败，请稍后重试");
  }
}

// 获取指定月份的批次详情（5步骤状态 + 导入文件清单）
async function fetchFlowDetail() {
  if (!flowMonth.value) return;
  flowLoading.value = true;
  try {
    const res = await axios.get(`/api/waybill/flow/${flowMonth.value}`);
    if (res.data.code === 200) {
      flowBatch.value = res.data.data;
      if (flowBatch.value) {
        // 默认选中当前进行中的步骤
        flowActiveStep.value =
          flowBatch.value.currentStepCode ||
          (flowBatch.value.steps[0] && flowBatch.value.steps[0].stepCode) ||
          "";
        startFlowPollIfNeeded();
      }
    } else {
      ElMessage.error(res.data.message || "获取工作流详情失败");
    }
  } catch (err) {
    console.error("获取工作流详情失败", err);
    ElMessage.error("获取工作流详情失败，请稍后重试");
  } finally {
    flowLoading.value = false;
  }
}

// 存在执行中步骤时每5秒自动刷新状态
function startFlowPollIfNeeded() {
  const hasRunning =
    flowBatch.value && (flowBatch.value.steps || []).some((s) => s.status === "RUNNING");
  if (hasRunning) {
    if (!flowPollTimer) {
      flowPollTimer = setInterval(fetchFlowDetail, 5000);
    }
  } else {
    stopFlowPoll();
  }
}

function stopFlowPoll() {
  if (flowPollTimer) {
    clearInterval(flowPollTimer);
    flowPollTimer = null;
  }
}

function closeFlow() {
  flowVisible.value = false;
  flowActiveStep.value = "";
  stopFlowPoll();
}

// 人工确认步骤完成（IMPORT：确认文件已导齐 / VALIDATE：确认核查通过）
async function doConfirmStep() {
  const s = flowActiveStepObj.value;
  if (!s || !flowMonth.value) return;
  const tip =
    s.stepCode === "IMPORT"
      ? "确认原始账单文件已全部导入完成？确认后将进入下一步骤。"
      : "确认校验结果已人工核查通过？确认后将进入计算步骤。";
  try {
    await ElMessageBox.confirm(tip, "人工确认", {
      confirmButtonText: "确认通过",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交确认...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post(
      `/api/waybill/flow/${flowMonth.value}/confirm/${s.stepCode}`
    );
    if (res.data.code === 200) {
      ElMessage.success("确认成功，已解锁下一步骤");
      fetchFlowDetail();
    } else {
      ElMessage.error(res.data.message || "确认失败");
    }
  } catch (err) {
    console.error("人工确认失败", err);
    ElMessage.error(err?.response?.data?.message || "确认失败，请稍后重试");
  } finally {
    loading.close();
  }
}

// 跳过步骤（仅 IMPORT_DIFF）
async function doSkipStep() {
  const s = flowActiveStepObj.value;
  if (!s || !flowMonth.value) return;
  try {
    await ElMessageBox.confirm(
      "确认跳过「导入重量差异数据」步骤？无差异数据时可直接跳过。",
      "跳过步骤",
      {
        confirmButtonText: "确认跳过",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post(
      `/api/waybill/flow/${flowMonth.value}/skip/${s.stepCode}`
    );
    if (res.data.code === 200) {
      ElMessage.success("已跳过该步骤");
      fetchFlowDetail();
    } else {
      ElMessage.error(res.data.message || "跳过失败");
    }
  } catch (err) {
    console.error("跳过步骤失败", err);
    ElMessage.error(err?.response?.data?.message || "跳过失败，请稍后重试");
  } finally {
    loading.close();
  }
}

// ==================== 流程图节点操作：执行各步骤接口 ====================

// 流程图：导入原始账单（IMPORT步骤），复用导入弹窗，目标月份取流程图当前月份
function openFlowImport() {
  importMonthTarget.value = flowMonth.value;
  importVisible.value = true;
}

// 流程图：导入差异重量（IMPORT_DIFF步骤）
function openFlowDiffImport() {
  diffMonthTarget.value = flowMonth.value;
  diffImportVisible.value = true;
}

// 流程图：执行清洗（CLEAN步骤，后端异步执行）
async function flowRunClean() {
  if (!flowMonth.value) return;
  try {
    await ElMessageBox.confirm(
      `确认对 ${flowMonth.value} 执行数据清洗？`,
      "执行清洗",
      { confirmButtonText: "确认执行", cancelButtonText: "取消", type: "warning" }
    );
  } catch {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交清洗任务...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/waybill/clean", null, {
      params: { billMonth: flowMonth.value },
    });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "清洗任务已提交，正在异步执行");
      fetchFlowDetail();
    } else {
      ElMessage.error(res.data.message || "数据清洗失败");
    }
  } catch (err) {
    console.error("数据清洗失败", err);
    ElMessage.error(err?.response?.data?.message || "数据清洗失败，请稍后重试");
  } finally {
    loading.close();
  }
}

// 流程图：执行校验（VALIDATE步骤，同步返回结果，复用校验结果弹窗）
async function flowRunValidate() {
  if (!flowMonth.value) return;
  const loading = ElLoading.service({
    lock: true,
    text: "正在校验数据...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/waybill/validate", null, {
      params: { billMonth: flowMonth.value },
    });
    if (res.data.code === 200) {
      const data = res.data.data;
      validateResult.valid = data.valid;
      validateResult.errors = data.errors || [];
      validateVisible.value = true;
      fetchFlowDetail();
    } else {
      ElMessage.error(res.data.message || "数据校验失败");
    }
  } catch (err) {
    console.error("数据校验失败", err);
    ElMessage.error(err?.response?.data?.message || "数据校验失败，请稍后重试");
  } finally {
    loading.close();
  }
}

// 流程图：执行计算（CALCULATE步骤，后端异步执行）
async function flowRunCalculate() {
  if (!flowMonth.value) return;
  try {
    await ElMessageBox.confirm(
      `确认对 ${flowMonth.value} 执行账单计算？`,
      "执行计算",
      { confirmButtonText: "确认执行", cancelButtonText: "取消", type: "warning" }
    );
  } catch {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交计算任务...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/waybill/calculate", null, {
      params: { billMonth: flowMonth.value },
    });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "计算任务已提交，正在异步执行");
      fetchFlowDetail();
    } else {
      ElMessage.error(res.data.message || "计算失败");
    }
  } catch (err) {
    console.error("计算失败", err);
    ElMessage.error(err?.response?.data?.message || "计算失败，请稍后重试");
  } finally {
    loading.close();
  }
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
  if (!query.billMonth) {
    ElMessage.warning("请先选择账单月份");
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: "正在提交计算任务...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    const res = await axios.post("/api/waybill/calculate", null, {
      params: { billMonth: query.billMonth },
    });
    if (res.data.code === 200) {
      ElMessage.success(res.data.message || "计算任务已提交，正在异步执行");
    } else {
      ElMessage.error(res.data.message || "计算失败");
    }
  } catch (err) {
    console.error("计算失败", err);
    ElMessage.error(err?.response?.data?.message || "计算失败，请稍后重试");
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
    text: "正在提交导出任务...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  try {
    // 异步导出：提交任务后由后台生成文件，到下载管理页面下载
    const res = await axios.post("/api/monthlyBill/exportDetail/async", null, {
      params: { billMonth: query.billMonth },
    });
    if (res.data.code === 200) {
      ElMessage.success("导出任务已提交，文件生成完成后请到【下载管理】页面下载");
    } else {
      ElMessage.error(res.data.message || "导出任务提交失败");
    }
  } catch (err) {
    console.error("明细导出任务提交失败", err);
    ElMessage.error(err?.response?.data?.message || "导出任务提交失败，请稍后重试");
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

/* 校验结果弹窗需要盖在流程图弹窗之上（DOM顺序在流程图之前） */
.validate-overlay {
  z-index: 2100;
}

/* ==================== 账单工作流流程图 ==================== */
.flow-modal {
  max-width: 1200px;
  width: 92%;

  @media (min-width: 1400px) {
    max-width: 1400px;
  }
}

.flow-body {
  padding: 16px 20px 20px;
  max-height: 72vh;
  overflow-y: auto;
}

.flow-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.flow-month-select {
  width: 200px;
}

.flow-current-tip {
  font-size: 13px;
  color: #1890ff;
  font-weight: 500;
}

.flow-empty {
  text-align: center;
  color: #999;
  padding: 60px 0;
  font-size: 14px;
}

/* 横向流水线 */
.flow-pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 8px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 18px;
}

.flow-node {
  flex: 1;
  max-width: 180px;
  background: #fff;
  border: 2px solid #dcdfe6;
  border-radius: 10px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.flow-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 当前进行中的步骤：高亮描边 */
.flow-node.current {
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.15);
}

/* 点击选中的节点 */
.flow-node.active {
  outline: 2px solid #69c0ff;
  outline-offset: 2px;
}

.flow-node-order {
  width: 22px;
  height: 22px;
  line-height: 22px;
  border-radius: 50%;
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  font-weight: 600;
  margin: 0 auto 6px;
}

.flow-node-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.flow-node-status {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #909399;
}

/* 各状态配色 */
.flow-node.st-waiting .flow-node-status {
  background: #f4f4f5;
  color: #909399;
}

.flow-node.st-running .flow-node-status {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 600;
}

.flow-node.st-running .flow-node-order {
  background: #1890ff;
  color: #fff;
}

.flow-node.st-success .flow-node-status {
  background: #f0f9eb;
  color: #67c23a;
}

.flow-node.st-passed .flow-node-status {
  background: #e8f8f2;
  color: #13a862;
  font-weight: 600;
}

.flow-node.st-failed {
  border-color: #fbc4c4;
}

.flow-node.st-failed .flow-node-status {
  background: #fef0f0;
  color: #f56c6c;
  font-weight: 600;
}

.flow-node.st-failed .flow-node-order {
  background: #f56c6c;
  color: #fff;
}

.flow-node.st-skipped {
  border-style: dashed;
  opacity: 0.75;
}

.flow-node.st-skipped .flow-node-status {
  background: #f4f4f5;
  color: #909399;
}

/* 步骤间箭头 */
.flow-arrow {
  font-size: 22px;
  color: #dcdfe6;
  flex-shrink: 0;
}

.flow-arrow.done {
  color: #67c23a;
}

/* 节点详情区 */
.flow-detail {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 14px 16px;
}

.flow-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

/* 确认/跳过操作按钮 */
.flow-detail-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.flow-skip-btn {
  background: #909399;
}

.flow-detail-row {
  font-size: 13px;
  color: #555;
  line-height: 1.9;
}

.flow-detail-label {
  display: inline-block;
  width: 70px;
  color: #999;
  flex-shrink: 0;
}

.flow-detail-error {
  color: #f56c6c;
}

.flow-detail-error .flow-detail-label {
  color: #f56c6c;
}

/* 导入文件清单表 */
.flow-file-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6px;
}

.flow-file-table th {
  background: #fafafa;
  padding: 8px;
  border: 1px solid #ebeef5;
  font-size: 12px;
  font-weight: 600;
}

.flow-file-table td {
  padding: 8px;
  border: 1px solid #ebeef5;
  font-size: 12px;
  text-align: center;
}

.flow-file-name {
  max-width: 280px;
  word-break: break-all;
  text-align: left;
}

.flow-file-error {
  color: #f56c6c;
}
</style>
