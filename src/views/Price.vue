<template>
  <div class="price-management-page">
    <!-- 搜索区域：标签 + 标签 -->
    <div class="search-box">
      <div class="search-item">
        <label>客户名称：</label>
        <input
          v-model="queryParams.name"
          style="width: 180px"
          @keyup.enter="doSearch()"
        />
      </div>
      <div class="search-item">
        <label>客户编码：</label>
        <input
          v-model="queryParams.code"
          style="width: 180px"
          @keyup.enter="doSearch()"
        />
      </div>
      <button @click="doSearch()" class="search-btn">搜索</button>

      <!-- 👇 在这里加【新增】按钮 -->
      <button @click="openAddCustomerModal" class="add-btn" v-if="hasBtnPermission('settlement:price:addCustomer', '新增客户', '新增')">新增</button>

      <!-- 👇 批量删除 -->
      <button @click="handleBatchDelete" class="delete-btn" v-if="hasBtnPermission('批量删除', '删除')">批量删除</button>

      <!-- 👇 导出所有客户价格表 -->
      <button @click="doExportAllPrice" class="search-btn" v-if="hasBtnPermission('settlement:price:exportAll', '导出')">导出</button>

      <!-- 👇 批量修改价格 -->
      <button @click="openBatchAdjustModal" class="search-btn" v-if="hasBtnPermission('settlement:price:batchAdjust', '批量修改价格')">批量修改价格</button>
    </div>

    <table>
      <thead>
        <tr>
          <!-- 👇 全选框 -->
          <th width="50">
            <input type="checkbox" v-model="allChecked" @change="checkAll" />
          </th>
          <th>客户名称</th>
          <th>客户编码</th>
          <th>海南三区</th>
          <th>四区加收占比</th>
          <th>加收模式</th>
          <th>四区加收金额</th>
          <th>计算模式</th>
          <th>修改时间</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in tableData"
          :key="item.id"
          class="price-row"
          @click="openDetail(item)"
        >
          <!-- 👇 单选框 -->
          <td>
            <input
              type="checkbox"
              :value="item.id"
              v-model="checkedIds"
              @click.stop=""
            />
          </td>
          <td>{{ item.custName }}</td>
          <td>{{ item.code }}</td>
          <td>{{ item.threeFlag ? "是" : "否" }}</td>
          <td>{{ item.fourRate }}%</td>
          <td>{{ item.fourModel === "all" ? "全部加收" : "超出部分加收" }}</td>
          <td>{{ item.fourFee }} 元</td>
          <td>{{ item.type || "-" }}</td>
          <td>{{ item.startTime || "-" }}</td>

          <!-- 备注：固定宽度 + 超出省略 + 悬浮显示全部 -->
          <td class="remark-ellipsis" 
              @mouseenter="showTooltip($event, item.remark)"
              @mouseleave="hideTooltip">
            <span class="remark-text">{{ item.remark || "-" }}</span>
            <div v-if="tooltipVisible && currentRemark === item.remark" 
                 class="custom-tooltip"
                 :style="tooltipStyle">
              <div class="tooltip-content">{{ item.remark }}</div>
              <div class="tooltip-arrow"></div>
            </div>
          </td>

          <td>
            <button class="edit-btn" @click.stop="toEdit(item)" v-if="hasBtnPermission('settlement:price:editCustomer', '编辑客户', '编辑', '修改')">编辑</button>

            <!-- 👇 新增：新增价格按钮 -->
            <button class="add-price-btn" @click.stop="openAddPriceModal(item)" v-if="hasBtnPermission('新增价格', '新增')">
              新增价格
            </button>
            <button
              class="del-price-btn"
              @click.stop="openDeletePriceModal(item)"
              v-if="hasBtnPermission('删除价格', '删除')"
            >
              删除价格
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <Pagination
      v-model:current-page="queryParams.pageNo"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      @change="handlePageChange"
    />

    <!-- 价格详情弹窗 -->
    <div class="modal" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ currentCustomerName }} - 价格详情</h3>
          <span class="close-btn" @click="closeModal">×</span>
        </div>

        <!-- 循环：每一个时间段 = 一张独立表格 -->
        <div
          v-for="(group, idx) in priceGroupList"
          :key="idx"
          class="table-group"
        >
          <table>
            <thead>
              <tr style="position: relative">
                <th width="80">开始日期</th>
                <th width="80">结束日期</th>
                <th width="70">预付款</th>
                <th width="60">区域</th>
                <th width="60" v-for="w in group.weightHeaders" :key="w">{{ w }}</th>
                <th width="70">首重价格</th>
                <th width="70">续重价格</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in group.items" :key="i">
                <td>{{ item.startTime }}</td>
                <td>{{ item.endTime }}</td>
                <td>{{ item.prepayment }}</td>
                <td>{{ item.area }}</td>
                <td v-for="w in group.weightHeaders" :key="w">
                  {{ item.prices[w] || "-" }}
                </td>
                <td>{{ item.firstFee }}</td>
                <td>{{ item.overFee }}</td>
              </tr>
              <!-- 备注行 -->
              <tr v-if="group.remark" class="remark-row">
                <td :colspan="totalColumns">
                  <img src="/logo.jpg" class="remark-logo" alt="logo" />
                  <strong>备注：</strong>{{ group.remark }}
                </td>
              </tr>
              <!-- 👇 新增：区域备注（你要的一区/二区/三区...） -->
              <tr v-if="areaRemarkList.length > 0" class="area-remark-row">
                <td :colspan="totalColumns" class="area-remark-td">
                  <span
                    v-for="area in areaRemarkList"
                    :key="area.areaNum"
                    class="area-item"
                  >
                    {{
                      area.areaNum === 1
                        ? "一区"
                        : area.areaNum === 2
                          ? "二区"
                          : area.areaNum === 3
                            ? "三区"
                            : area.areaNum === 4
                              ? "四区"
                              : area.areaNum === 5
                                ? "五区"
                                : "其他"
                    }}：
                    {{ area.areaCity }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="blank-row" v-if="idx < priceGroupList.length - 1"></div>
        </div>
      </div>
    </div>

    <!-- 删除价格弹窗 -->
    <div
      v-if="deletePriceVisible"
      class="modal"
      @click.self="closeDeletePriceModal"
    >
      <div class="modal-content" style="max-width: 700px">
        <div class="modal-header">
          <h3>删除价格信息</h3>
          <span class="close-btn" @click="closeDeletePriceModal">×</span>
        </div>

        <table style="margin-top: 0">
          <thead>
            <tr>
              <th>客户名称</th>
              <th>客户编码</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in deletePriceList"
              :key="item.startTime + item.endTime"
            >
              <td>{{ item.kName }}</td>
              <td>{{ item.code }}</td>
              <td>{{ item.startTime }}</td>
              <td>{{ item.endTime }}</td>
              <td>
                <button class="del-single-btn" @click="handleDeletePrice(item)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 👇 ==================== 编辑客户弹窗 ==================== -->
    <div class="modal" v-if="editVisible" @click.self="closeEditModal">
      <div class="modal-content" style="max-width: 900px">
        <div class="modal-header">
          <h3>编辑客户信息</h3>
          <span class="close-btn" @click="closeEditModal">×</span>
        </div>

        <div class="edit-grid-form">
          <div class="form-item">
            <label>客户名称：</label>
            <input v-model="editForm.kname" />
          </div>
          <div class="form-item">
            <label>客户编码：</label>
            <input v-model="editForm.kcode" />
          </div>
          <div class="form-item">
            <label>海南三区：</label>
            <select v-model="editForm.threeFlag">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
          </div>
          <div class="form-item">
            <label>四区加收占比：</label>
            <input v-model.number="editForm.fourRate" type="number" />
          </div>
          <div class="form-item">
            <label>加收模式：</label>
            <select v-model="editForm.fourModel">
              <option value="all">全部加收</option>
              <option value="part">超出部分加收</option>
            </select>
          </div>
          <div class="form-item">
            <label>四区加收金额：</label>
            <input v-model.number="editForm.fourFee" type="number" />
          </div>
          <div class="form-item">
            <label>计算模式：</label>
            <input v-model="editForm.type" />
          </div>

          <div class="form-item">
            <label>北京 加收：</label>
            <input
              v-model.number="editExtra.beijing"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>上海 加收：</label>
            <input
              v-model.number="editExtra.shanghai"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>深圳 加收：</label>
            <input
              v-model.number="editExtra.shenzhen"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>舟山 加收：</label>
            <input
              v-model.number="editExtra.zhoushan"
              type="number"
              placeholder="元"
            />
          </div>

          <div class="form-item form-remark">
            <label>备注：</label>
            <textarea v-model="editForm.remark" rows="3"></textarea>
          </div>
        </div>

        <div style="text-align: center; margin-top: 28px">
          <button
            @click="closeEditModal"
            style="
              margin-right: 12px;
              padding: 8px 24px;
              border: 1px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
            "
          >
            取消
          </button>
          <button
            @click="submitEditCustomer"
            class="search-btn"
            style="padding: 8px 28px"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 👇 ==================== 新增客户弹窗 ==================== -->
    <div
      class="modal"
      v-if="addCustomerVisible"
      @click.self="closeAddCustomerModal"
    >
      <div class="modal-content" style="max-width: 900px">
        <div class="modal-header">
          <h3>新增客户</h3>
          <span class="close-btn" @click="closeAddCustomerModal">×</span>
        </div>

        <div class="edit-grid-form">
          <div class="form-item">
            <label>客户名称：</label>
            <input v-model="addCustomerForm.kname" />
          </div>
          <div class="form-item">
            <label>客户编码：</label>
            <input v-model="addCustomerForm.kcode" />
          </div>
          <div class="form-item">
            <label>海南三区：</label>
            <select v-model="addCustomerForm.threeFlag">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
          </div>
          <div class="form-item">
            <label>四区加收占比：</label>
            <input v-model.number="addCustomerForm.fourRate" type="number" />
          </div>
          <div class="form-item">
            <label>加收模式：</label>
            <select v-model="addCustomerForm.fourModel">
              <option value="all">全部加收</option>
              <option value="part">超出部分加收</option>
            </select>
          </div>
          <div class="form-item">
            <label>四区加收金额：</label>
            <input v-model.number="addCustomerForm.fourFee" type="number" />
          </div>
          <div class="form-item">
            <label>计算模式：</label>
            <input v-model="addCustomerForm.type" />
          </div>

          <div class="form-item">
            <label>北京 加收：</label>
            <input
              v-model.number="addCustomerExtra.beijing"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>上海 加收：</label>
            <input
              v-model.number="addCustomerExtra.shanghai"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>深圳 加收：</label>
            <input
              v-model.number="addCustomerExtra.shenzhen"
              type="number"
              placeholder="元"
            />
          </div>
          <div class="form-item">
            <label>舟山 加收：</label>
            <input
              v-model.number="addCustomerExtra.zhoushan"
              type="number"
              placeholder="元"
            />
          </div>

          <div class="form-item form-remark">
            <label>备注：</label>
            <textarea v-model="addCustomerForm.remark" rows="3"></textarea>
          </div>
        </div>

        <div style="text-align: center; margin-top: 28px">
          <button
            @click="closeAddCustomerModal"
            style="
              margin-right: 12px;
              padding: 8px 24px;
              border: 1px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
            "
          >
            取消
          </button>
          <button
            @click="submitAddCustomer"
            class="search-btn"
            style="padding: 8px 28px"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 👇 ==================== 新增价格弹窗 ==================== -->
    <div class="modal" v-if="addPriceVisible" @click.self="closeAddPriceModal">
      <div class="modal-content" style="max-width: 900px">
        <div class="modal-header">
          <h3>新增价格</h3>
          <span class="close-btn" @click="closeAddPriceModal">×</span>
        </div>

        <div class="add-form">
          <div class="form-item">
            <label>客户名称：</label>
            <input v-model="addForm.kname" disabled style="width: 160px" />
          </div>
          <div class="form-item">
            <label>客户编码：</label>
            <input v-model="addForm.kcode" disabled style="width: 160px" />
          </div>
          <div class="form-item">
            <label> <span class="red-star">*</span>预付款： </label>
            <input
              v-model.number="addForm.prepayment"
              type="number"
              style="width: 160px"
              placeholder="请输入数字"
              ref="prepaymentRef"
            />
          </div>
          <div class="form-item">
            <label> <span class="red-star">*</span>开始时间： </label>
            <input
              v-model="addForm.startTime"
              type="date"
              style="width: 160px"
              ref="startTimeRef"
            />
          </div>
        </div>

        <button @click="addWeightCol" class="add-col-btn">+ 添加重量列</button>

        <table
          border="1"
          cellpadding="6"
          cellspacing="0"
          style="width: 100%; margin-top: 10px; text-align: center"
        >
          <thead>
            <tr>
              <th>区域</th>
              <th v-for="(w, idx) in weightCols" :key="idx">
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                  "
                >
                  <input
                    v-model.number="w.val"
                    type="number"
                    style="width: 60px; text-align: center"
                  />
                  <span>kg</span>
                  <button
                    @click.stop="delWeightCol(idx)"
                    style="
                      margin-left: 4px;
                      padding: 2px 6px;
                      background: #ff4d4f;
                      color: #fff;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                    "
                  >
                    ×
                  </button>
                </div>
              </th>
              <th>首重价格</th>
              <th>续重价格</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in addTableRows" :key="idx">
              <td>{{ row.area }}</td>
              <td v-for="(c, cidx) in weightCols" :key="cidx">
                <input
                  v-model.number="row.values[cidx]"
                  type="number"
                  style="width: 80px; text-align: center"
                />
              </td>
              <td>
                <input
                  v-model.number="row.firstFee"
                  type="number"
                  style="width: 80px; text-align: center"
                />
              </td>
              <td>
                <input
                  v-model.number="row.overFee"
                  type="number"
                  style="width: 80px; text-align: center"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: center; margin-top: 15px">
          <button class="search-btn" @click="submitAddPrice">提交保存</button>
        </div>
      </div>
    </div>

    <!-- 👇 ==================== 批量修改价格弹窗 ==================== -->
    <div class="modal" v-if="batchAdjustVisible" @click.self="closeBatchAdjustModal">
      <div class="modal-content" style="max-width: 1300px">
        <div class="modal-header">
          <h3>批量修改价格</h3>
          <span class="close-btn" @click="closeBatchAdjustModal">×</span>
        </div>

        <div class="adjust-transfer">
          <!-- 左侧：候选客户（支持筛选、全选、批量勾选） -->
          <div class="adjust-panel left">
            <div class="adjust-panel-title">
              <label class="adjust-check-all">
                <input
                  type="checkbox"
                  :checked="isAllLeftChecked"
                  :indeterminate="isLeftIndeterminate"
                  @change="toggleLeftAll"
                />
                全选
              </label>
              <span class="adjust-count">{{ filteredCandidates.length }}</span>
            </div>
            <input
              v-model="batchAdjustSearchName"
              class="adjust-search"
              placeholder="输入客户名称筛选"
            />
            <div class="adjust-list">
              <label v-for="c in filteredCandidates" :key="c.customerCode" class="adjust-item">
                <input
                  type="checkbox"
                  :checked="leftChecked.includes(c.customerCode)"
                  @change="toggleLeftItem(c.customerCode)"
                />
                <span class="adjust-code">{{ c.customerCode }}</span>
                <span class="adjust-name">{{ c.customerName }}</span>
              </label>
              <div v-if="filteredCandidates.length === 0" class="adjust-empty">暂无可选客户</div>
            </div>
          </div>

          <!-- 中间：批量移动箭头 -->
          <div class="adjust-middle">
            <button class="search-btn adjust-arrow" :disabled="leftChecked.length === 0" @click="moveToRight">
              添加 &gt;
            </button>
            <button class="delete-btn adjust-arrow" :disabled="rightChecked.length === 0" @click="moveToLeft">
              &lt; 移除
            </button>
          </div>

          <!-- 右侧：已选客户调价明细 -->
          <div class="adjust-panel right">
            <div class="adjust-panel-title">
              <span>已选客户</span>
              <label class="adjust-check-all">
                <input
                  type="checkbox"
                  :checked="isAllRightChecked"
                  :indeterminate="isRightIndeterminate"
                  @change="toggleRightAll"
                />
                全选
              </label>
              <span class="adjust-count">{{ batchAdjustRows.length }}</span>
            </div>
            <!-- 统一设置行：填写后自动同步到下方所有客户，行内仍可单独修改 -->
            <div class="adjust-preset">
              <label>预付款修改金额
                <input v-model.number="batchPreset.prepayDelta" type="number" step="0.01" placeholder="正涨负降" class="adjust-input" style="width: 92px" @change="syncPreset('prepayDelta')" />
              </label>
              <label>修改金额
                <input v-model.number="batchPreset.priceDelta" type="number" step="0.01" placeholder="正涨负降" class="adjust-input" style="width: 86px" @change="syncPreset('priceDelta')" />
              </label>
              <label>开始时间
                <el-date-picker v-model="batchPreset.startTime" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 130px" :clearable="false" @change="syncPreset('startTime')" />
              </label>
              <label>五区修改
                <el-switch v-model="batchPreset.fiveAreaFlag" @change="syncPreset('fiveAreaFlag')" />
              </label>
            </div>
            <div class="adjust-list">
              <table class="adjust-table" v-if="batchAdjustRows.length > 0">
                <thead>
                  <tr>
                    <th style="width: 32px"></th>
                    <th style="width: 76px">客户编码</th>
                    <th>客户名称</th>
                    <th style="width: 112px">预付款修改金额</th>
                    <th style="width: 96px">修改金额</th>
                    <th style="width: 142px">开始时间</th>
                    <th style="width: 64px">五区修改</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in batchAdjustRows" :key="row.customerCode">
                    <td style="text-align: center">
                      <input
                        type="checkbox"
                        :checked="rightChecked.includes(row.customerCode)"
                        @change="toggleRightItem(row.customerCode)"
                      />
                    </td>
                    <td class="cell-center">{{ row.customerCode }}</td>
                    <td class="adjust-name-cell" :title="row.customerName">{{ row.customerName }}</td>
                    <td class="cell-center">
                      <input v-model.number="row.prepayDelta" type="number" step="0.01" placeholder="正涨负降" class="adjust-input" style="width: 96px" />
                    </td>
                    <td class="cell-center">
                      <input v-model.number="row.priceDelta" type="number" step="0.01" placeholder="正涨负降" class="adjust-input" style="width: 84px" />
                    </td>
                    <td class="cell-center">
                      <el-date-picker v-model="row.startTime" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 130px" :clearable="false" />
                    </td>
                    <td style="text-align: center">
                      <el-switch v-model="row.fiveAreaFlag" />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="batchAdjustRows.length === 0" class="adjust-empty">请从左侧添加要调价的客户</div>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px">
          <button
            @click="closeBatchAdjustModal"
            style="margin-right: 12px; padding: 8px 24px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer"
          >
            取消
          </button>
          <button class="search-btn" style="padding: 8px 28px" @click="submitBatchAdjust">提交调价</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'Price'
})

