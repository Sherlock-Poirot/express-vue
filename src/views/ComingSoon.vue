<template>
  <div class="coming-soon-container">
    <div class="coming-soon-content">
      <div class="icon-wrapper">
        <el-icon :size="80" class="main-icon">
          <Clock />
        </el-icon>
      </div>
      <h1 class="title">功能开发中</h1>
      <p class="subtitle">该功能正在紧张开发中，敬请期待...</p>
      <div class="decorative-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Clock } from '@element-plus/icons-vue'
</script>

<style scoped>
.coming-soon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.coming-soon-content {
  text-align: center;
  padding: 40px;
}

.icon-wrapper {
  width: 120px;
  height: 120px;
  margin: 0 auto 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.main-icon {
  color: white;
}

.title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 16px;
  color: #888;
  margin-bottom: 30px;
}

.decorative-dots {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  background: #ddd;
  border-radius: 50%;
  animation: blink 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes blink {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
