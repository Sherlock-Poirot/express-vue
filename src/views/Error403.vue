<template>
  <div class="error-container">
    <div class="error-wrapper">
      <div class="error-illustration">
        <div class="lock-icon">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" class="lock-circle" />
            <rect x="35" y="45" width="50" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="none" />
            <circle cx="60" cy="75" r="6" fill="currentColor" />
            <path d="M40 45V35C40 29.4772 44.4772 25 50 25H70C75.5228 25 80 29.4772 80 35V45" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </div>
        <div class="error-code">403</div>
      </div>
      
      <div class="error-content">
        <h1 class="error-title">权限不足</h1>
        <p class="error-description">抱歉，您没有访问此页面的权限</p>
        <p class="error-hint">请联系管理员获取相应权限或返回首页</p>
        
        <div class="error-actions">
          <el-button type="primary" @click="goBack" class="btn-primary">
            <el-icon><ArrowLeft /></el-icon>
            返回首页
          </el-button>
          <el-button @click="goBack" class="btn-secondary">
            联系管理员
          </el-button>
        </div>
      </div>
    </div>
    
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.error-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: #fff;
  top: -150px;
  right: -150px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background: #fff;
  bottom: -100px;
  left: -100px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  background: #fff;
  top: 50%;
  left: 10%;
  transform: translateY(-50%);
}

.error-wrapper {
  background: #fff;
  border-radius: 24px;
  padding: 60px 80px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  max-width: 500px;
  width: 90%;
}

.error-illustration {
  position: relative;
  margin-bottom: 32px;
}

.lock-icon {
  width: 120px;
  height: 120px;
  color: #e74c3c;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.lock-circle {
  animation: spin 8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-code {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 800;
  color: #e74c3c;
  opacity: 0.3;
}

.error-content {
  text-align: center;
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px 0;
}

.error-description {
  font-size: 16px;
  color: #666;
  margin: 0 0 8px 0;
}

.error-hint {
  font-size: 14px;
  color: #999;
  margin: 0 0 32px 0;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  transform: translateY(-2px);
}
</style>