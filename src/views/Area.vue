<template>
  <div class="area-container">
    <h2>区域字典</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>公司编码</th>
            <th>公司名称</th>
            <th>区域</th>
            <th>城市</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in areaData" :key="item.areaNum">
            <td>{{ item.companyId }}</td>
            <td>{{ item.companyName }}</td>
            <td>{{ item.areaName }}</td>
            <td>{{ item.areaCity }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const areaData = ref([]);

async function getAreaList() {
  try {
    const res = await axios.get("/api/area/list");
    areaData.value = res.data.data;
  } catch (e) {
    console.error("获取区域列表失败", e);
  }
}

onMounted(() => {
  getAreaList();
});
</script>

<style scoped>
.area-container {
  padding: 24px;
}

h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.table-wrapper {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: linear-gradient(135deg, #667eea 0%, #79638f 100%);
  color: #fff;
  padding: 12px 16px;
  font-weight: 600;
  text-align: center;
  border: none;
}

td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #eee;
  color: #666;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: #f8f9fa;
}
</style>