import { ref, reactive, onMounted, onUnmounted, computed, inject, watch } from "vue";
import axios from "axios";
import Pagination from "@/components/Pagination.vue";
import { hasBtnPermission } from "@/utils/auth";

const saveTabState = inject('saveTabState');
const getTabState = inject('getTabState');
const updateTabState = inject('updateTabState');

const currentPath = '/settlement/price';

// 区域备注（你后端新加的字段）
const areaRemarkList = ref([]);
const prepaymentRef = ref(null);
const startTimeRef = ref(null);

// 查询参数 —— 已改成 name + code
const queryParams = reactive({
  name: "",
  code: "",
  pageNo: 1,
  pageSize: 10,
});

const total = ref(0);
const pages = ref(0);
const tableData = ref([]);

// 批量选择
const checkedIds = ref([]);
const allChecked = ref(false);

// Tooltip 相关
const tooltipVisible = ref(false);
const currentRemark = ref("");
const tooltipStyle = ref({
  top: "0px",
  left: "0px"
});

function showTooltip(event, remark) {
  if (!remark) return;
  currentRemark.value = remark;
  
  const rect = event.target.getBoundingClientRect();
  tooltipStyle.value = {
    top: (rect.bottom + 8) + "px",
    left: rect.left + "px"
  };
  tooltipVisible.value = true;
}

