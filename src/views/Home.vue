<template>
  <div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>公司名称</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in homeData" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.companyName }}</td>
          <td>{{ item.remark }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineOptions({
  name: 'Home'
})

const homeData = [
  { id: 1, companyName: '圆恒供应链', remark: '核心合作客户' },
  { id: 2, companyName: '台州速运', remark: '月结客户' },
]
</script>