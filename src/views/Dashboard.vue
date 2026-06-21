<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-left">
        <h1 class="title">天晨快递财务系统</h1>
        <p class="subtitle">每日量本利数据大屏</p>
      </div>
      <div class="header-right">
        <div class="date-display">
          <span class="date-label">当前日期：</span>
          <input type="date" v-model="currentDate" class="date-input" @change="handleDateChange" />
        </div>
        <button class="refresh-btn" @click="doRefresh">
          <span class="refresh-icon">↻</span>
          刷新数据
        </button>
      </div>
    </header>

    <div class="summary-cards">
      <div class="card card-primary">
        <div class="card-icon">📦</div>
        <div class="card-content">
          <span class="card-label">发货量（件）</span>
          <span class="card-value">{{ formatNumber(summary.totalCount) }}</span>
        </div>
        <div class="card-trend" v-if="summary.dayOnDayRatio">
          <span :class="isPositive(summary.dayOnDayRatio) ? 'trend-up' : 'trend-down'">
            {{ summary.dayOnDayRatio }}
          </span>
          <span class="trend-label">较昨日</span>
        </div>
      </div>

      <div class="card card-warning">
        <div class="card-icon">⚖️</div>
        <div class="card-content">
          <span class="card-label">平均重量（kg）</span>
          <span class="card-value">{{ summary.avgWeight }}</span>
        </div>
      </div>

      <div class="card card-info">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <span class="card-label">总成本（元）</span>
          <span class="card-value">---</span>
        </div>
      </div>

      <div class="card card-success">
        <div class="card-icon">📊</div>
        <div class="card-content">
          <span class="card-label">客户中转费（元）</span>
          <span class="card-value">---</span>
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-icon">🎁</div>
        <div class="card-content">
          <span class="card-label">总返利（元）</span>
          <span class="card-value">---</span>
        </div>
      </div>

      <div class="card card-danger">
        <div class="card-icon">💹</div>
        <div class="card-content">
          <span class="card-label">毛利（元）</span>
          <span class="card-value">---</span>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="panel-title">
          <span class="title-text">发货量排行</span>
        </div>
        <div class="ranking-list">
          <div
            v-for="(item, index) in topCustomers"
            :key="item.id"
            class="ranking-item"
            :class="{ 'top-three': index < 3 }"
          >
            <span class="rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
            <div class="customer-info">
              <span class="customer-name">{{ item.customerName }}</span>
              <span class="customer-code">{{ item.code }}</span>
            </div>
            <div class="profit-bar">
              <div
                class="profit-fill"
                :style="{ width: getPercentage(item.totalCount) + '%' }"
              ></div>
            </div>
            <span class="profit-value">{{ formatNumber(item.totalCount) }}</span>
          </div>
          <div v-if="topCustomers.length === 0" class="empty-ranking">
            暂无数据
          </div>
        </div>
      </div>

      <div class="center-panel">
        <div class="panel-title">
          <span class="title-text">区域发货分布</span>
        </div>
        <div class="map-container">
          <div ref="mapChartRef" class="map-chart"></div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-title">
          <span class="title-text">省份发货排行</span>
        </div>
        <div class="province-list">
          <div
            v-for="(region, index) in regionData"
            :key="region.province"
            class="province-item"
          >
            <div class="province-header">
              <span class="province-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="province-name">{{ region.province }}</span>
            </div>
            <div class="province-bar">
              <div
                class="province-fill"
                :style="{
                  width: region.percentage + '%',
                  backgroundColor: getRegionColor(index)
                }"
              ></div>
            </div>
            <div class="province-info">
              <span class="province-count">{{ formatNumber(region.totalCount) }} 件</span>
              <span class="province-percentage">{{ region.percentage }}%</span>
            </div>
          </div>
          <div v-if="regionData.length === 0" class="empty-province">
            暂无数据
          </div>
        </div>
      </div>
    </div>

    <footer class="dashboard-footer">
      <span class="update-time">最后更新：{{ lastUpdate }}</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from "vue";
import axios from "axios";
import * as echarts from "echarts";

const mapChartRef = ref(null);
let mapChart = null;
const currentDate = ref("");
const lastUpdate = ref("");

const summary = reactive({
  customerCount: 0,
  totalCount: 0,
  avgWeight: "0.00",
  dayOnDayRatio: "-",
  totalAmount: "0.00",
  totalFee: "0.00",
  totalRebate: "0.00",
  estimatedRebateAmount: "0.00",
  dynamicRebateAmount: "0.00",
  fixedPolicyFee: "0.00",
  totalProfit: "0.00",
});

