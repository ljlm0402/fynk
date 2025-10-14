<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  client: any;
}

const props = defineProps<Props>();

const requestCount = ref(0);

type User = { id: number; name: string; email: string; };

const handleMultipleRequests = async () => {
  const startTime = performance.now();
  requestCount.value = 0;
  
  // 🔄 These 5 requests will be automatically deduplicated!
  const promises = Array.from({ length: 5 }, (_, i) => 
    props.client.get<User>('/users/1')
      .then((user: User) => {
        requestCount.value++;
        return user;
      })
  );
  
  await Promise.all(promises);
  const endTime = performance.now();
  
  alert(`✨ Fynk Magic: 5 requests deduplicated into 1!\nTime: ${(endTime - startTime).toFixed(2)}ms`);
};
</script>

<template>
  <div class="performance-demo">
    <h2>🚀 Fynk Performance Demo</h2>
    <p>Watch automatic request deduplication in action!</p>
    <button @click="handleMultipleRequests" class="btn-demo">
      🎯 Fire 5 Concurrent Requests
    </button>
    <p v-if="requestCount > 0" class="counter">
      Responses received: {{ requestCount }}/5
    </p>
  </div>
</template>

<style scoped>
.performance-demo {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 40px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  text-align: center;
}

.performance-demo h2 {
  color: #66ea9f;
  margin-bottom: 15px;
}

.performance-demo p {
  margin-bottom: 20px;
  color: #666;
}

.btn-demo {
  background: linear-gradient(45deg, #66ea9f, #4ba296);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-demo:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.counter {
  margin-top: 15px;
  font-weight: 600;
  color: #66ea9f;
  font-size: 1.1rem;
}
</style>