function hideTooltip() {
  tooltipVisible.value = false;
  currentRemark.value = "";
}

// 全选
function checkAll() {
  if (allChecked.value) {
    checkedIds.value = tableData.value.map((item) => item.id);
  } else {
    checkedIds.value = [];
  }
}

import { getCurrentInstance } from "vue";
const { proxy } = getCurrentInstance();

// 批量删除
async function handleBatchDelete() {
  if (checkedIds.value.length === 0) {
    proxy.$msg("请选择要删除的数据");
    return;
  }

  const ok = await proxy.$confirm(
    `确定要删除选中的 ${checkedIds.value.length} 条数据吗？`,
  );
  if (!ok) return;

  try {
    const res = await axios.post("/api/customer/batchDelete", checkedIds.value);
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "删除失败");
      return;
    }
    proxy.$msg("删除成功");
    checkedIds.value = [];
    allChecked.value = false;
    getList();
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.message || e.message || "删除失败";
    proxy.$msg(msg);
  }
}

// 导出所有客户价格表（每个客户一个sheet页）
async function doExportAllPrice() {
  try {
    const response = await axios.get("/api/customer/exportAllPrice", {
      responseType: "blob",
    });

    // blob 里夹 JSON 说明后端业务异常
    if (response.data.type === "application/json") {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(response.data);
      });
      const errorData = JSON.parse(text);
      proxy.$msg(errorData.message || "导出失败");
      return;
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    // 优先使用后端 Content-Disposition 里的文件名（带时间戳），取不到再用默认值
    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const fileName = match ? decodeURIComponent(match[1]) : "所有客户价格表.xlsx";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    proxy.$msg("导出成功");
  } catch (e) {
    console.error("导出失败", e);
    proxy.$msg(e?.message || "导出失败，请稍后重试");
  }
}

