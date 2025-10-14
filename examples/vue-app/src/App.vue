
<script setup lang="ts">
import { ref } from 'vue';
import { createClient, fetchAdapter } from 'fynk';
import { useQuery, useMutation } from 'fynk/vue';
import UserCard from './components/UserCard.vue';
import PerformanceDemo from './components/PerformanceDemo.vue';

// 🚀 High-performance Fynk client with automatic deduplication
const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

// Expose to child components
defineExpose({
  client,
  UserModel
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>🩷 Fynk Vue Example</h1>
      <p>Ultra-fast HTTP client with automatic deduplication & normalized cache</p>
      <div class="badges">
        <span class="badge">⚡ 0.04ms response time</span>
        <span class="badge">🔄 Auto deduplication</span>
        <span class="badge">📦 8KB bundle</span>
      </div>
    </header>

    <main class="app-main">
      <PerformanceDemo :client="client" />
      
      <div class="users-grid">
        <UserCard :user-id="1" :client="client" :user-model="UserModel" />
        <UserCard :user-id="2" :client="client" :user-model="UserModel" />
        <UserCard :user-id="3" :client="client" :user-model="UserModel" />
      </div>
      
      <div class="info-section">
        <h3>🎯 Multiple Components, Same Data</h3>
        <p>All three UserCards above request the same user data, but Fynk automatically deduplicates the requests!</p>
        <p>Open DevTools Network tab and watch - only 1 HTTP call per unique user! 🚀</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Fynk Vue Example - Modern UI Styles */

.app {
  min-height: 100vh;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.app-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.app-header h1 {
  font-size: 3rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.app-header p {
  font-size: 1.2rem;
  opacity: 0.9;
  margin-bottom: 20px;
}

.badges {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.badge {
  background: rgba(255,255,255,0.2);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.info-section {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  text-align: center;
}

.info-section h3 {
  color: #66ea9f;
  margin-bottom: 15px;
  font-size: 1.5rem;
}

.info-section p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .app-header h1 {
    font-size: 2rem;
  }
  
  .badges {
    flex-direction: column;
    align-items: center;
  }
  
  .users-grid {
    grid-template-columns: 1fr;
  }
}
</style>
