<script setup lang="ts">
import { useQuery, useMutation } from 'fynk/vue';

interface Props {
  userId: number;
  client: any;
  userModel: any;
}

const props = defineProps<Props>();

type User = { id: number; name: string; email: string; };

const { data, pending, error, refetch } = useQuery<User>(props.client, {
  key: ['user', props.userId],
  request: () => props.client.get<User>(`/users/${props.userId}`),
  model: props.userModel,
  staleTime: 60000
});

const { mutate, pending: saving } = useMutation<{ name: string }, User>(props.client, {
  request: (vars) => props.client.post<User>('/users', { body: vars }),
  optimistic: (draft, vars) => {
    // ⚡ Instant UI update - rollback if fails
    draft.insert(props.userModel, { 
      id: Date.now(), 
      name: vars.name, 
      email: 'new@example.com' 
    });
  },
  onSuccess: (res, draft) => draft.upsert(props.userModel, res)
});
</script>

<template>
  <div class="user-card">
    <!-- Loading State -->
    <div v-if="pending" class="user-card loading">
      <div class="spinner"></div>
      <p>Loading user data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="user-card error">
      <p>❌ Error loading user</p>
      <button @click="refetch()" class="btn-secondary">Retry</button>
    </div>

    <!-- Success State -->
    <div v-else>
      <div class="user-info">
        <h3>👤 {{ data?.name }}</h3>
        <p>📧 {{ data?.email }}</p>
        <p class="user-id">ID: {{ data?.id }}</p>
      </div>
      <div class="actions">
        <button @click="refetch()" class="btn-secondary">
          🔄 Refetch
        </button>
        <button 
          :disabled="saving" 
          @click="mutate({ name: `Updated User ${Date.now()}` })"
          class="btn-primary"
        >
          {{ saving ? '⏳ Saving...' : '✨ Add New User' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.15);
}

.user-card.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #66ea9f;
}

.user-card.error {
  border: 2px solid #ff6b6b;
  background: #fff5f5;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #66ea9f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.user-info h3 {
  color: #333;
  margin-bottom: 10px;
  font-size: 1.4rem;
}

.user-info p {
  color: #666;
  margin-bottom: 8px;
}

.user-id {
  font-size: 0.9rem;
  color: #999;
  border-top: 1px solid #eee;
  padding-top: 10px;
  margin-top: 10px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(45deg, #66ea9f, #4ba296);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8f9fa;
  color: #66ea9f;
  border: 2px solid #66ea9f;
}

.btn-secondary:hover {
  background: #66ea9f;
  color: white;
}
</style>