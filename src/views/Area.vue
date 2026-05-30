<template>
  <div>
    <h2>区域字典</h2>
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
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

// 定义数据
const areaData = ref([]);

// 获取后端区域列表
async function getAreaList() {
  try {
    const res = await axios.get("/api/area/list");
    // 把后端 data 数组赋值给页面
    areaData.value = res.data.data;
  } catch (e) {
    console.error("获取区域列表失败", e);
  }
}

// 页面加载时自动请求
onMounted(() => {
  getAreaList();
});
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
th,
td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}
</style>
