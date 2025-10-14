<script setup lang="ts">
import Chat from './components/ChartInterface.vue';
import 'devextreme/dist/css/dx.fluent.blue.light.css';
</script>

<template>
  <div class="app-container">
    <div class="chat-wrapper">
      <Chat/>
    </div>
  </div>
</template>
<style scoped>
.app-container {
  display: flex;
  justify-content: center;
  padding: 50px;
}

.chat-wrapper {
  width: 100%;
  max-width: 900px;
  height: 710px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.chat-disabled .dx-chat-messagebox) {
  opacity: 0.5;
  pointer-events: none;
}
</style>