// ==================== 批量修改价格 ====================
const batchAdjustVisible = ref(false);
const batchAdjustSearchName = ref("");
const batchAdjustCandidates = ref([]);
const batchAdjustRows = ref([]);
const leftChecked = ref([]); // 左侧勾选的客户编码
const rightChecked = ref([]); // 右侧勾选的客户编码
// 统一设置行：填写后同步到右侧所有客户
const batchPreset = reactive({
  prepayDelta: null,
  priceDelta: null,
  startTime: null,
  fiveAreaFlag: false,
});

function tomorrowStr() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function openBatchAdjustModal() {
  batchAdjustVisible.value = true;
  batchAdjustSearchName.value = "";
  batchAdjustRows.value = [];
  leftChecked.value = [];
  rightChecked.value = [];
  batchPreset.prepayDelta = null;
  batchPreset.priceDelta = null;
  batchPreset.startTime = null;
  batchPreset.fiveAreaFlag = false;
  searchAdjustCustomers();
}

function closeBatchAdjustModal() {
  batchAdjustVisible.value = false;
  batchAdjustCandidates.value = [];
  batchAdjustRows.value = [];
  leftChecked.value = [];
  rightChecked.value = [];
}

// 查询有当前生效价格的客户（名称模糊匹配）
async function searchAdjustCustomers() {
  try {
    const res = await axios.get("/api/customer/listWithPrice", {
      params: { name: batchAdjustSearchName.value || undefined },
    });
    if (res.data.code === 200) {
      batchAdjustCandidates.value = res.data.data || [];
    } else {
      proxy.$msg(res.data.message || "查询客户列表失败");
    }
  } catch (e) {
    console.error("查询客户列表失败", e);
    // 业务异常信息由 axios 拦截器统一弹出
  }
}

// 左侧候选列表：排除已在右侧的客户，再按名称/编码筛选
const filteredCandidates = computed(() => {
  const kw = batchAdjustSearchName.value.trim();
  const inRows = new Set(batchAdjustRows.value.map((r) => r.customerCode));
  return batchAdjustCandidates.value.filter((c) => {
    if (inRows.has(c.customerCode)) return false;
    if (!kw) return true;
    return (c.customerName || "").includes(kw) || (c.customerCode || "").includes(kw);
  });
});

const isAllLeftChecked = computed(
  () =>
    filteredCandidates.value.length > 0 &&
    filteredCandidates.value.every((c) => leftChecked.value.includes(c.customerCode))
);
const isLeftIndeterminate = computed(
  () => leftChecked.value.length > 0 && !isAllLeftChecked.value
);

function toggleLeftAll(e) {
  leftChecked.value = e.target.checked
    ? filteredCandidates.value.map((c) => c.customerCode)
    : [];
}
function toggleLeftItem(code) {
  const i = leftChecked.value.indexOf(code);
  if (i > -1) leftChecked.value.splice(i, 1);
  else leftChecked.value.push(code);
}
function toggleRightItem(code) {
  const i = rightChecked.value.indexOf(code);
  if (i > -1) rightChecked.value.splice(i, 1);
  else rightChecked.value.push(code);
}

const isAllRightChecked = computed(
  () =>
    batchAdjustRows.value.length > 0 &&
    batchAdjustRows.value.every((r) => rightChecked.value.includes(r.customerCode))
);
const isRightIndeterminate = computed(
  () => rightChecked.value.length > 0 && !isAllRightChecked.value
);
function toggleRightAll(e) {
  rightChecked.value = e.target.checked
    ? batchAdjustRows.value.map((r) => r.customerCode)
    : [];
}

// 统一设置行某字段变化 → 同步到右侧所有客户（未填的字段不同步，避免覆盖）
function syncPreset(field) {
  const v = batchPreset[field];
  if (v === null || v === undefined || v === "") return;
  batchAdjustRows.value.forEach((r) => {
    r[field] = v;
  });
}

// 批量添加到右侧（默认开始时间=明天，五区=否；统一设置行已填的字段直接继承）
function moveToRight() {
  const selected = filteredCandidates.value.filter((c) =>
    leftChecked.value.includes(c.customerCode)
  );
  selected.forEach((c) => {
    batchAdjustRows.value.push({
      customerCode: c.customerCode,
      customerName: c.customerName,
      prepayDelta: batchPreset.prepayDelta ?? null,
      priceDelta: batchPreset.priceDelta ?? null,
      startTime: batchPreset.startTime || tomorrowStr(),
      fiveAreaFlag: batchPreset.fiveAreaFlag,
    });
  });
  leftChecked.value = [];
}

// 批量从右侧移除（回到左侧候选）
function moveToLeft() {
  const set = new Set(rightChecked.value);
  batchAdjustRows.value = batchAdjustRows.value.filter(
    (r) => !set.has(r.customerCode)
  );
  rightChecked.value = [];
}