const tableData = ref([]);
const topCustomers = ref([]);
const regionData = ref([]);

// 颜色列表（蓝色系渐变，适合深色背景）
const colorList = [
  "#0c3460", "#1a4d7a", "#276694", "#347fae", "#4199c8",
  "#4eb3e2", "#5accff", "#7bd4ff", "#9cddff", "#bde6ff",
  "#ddefff", "#0d3f6b", "#1c5785", "#2b6f9f", "#3a87b9",
  "#499fd3", "#58b7ed", "#67d0ff", "#80d8ff", "#99e0ff",
  "#b2e8ff", "#cce0ff", "#0e4476", "#1d5c90", "#2c74aa",
  "#3b8cc4", "#4aa4de", "#59bcf8", "#68d4ff", "#81dbff",
  "#9ae2ff"
];

const getRegionColor = (index) => {
  return colorList[index % colorList.length];
};

const getCurrentDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const handleDateChange = () => {
  doRefresh();
};

const formatNumber = (num) => {
  if (!num) return "0";
  return Number(num).toLocaleString();
};

const formatMoney = (amount) => {
  if (!amount) return "0.00";
  return Number(amount).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const isPositive = (ratio) => {
  if (!ratio || ratio === "-") return true;
  return ratio.startsWith("+") || !ratio.startsWith("-");
};

const getPercentage = (count) => {
  const maxCount = topCustomers.value.reduce((max, item) => {
    return Math.max(max, Number(item.totalCount) || 0);
  }, 1);
  if (maxCount === 0) return 0;
  return (Number(count) / maxCount) * 100;
};

const sortCustomers = () => {
  topCustomers.value = [...tableData.value]
    .sort((a, b) => Number(b.totalCount) - Number(a.totalCount))
    .slice(0, 8);
};

const initMapChart = async () => {
  if (!mapChartRef.value) return;

  mapChart = echarts.init(mapChartRef.value);

  try {
    // 从本地加载中国地图 GeoJSON 数据
    const response = await fetch("/china.json");
    const chinaJson = await response.json();
    echarts.registerMap("china", chinaJson);
  } catch (err) {
    console.error("加载地图数据失败", err);
  }

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        if (params.seriesType === "map") {
          const region = regionData.value.find(r => {
            return params.name === r.province || 
                   params.name.includes(r.province.replace(/省|市|自治区|壮族|回族|维吾尔/g, ""));
          });
          if (region) {
            return `${region.province}<br/>发货量: ${formatNumber(region.totalCount)}<br/>占比: ${region.percentage}%`;
          }
          return params.name;
        }
        return params.name;
      },
    },
    visualMap: {
      min: 0,
      max: 15,
      show: false,
      inRange: {
        color: ['#1a365d', '#2c5282', '#3182ce', '#4299e1', '#63b3ed', '#90cdf4', '#bee3f8']
      },
    },
    series: [
      {
        name: "省份发货占比",
        type: "map",
        map: "china",
        roam: true,
        zoom: 1.2,
        itemStyle: {
          borderColor: "#4a5568",
          borderWidth: 1.5,
          areaColor: "#2d3748",
        },
        emphasis: {
          itemStyle: {
            borderColor: "#667eea",
            borderWidth: 2,
          },
        },
        data: [],
      }
    ],
  };

  mapChart.setOption(option);

  window.addEventListener("resize", () => {
    if (mapChart) {
      mapChart.resize();
    }
  });
};

const updateMapChart = () => {
  if (!mapChart) return;

  // 构建省份数据，保留完整名称与GeoJSON匹配
  const mapData = regionData.value.map((region) => {
    return {
      name: region.province,
      value: region.percentage,
      count: region.totalCount,
    };
  });

  const maxPercentage = Math.max(...regionData.value.map(r => r.percentage), 15);

  const option = {
    visualMap: {
      min: 0,
      max: maxPercentage,
      show: false,
      inRange: {
        color: ['#1a365d', '#2c5282', '#3182ce', '#4299e1', '#63b3ed', '#90cdf4', '#bee3f8']
      },
    },
    series: [
      {
        name: "省份发货占比",
        type: "map",
        map: "china",
        roam: true,
        zoom: 1.2,
        data: mapData,
        itemStyle: {
          borderColor: "#4a5568",
          borderWidth: 1.5,
        },
        emphasis: {
          itemStyle: {
            borderColor: "#667eea",
            borderWidth: 2,
          },
        },
      }
    ],
  };

  mapChart.setOption(option);
};

