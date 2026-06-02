<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app, .app-container {
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 弹窗 */
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
  background: white;
  width: 90%;
  max-width: 1200px;
  border-radius: 8px;
  padding: 20px;
  max-height: 90vh;
  overflow: auto;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.close-btn {
  cursor: pointer;
  font-size: 20px;
}

/* 遮罩层 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* 确认弹窗 */
.confirm-modal-box {
  background: #fff;
  width: 380px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.confirm-title {
  padding: 18px 20px 10px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.confirm-text {
  padding: 10px 24px 24px;
  font-size: 15px;
  color: #555;
  text-align: center;
  line-height: 1.5;
}

.confirm-btns {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.confirm-btn {
  flex: 1;
  border: none;
  padding: 15px 0;
  font-size: 15px;
  cursor: pointer;
}

.confirm-btn.cancel {
  background: #f9fafb;
  color: #666;
}

.confirm-btn.ok {
  background: #ff4d4f;
  color: #fff;
}

/* 消息弹窗（带确定）*/
.msg-modal-box {
  background: #fff;
  width: 320px;
  border-radius: 16px;
  padding: 30px 24px 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.msg-text {
  font-size: 15px;
  color: #333;
  margin-bottom: 24px;
  line-height: 1.5;
}

.msg-ok-btn {
  width: 100%;
  border: none;
  background: #1890ff;
  color: #fff;
  padding: 12px 0;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}
</style>