async function submitBatchAdjust() {
  const rows = batchAdjustRows.value;
  if (rows.length === 0) {
    proxy.$msg("请先添加要调价的客户");
    return;
  }
  for (const r of rows) {
    if (!r.startTime) {
      proxy.$msg(`客户「${r.customerName}」未选择开始时间`);
      return;
    }
    const hasPrice = r.priceDelta !== null && r.priceDelta !== undefined && r.priceDelta !== "";
    const hasPrepay = r.prepayDelta !== null && r.prepayDelta !== undefined && r.prepayDelta !== "";
    if (!hasPrice && !hasPrepay) {
      proxy.$msg(`客户「${r.customerName}」至少填写一个调整金额`);
      return;
    }
  }

  const ok = await proxy.$confirm(
    `确定对 ${rows.length} 个客户执行批量调价吗？该操作为整体事务，任一客户失败将全部回滚。`
  );
  if (!ok) return;

  try {
    const res = await axios.post(
      "/api/customer/batchAdjustPrice",
      rows.map((r) => ({
        code: r.customerCode,
        startTime: r.startTime,
        priceDelta: r.priceDelta === "" ? null : r.priceDelta,
        prepayDelta: r.prepayDelta === "" ? null : r.prepayDelta,
        fiveAreaFlag: r.fiveAreaFlag,
      }))
    );
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "批量调价失败");
      return;
    }
    proxy.$msg("批量调价成功");
    closeBatchAdjustModal();
    getList();
  } catch (e) {
    console.error("批量调价失败", e);
    // 业务异常信息由 axios 拦截器统一弹出
  }
}

// 弹窗
const showModal = ref(false);
const currentCustomerName = ref("");
const priceGroupList = ref([]);

// 计算总列数
const totalColumns = computed(() => {
  if (priceGroupList.value.length === 0) return 7;
  const firstGroup = priceGroupList.value[0];
  return 7 + (firstGroup.weightHeaders ? firstGroup.weightHeaders.length : 0);
});

// 获取列表
function doSearch() {
  queryParams.pageNo = 1;
  getList();
}

async function getList() {
  try {
    const params = {
      name: queryParams.name,
      code: queryParams.code,
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize,
    };
    const res = await axios.post("/api/customer/search", params);
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "查询失败");
      return;
    }
    const data = res.data.data;
    tableData.value = data.records;
    total.value = data.total;
    pages.value = data.pages;
  } catch (e) {
    console.error("请求失败", e);
    const msg = e?.response?.data?.message || e.message || "查询失败";
    proxy.$msg(msg);
  }
}

// 切换分页
function handlePageChange({ pageNo, pageSize }) {
  queryParams.pageNo = pageNo;
  queryParams.pageSize = pageSize;
  getList();
}

// 打开详情
async function openDetail(row) {
  try {
    const res = await axios.get("/api/customer/price", {
      params: { kCode: row.code },
    });
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "获取价格详情失败");
      return;
    }

    const data = res.data.data || {};
    const priceList = data.priceList || data || [];

    // =======================
    areaRemarkList.value = priceList[0]?.areas || [];
    // =======================

    const groupResult = [];
    for (const parent of priceList) {
      const { startTime, endTime, prepayment, detail, remark } = parent;
      const detailList = detail || [];
      const weightSet = new Set();
      const items = [];
      for (const d of detailList) {
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
        weightHeaders: Array.from(weightSet).sort((a, b) => {
          return parseFloat(a) - parseFloat(b);
        }),
        items,
        remark: remark || "",
      });
    }
    priceGroupList.value = groupResult;
    currentCustomerName.value = row.custName;
    showModal.value = true;
  } catch (e) {
    console.error("获取价格详情失败", e);
    const msg = e?.response?.data?.message || e.message || "获取价格详情失败";
    proxy.$msg(msg);
  }
}

// 关闭详情弹窗
function closeModal() {
  showModal.value = false;
}

// ESC关闭
function onKeyDown(e) {
  if (e.key === "Escape" && showModal.value) closeModal();
}

watch(queryParams, (newVal) => {
  if (saveTabState) {
    saveTabState(currentPath, {
      name: newVal.name,
      code: newVal.code,
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
      queryParams.pageNo = savedState.pageNo || 1;
      queryParams.pageSize = savedState.pageSize || 10;
    }
  }
  getList();
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});

// ==============================================
// 删除价格 弹窗
// ==============================================
const deletePriceVisible = ref(false);
const deletePriceList = ref([]);
const currentCode = ref("");

async function openDeletePriceModal(item) {
  currentCode.value = item.code;
  try {
    const res = await axios.get("/api/customer/price", {
      params: { kCode: item.code },
    });
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "获取价格失败");
      return;
    }
    const arr = [];
    for (let p of res.data.data || []) {
      arr.push({
        kName: item.custName,
        code: item.code,
        startTime: p.startTime,
        endTime: p.endTime,
      });
    }
    deletePriceList.value = arr;
    deletePriceVisible.value = true;
  } catch (e) {
    const msg = e?.response?.data?.message || e.message || "获取价格失败";
    proxy.$msg(msg);
  }
}

function closeDeletePriceModal() {
  deletePriceVisible.value = false;
  deletePriceList.value = [];
}

async function handleDeletePrice(row) {
  const ok = await proxy.$confirm("确定要删除该条价格吗？");
  if (!ok) return;

  try {
    const res = await axios.post("/api/customer/deletePrice", {
      code: row.code,
      startTime: row.startTime,
      endTime: row.endTime,
    });
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "删除失败");
      return;
    }
    proxy.$msg("删除成功");
    openDeletePriceModal({ code: currentCode.value, custName: row.kName });
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.message || e.message || "删除失败";
    proxy.$msg(msg);
  }
}

// ==============================================
// 👇 ==================== 新增价格功能 ====================
// ==============================================
const addPriceVisible = ref(false);
const addForm = reactive({
  kname: "",
  kcode: "",
  prepayment: "",
  startTime: "",
});

// 动态重量列
const weightCols = ref([]);
function addWeightCol() {
  weightCols.value.push({ val: "" });
}

// 删除动态重量列
function delWeightCol(index) {
  weightCols.value.splice(index, 1);
  addTableRows.value.forEach((row) => {
    row.values.splice(index, 1);
  });
}

// 固定5行区域
const addTableRows = ref([
  { area: "一区", values: [], firstFee: "", overFee: "" },
  { area: "二区", values: [], firstFee: "", overFee: "" },
  { area: "三区", values: [], firstFee: "", overFee: "" },
  { area: "四区", values: [], firstFee: "", overFee: "" },
  { area: "五区", values: [], firstFee: "", overFee: "" },
]);