const doRefresh = async () => {
  try {
    // 调用之前的接口获取汇总数据
    const [dataRes, summaryRes] = await Promise.all([
      axios.get("/api/dailyBill/statistics", { params: { date: currentDate.value } }),
      axios.get("/api/dailyBill/statistics/summary", { params: { date: currentDate.value } }),
    ]);

    if (dataRes.data.code === 200) {
      tableData.value = dataRes.data.data;
      sortCustomers();
    }

    if (summaryRes.data.code === 200) {
      const data = summaryRes.data.data;
      summary.customerCount = data.customerCount || 0;
      summary.totalCount = data.totalCount || 0;
      summary.avgWeight = data.avgWeight ? data.avgWeight.toString() : "0.00";
      summary.dayOnDayRatio = data.avgDayOnDayRatio
        ? (Number(data.avgDayOnDayRatio) * 100).toFixed(2) + "%"
        : "-";
      summary.totalAmount = data.totalAmount ? data.totalAmount.toString() : "0.00";
      summary.totalFee = data.totalCustomerFee ? data.totalCustomerFee.toString() : "0.00";
      summary.totalRebate = data.totalRebateAmount ? data.totalRebateAmount.toString() : "0.00";
      summary.estimatedRebateAmount = data.estimatedRebateAmount
        ? data.estimatedRebateAmount.toString()
        : "0.00";
      summary.dynamicRebateAmount = data.dynamicRebateAmount
        ? data.dynamicRebateAmount.toString()
        : "0.00";
      summary.fixedPolicyFee = data.fixedPolicyFee ? data.fixedPolicyFee.toString() : "0.00";
      summary.totalProfit = data.totalProfit ? data.totalProfit.toString() : "0.00";
    }

    // 调用地图接口
    const regionRes = await axios.get("/api/home/region-distribution", {
      params: { date: currentDate.value }
    }).catch(() => ({ data: { code: 200, data: { regionList: [] } } }));

    if (regionRes.data.code === 200) {
      regionData.value = regionRes.data.data.regionList || [];
      updateMapChart();
    }

    const now = new Date();
    lastUpdate.value = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  } catch (err) {
    console.error("获取数据失败", err);
  }
};

let refreshTimer = null;

onMounted(() => {
  currentDate.value = getCurrentDate();
  nextTick(() => {
    initMapChart();
  });
  doRefresh();
  // refreshTimer = setInterval(doRefresh, 60000);
});

onUnmounted(() => {
  if (mapChart) {
    mapChart.dispose();
    mapChart = null;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1628 0%, #1a1f3a 50%, #0d1b2a 100%);
  padding: 20px;
  color: #fff;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid rgba(24, 144, 255, 0.5);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(24, 144, 255, 0.2);
  border: 1px solid rgba(24, 144, 255, 0.5);
  border-radius: 8px;
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background: rgba(24, 144, 255, 0.3);
  transform: translateY(-2px);
}

.refresh-icon {
  font-size: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.card-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.card-value {
  font-size: 24px;
  font-weight: 700;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  font-size: 12px;
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #ff4d4f;
}

.trend-label {
  color: rgba(255, 255, 255, 0.5);
}

.card-primary .card-value {
  color: #1890ff;
}

.card-warning .card-value {
  color: #faad14;
}

.card-info .card-value {
  color: #13c2c2;
}

.card-success .card-value {
  color: #52c41a;
}

.card-blue .card-value {
  color: #722ed1;
}

.card-danger .card-value {
  color: #ff4d4f;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 20px;
}

.left-panel,
.center-panel,
.right-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.ranking-item.top-three {
  background: rgba(24, 144, 255, 0.1);
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #000;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #000;
}

.customer-info {
  display: flex;
  flex-direction: column;
  width: 80px;
  flex-shrink: 0;
}

.customer-name {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.customer-code {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.profit-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.profit-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.profit-value {
  width: 80px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #52c41a;
}

.empty-ranking {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding: 40px;
}

.map-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.map-chart {
  width: 100%;
  height: 350px;
}

.region-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-info {
  display: flex;
  flex-direction: column;
}

.legend-name {
  font-size: 12px;
  color: #fff;
}

.legend-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.region-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
}

.region-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.region-name {
  font-size: 14px;
  font-weight: 600;
}

.region-percentage {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.region-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.region-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.region-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-region {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding: 40px;
}

.province-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.province-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.province-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.province-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.province-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #000;
}

.province-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.province-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #000;
}

.province-name {
  font-size: 13px;
  color: #fff;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.province-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.province-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.province-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.province-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.province-percentage {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.empty-province {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  padding: 40px;
}

.dashboard-footer {
  text-align: center;
  padding: 15px;
  margin-top: 20px;
}

.update-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
</style>