// 打开新增价格弹窗
async function openAddPriceModal(item) {
  addForm.kname = item.custName;
  addForm.kcode = item.code;
  addForm.prepayment = "";
  addForm.startTime = "";
  weightCols.value = [];

  addTableRows.value = [
    { area: "一区", values: [], firstFee: "", overFee: "" },
    { area: "二区", values: [], firstFee: "", overFee: "" },
    { area: "三区", values: [], firstFee: "", overFee: "" },
    { area: "四区", values: [], firstFee: "", overFee: "" },
    { area: "五区", values: [], firstFee: "", overFee: "" },
  ];

  try {
    const res = await axios.get("/api/customer/price", {
      params: { kCode: item.code },
    });
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "获取历史价格失败");
      return;
    }

    const dataList = res.data.data || [];
    if (dataList.length > 0) {
      const firstGroup = dataList[0];
      const detailList = firstGroup.detail || [];

      addTableRows.value.forEach((row) => {
        const target = detailList.find((item) => item.area === row.area);
        if (target) {
          row.overFee = target.overFee;
        }
      });
    }
  } catch (e) {
    console.log("未查询到历史价格，直接打开新增弹窗", e);
  }

  addPriceVisible.value = true;
}

// 关闭
function closeAddPriceModal() {
  addPriceVisible.value = false;
}

// 提交
async function submitAddPrice() {
  let valid = true;

  if (!addForm.prepayment && addForm.prepayment !== 0) {
    valid = false;
    shakeAndRed(prepaymentRef.value);
  } else {
    clearError(prepaymentRef.value);
  }

  if (!addForm.startTime) {
    valid = false;
    shakeAndRed(startTimeRef.value);
  } else {
    clearError(startTimeRef.value);
  }

  if (!valid) {
    return;
  }

  try {
    let reqList = [];
    for (let row of addTableRows.value) {
      let fixedList = weightCols.value
        .map((item, idx) => ({
          weight: item.val || 0,
          fee: row.values[idx] || 0,
        }))
        // ✅ 过滤：只保留 fee > 0 的（0 和空都丢掉）
        .filter((item) => {
          const fee = item.fee;
          // 不等于 null、不等于undefined、不等于0、不等于空字符串
          return fee != null && fee !== 0 && fee !== "";
        });

      let price = {
        code: addForm.kcode,
        name: addForm.kname,
        startTime: addForm.startTime,
        prepayment: addForm.prepayment || 0,
        area: getAreaCode(row.area),
        firstFee: row.firstFee || 0,
        overFee: row.overFee || 0,
        fixedList: fixedList, // 过滤后的干净数据
      };
      reqList.push(price);
    }

    const res = await axios.post("/api/customer/addPrice", reqList);
    if (res.data.code === 200) {
      proxy.$msg("保存成功");
      closeAddPriceModal();
    } else {
      proxy.$msg(res.data.message || "保存失败");
    }
  } catch (err) {
    console.error(err);
    const msg = err?.response?.data?.message || err.message || "保存失败";
    proxy.$msg(msg);
  }
}

// 抖动+红框
function shakeAndRed(el) {
  if (!el) return;
  el.style.border = "1px solid #ff4d4f";
  el.style.animation = "shake 0.4s";
  setTimeout(() => {
    el.style.animation = "";
  }, 400);
}

// 清除错误样式
function clearError(el) {
  if (!el) return;
  el.style.border = "1px solid #e0e3e9";
}

// 区域映射
function getAreaCode(text) {
  const map = {
    一区: 1,
    二区: 2,
    三区: 3,
    四区: 4,
    五区: 5,
  };
  return map[text] || 0;
}

// 禁止所有数字输入框滚轮改变数值
document.addEventListener(
  "wheel",
  function (e) {
    if (e.target.type === "number") {
      e.preventDefault();
    }
  },
  { passive: false },
);

// 全局禁用：所有数字输入框 滚轮 + 键盘上下箭头
const disableNumberInputs = () => {
  document.addEventListener(
    "wheel",
    (e) => {
      if (e.target?.type === "number") {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener("keydown", (e) => {
    if (e.target?.type === "number") {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      }
    }
  });
};

onMounted(() => {
  disableNumberInputs();
});

// ==============================================
// 👇 ==================== 编辑客户功能 ====================
// ==============================================
const editVisible = ref(false);
const editForm = reactive({
  id: "",
  kname: "",
  kcode: "",
  threeFlag: false,
  fourRate: 0,
  fourModel: "all",
  fourFee: 0,
  type: "",
  remark: "",
});

// 固定四个城市 extra
const editExtra = reactive({
  beijing: 0,
  shanghai: 0,
  shenzhen: 0,
  zhoushan: 0,
});

// 控制客户编码是否可编辑
const kcodeEditable = ref(false);
// 点击编辑按钮 → 打开弹窗 + 加载详情
async function toEdit(item) {
  try {
    const res = await axios.get("/api/customer/detail", {
      params: { code: item.code },
    });
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "加载客户详情失败");
      return;
    }
    const data = res.data.data;

    // ✨ 关键：打开弹窗时只判断一次！
    kcodeEditable.value = data.code === "临时客户";

    // 基础信息（包含 id）
    editForm.id = data.id;
    editForm.kname = data.custName;
    editForm.kcode = data.code;
    editForm.threeFlag = data.threeFlag;
    editForm.fourRate = data.fourRate;
    // ✅ 修复：后端 excess → 前端 part
    if (data.fourModel === "excess") {
      editForm.fourModel = "part";
    } else {
      editForm.fourModel = data.fourModel || "all";
    }
    editForm.fourFee = data.fourFee;
    editForm.type = data.type || "";
    editForm.remark = data.remark || "";

    // 初始化
    editExtra.beijing = 0;
    editExtra.shanghai = 0;
    editExtra.shenzhen = 0;
    editExtra.zhoushan = 0;

    // 后端返回 extra 自动匹配回填
    const extraList = data.extra || [];
    extraList.forEach((item) => {
      if (item.areaName === "北京") editExtra.beijing = item.fee;
      if (item.areaName === "上海") editExtra.shanghai = item.fee;
      if (item.areaName === "深圳") editExtra.shenzhen = item.fee;
      if (item.areaName === "舟山") editExtra.zhoushan = item.fee;
    });

    editVisible.value = true;
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.message || e.message || "加载客户详情失败";
    proxy.$msg(msg);
  }
}

// 关闭编辑弹窗
function closeEditModal() {
  editVisible.value = false;
}

// 保存编辑
async function submitEditCustomer() {
  const ok = await proxy.$confirm("确定保存修改吗？");
  if (!ok) return;

  try {
    // 1. 构建 extra（自动过滤 0 值）
    const extra = [];
    if (editExtra.beijing > 0)
      extra.push({ areaName: "北京", fee: editExtra.beijing });
    if (editExtra.shanghai > 0)
      extra.push({ areaName: "上海", fee: editExtra.shanghai });
    if (editExtra.shenzhen > 0)
      extra.push({ areaName: "深圳", fee: editExtra.shenzhen });
    if (editExtra.zhoushan > 0)
      extra.push({ areaName: "舟山", fee: editExtra.zhoushan });

    // 2. 构建最终提交参数
    const submitData = {
      id: editForm.id,
      code: editForm.kcode,
      custName: editForm.kname,
      threeFlag: editForm.threeFlag ? 1 : 0,
      fourRate: editForm.fourRate,
      fourModel: editForm.fourModel === "all" ? "all" : "excess",
      fourFee: editForm.fourFee,
      type: editForm.type || null,
      remark: editForm.remark || null,
      extra: extra,
    };

    // 3. 调用更新接口
    const res = await axios.post("/api/customer/update", submitData);
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "保存失败");
      return;
    }

    proxy.$msg("保存成功");
    closeEditModal();
    getList();
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.message || e.message || "保存失败";
    proxy.$msg(msg);
  }
}

// ==============================================
// 👇 ==================== 新增客户功能 ====================
// ==============================================
const addCustomerVisible = ref(false);

const addCustomerForm = reactive({
  id: null,
  kname: "",
  kcode: "",
  threeFlag: false,
  fourRate: 0,
  fourModel: "all",
  fourFee: 0,
  type: "",
  remark: "",
});

const addCustomerExtra = reactive({
  beijing: 0,
  shanghai: 0,
  shenzhen: 0,
  zhoushan: 0,
});

// 打开新增弹窗
function openAddCustomerModal() {
  // 清空
  addCustomerForm.id = null;
  addCustomerForm.kname = "";
  addCustomerForm.kcode = "";
  addCustomerForm.threeFlag = false;
  addCustomerForm.fourRate = 0;
  addCustomerForm.fourModel = "all";
  addCustomerForm.fourFee = 0;
  addCustomerForm.type = "";
  addCustomerForm.remark = "";

  addCustomerExtra.beijing = 0;
  addCustomerExtra.shanghai = 0;
  addCustomerExtra.shenzhen = 0;
  addCustomerExtra.zhoushan = 0;

  addCustomerVisible.value = true;
}

// 关闭新增弹窗
function closeAddCustomerModal() {
  addCustomerVisible.value = false;
}

// 提交新增客户
async function submitAddCustomer() {
  const ok = await proxy.$confirm("确定新增客户吗？");
  if (!ok) return;

  try {
    // 构建 extra（过滤0）
    const extra = [];
    if (addCustomerExtra.beijing > 0)
      extra.push({ areaName: "北京", fee: addCustomerExtra.beijing });
    if (addCustomerExtra.shanghai > 0)
      extra.push({ areaName: "上海", fee: addCustomerExtra.shanghai });
    if (addCustomerExtra.shenzhen > 0)
      extra.push({ areaName: "深圳", fee: addCustomerExtra.shenzhen });
    if (addCustomerExtra.zhoushan > 0)
      extra.push({ areaName: "舟山", fee: addCustomerExtra.zhoushan });

    // 组装参数
    const submitData = {
      id: null,
      code: addCustomerForm.kcode,
      custName: addCustomerForm.kname,
      threeFlag: addCustomerForm.threeFlag ? 1 : 0,
      fourRate: addCustomerForm.fourRate,
      fourModel: addCustomerForm.fourModel === "all" ? "all" : "excess",
      fourFee: addCustomerForm.fourFee,
      type: addCustomerForm.type || null,
      remark: addCustomerForm.remark || null,
      extra: extra,
    };

    const res = await axios.post("/api/customer/add", submitData);
    if (res.data.code !== 200) {
      proxy.$msg(res.data.message || "新增失败");
      return;
    }

    proxy.$msg("新增成功");
    closeAddCustomerModal();
    getList();
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.message || e.message || "新增失败";
    proxy.$msg(msg);
  }
}
</script>

<style scoped>
/* 搜索框样式 */
.search-box {
  margin: 8px 0 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    margin: 10px 0 20px;
    gap: 15px;
  }
}
.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-item label {
  font-weight: 500;
  font-size: 13px;
  color: #333;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}
.search-item input {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 5px 10px;
  outline: none;
  transition: all 0.2s;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 6px 10px;
    font-size: 14px;
  }
}
.search-item input:focus {
  border-color: #1890ff;
}

/* 去掉所有数字输入框的箭头 */
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 按钮 */
.search-btn,
.delete-btn,
.edit-btn,
.del-price-btn,
.add-price-btn,
.add-col-btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}
.search-btn:hover,
.add-price-btn:hover,
.add-col-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.delete-btn:hover,
.del-price-btn:hover,
.del-single-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.search-btn {
  padding: 6px 16px;
  background: #1890ff;
  color: #fff;

  @media (min-width: 1400px) {
    padding: 7px 18px;
  }
}
.delete-btn {
  padding: 6px 16px;
  background: #f56c6c;
  color: #fff;

  @media (min-width: 1400px) {
    padding: 7px 18px;
  }
}
.edit-btn {
  padding: 4px 8px;
  background: #1890ff;
  color: #fff;
  margin-right: 6px;

  @media (min-width: 1400px) {
    padding: 5px 10px;
  }
}
.add-price-btn {
  padding: 4px 8px;
  background: #00b42a;
  color: #fff;
  margin-right: 6px;

  @media (min-width: 1400px) {
    padding: 5px 10px;
  }
}
.del-price-btn {
  padding: 4px 8px;
  background: #ff7d00;
  color: #fff;

  @media (min-width: 1400px) {
    padding: 5px 10px;
  }
}
.add-col-btn {
  padding: 6px 12px;
  background: #1890ff;
  color: #fff;
  margin: 8px 0;

  @media (min-width: 1400px) {
    padding: 8px 14px;
    margin: 10px 0;
  }
}

/* 表格 */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);

  @media (min-width: 1400px) {
    margin-top: 10px;
  }
}
th {
  background: #f5f7fa;
  font-weight: 600;
  color: #333;
  padding: 8px 6px;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 12px 8px;
    font-size: 14px;
  }
}
td {
  padding: 8px 6px;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 12px 8px;
    font-size: 14px;
  }
}
.price-row {
  cursor: pointer;
  transition: background 0.2s;
}
.price-row:hover {
  background: #f5faff;
}

/* 备注列：固定宽度 + 超出省略 */
.remark-ellipsis {
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;

  @media (min-width: 1400px) {
    max-width: 120px;
  }
}

.remark-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 自定义 Tooltip 样式 */
.custom-tooltip {
  position: fixed;
  z-index: 10000;
  max-width: 350px;
  min-width: 130px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  backdrop-filter: blur(10px);
  animation: tooltipFadeIn 0.2s ease-out;

  @media (min-width: 1400px) {
    max-width: 400px;
    min-width: 150px;
    padding: 12px 16px;
  }
}

.tooltip-content {
  font-size: 13px;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}

.tooltip-arrow {
  position: absolute;
  top: -6px;
  left: 20px;
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: rotate(45deg);
  border-radius: 2px;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}



/* 弹窗遮罩 */
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

/* 弹窗内容 - 高级美化 */
.modal-content {
  background: #fff;
  padding: 20px;
  width: 98%;
  max-width: 1200px;
  max-height: 92vh;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: auto;
  position: relative;
  border: none;

  @media (min-width: 1400px) {
    padding: 28px;
    max-width: 1400px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  @media (min-width: 1400px) {
    margin-bottom: 24px;
  }
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #222;

  @media (min-width: 1400px) {
    font-size: 18px;
  }
}
.close-btn {
  font-size: 22px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  @media (min-width: 1400px) {
    font-size: 24px;
    width: 30px;
    height: 30px;
  }
}
.close-btn:hover {
  color: #fff;
  background: #ff4d4f;
}

/* 动态表格 */
.blank-row {
  height: 16px;

  @media (min-width: 1400px) {
    height: 20px;
  }
}
.table-group {
  margin-bottom: 8px;

  @media (min-width: 1400px) {
    margin-bottom: 10px;
  }
}
.table-group table {
  width: 100%;
  border-collapse: collapse;
}
.table-group table th,
.table-group table td {
  text-align: center;
  padding: 8px 6px;
  border: 1px solid #ebeef5;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 10px 8px;
    font-size: 14px;
  }
}
.table-group table th {
  background: #f5f7fa;
  font-weight: 600;
}
.table-group table tr:hover {
  background: #fafafa;
}

/* 备注行 */
.remark-row {
  background-color: #f9fafb;
}
.remark-row td {
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
.remark-row strong {
  color: #1890ff;
  margin-right: 8px;
}
.remark-logo {
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

/* 删除按钮 */
.del-single-btn {
  padding: 4px 8px;
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 5px 10px;
    font-size: 13px;
  }
}

/* 新增价格表单 */
.add-form {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  @media (min-width: 1400px) {
    gap: 24px;
    margin-bottom: 20px;
  }
}
.form-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-item label {
  font-weight: 500;
  color: #333;
  font-size: 13px;
  min-width: 68px;

  @media (min-width: 1400px) {
    font-size: 14px;
    min-width: 76px;
  }
}
.form-item input {
  border: 1px solid #e0e3e9;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  transition: all 0.2s;
  font-size: 13px;

  @media (min-width: 1400px) {
    padding: 10px 14px;
    font-size: 14px;
  }
}
.form-item input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}
.form-item input:disabled {
  background: #f7f8fa;
  color: #666;
}

/* 弹窗内表格输入框 */
table input {
  border: 1px solid #e0e3e9 !important;
  border-radius: 6px !important;
  padding: 5px 6px !important;
  outline: none;
  transition: border 0.2s;
  font-size: 12px;

  @media (min-width: 1400px) {
    padding: 6px 8px !important;
    font-size: 13px;
  }
}
table input:focus {
  border-color: #1890ff !important;
}
/* 红色必填星号 */
.red-star {
  color: #ff4d4f;
  margin-right: 2px;
}

/* 抖动动画 */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  50% {
    transform: translateX(6px);
  }
  75% {
    transform: translateX(-6px);
  }
}

/* 禁用数字输入框滚轮改变数值 */
input[type="number"] {
  pointer-events: auto !important;
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}
input[type="number"] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
}

/* 👇 关键：禁用滚轮事件 */
input[type="number"] {
  touch-action: manipulation;
}

/* 全局隐藏数字框箭头 + 禁用滚轮样式 */
input[type="number"] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

/* 编辑客户多列布局 —— 横向并排样式 */
.edit-grid-form {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 12px 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px 20px;
  }
}
.edit-grid-form .form-item {
  display: flex;
  align-items: center;
  gap: 8px;

  @media (min-width: 1400px) {
    gap: 10px;
  }
}
.edit-grid-form label {
  width: 110px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
  text-align: right;
  flex-shrink: 0;
}
.edit-grid-form input,
.edit-grid-form select,
.edit-grid-form textarea {
  flex: 1;
  border: 1px solid #e0e3e9;
  border-radius: 8px;
  padding: 10px 12px;
  outline: none;
  font-size: 14px;
}
.edit-grid-form input:focus,
.edit-grid-form select:focus,
.edit-grid-form textarea:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}
.form-remark {
  grid-column: 1 / -1;
}
.form-remark textarea {
  width: 100%;
}
.add-btn {
  padding: 7px 18px;
  background: #00b42a;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}
.add-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 区域备注行 */
.area-remark-row td {
  background: #f9f9f9;
  text-align: left !important;
  padding: 6px 12px;
  border-top: 1px dashed #eee;
}
.area-remark-td {
  font-size: 12px !important; /* 小字 */
  color: #666 !important;
  line-height: 1.5;
}
.area-item {
  display: block;
  margin-bottom: 2px;
}

/* ==================== 批量修改价格：左右穿梭结构 ==================== */
.adjust-transfer {
  display: flex;
  gap: 12px;
  align-items: stretch;
  margin-top: 4px;
}
.adjust-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.adjust-panel.left {
  width: 380px;
  flex-shrink: 0;
}
.adjust-panel.right {
  flex: 1;
  min-width: 0;
}
.adjust-panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  color: #303133;
}
.adjust-check-all {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.adjust-count {
  color: #909399;
  font-size: 12px;
}
.adjust-search {
  margin: 8px 10px;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.adjust-search:focus {
  border-color: #409eff;
}
/* 统一设置行 */
.adjust-preset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-bottom: 1px solid #d9ecff;
  font-size: 13px;
  color: #606266;
}
.adjust-preset label {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.adjust-list {
  flex: 1;
  overflow-y: auto;
  max-height: 460px;
}
.adjust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 13px;
  border-top: 1px solid #f7f7f7;
}
.adjust-item:first-child {
  border-top: none;
}
.adjust-item:hover {
  background: #f5f7fa;
}
.adjust-code {
  color: #909399;
  font-size: 12px;
  width: 88px;
  flex-shrink: 0;
}
.adjust-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.adjust-middle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
}
.adjust-arrow {
  padding: 6px 14px;
  white-space: nowrap;
}
.adjust-arrow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.adjust-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.adjust-table thead th {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
  padding: 8px 6px;
  border-bottom: 1px solid #ebeef5;
  position: sticky;
  top: 0;
  z-index: 1;
}
.adjust-table tbody td {
  padding: 6px 6px;
  border-bottom: 1px solid #f0f0f0;
}
.adjust-table tbody tr:hover {
  background: #f5f7fa;
}
.cell-center {
  text-align: center;
}
.adjust-name-cell {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.adjust-input {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.adjust-input:focus {
  border-color: #409eff;
}
.adjust-empty {
  padding: 30px 0;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
