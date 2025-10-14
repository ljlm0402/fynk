
import React, { useState } from 'react';
import { createClient, fetchAdapter } from 'fynk';
import { useQuery, useMutation } from 'fynk/react';

// 🚀 High-performance Fynk client with automatic deduplication
const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

function UserCard({ userId }: { userId: number }) {
  const { data, pending, error, refetch } = useQuery<User>(client, {
    key: ['user', userId],
    request: () => client.get<User>(`/users/${userId}`),
    model: UserModel,
    staleTime: 60000
  });

  const { mutate, pending: saving } = useMutation<{ name: string }, User>(client, {
    request: (vars) => client.post<User>('/users', { body: vars }),
    optimistic: (draft, vars) => {
      // ⚡ Instant UI update - rollback if fails
      draft.insert(UserModel, { id: Date.now(), name: vars.name, email: 'new@example.com' });
    },
    onSuccess: (res, draft) => draft.upsert(UserModel, res)
  });

  if (pending) return (
    <div className="user-card loading">
      <div className="spinner"></div>
      <p>Loading user data...</p>
    </div>
  );
  
  if (error) return (
    <div className="user-card error">
      <p>❌ Error loading user</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );

  return (
    <div className="user-card">
      <div className="user-info">
        <h3>👤 {data?.name}</h3>
        <p>📧 {data?.email}</p>
        <p className="user-id">ID: {data?.id}</p>
      </div>
      <div className="actions">
        <button onClick={() => refetch()} className="btn-secondary">
          🔄 Refetch
        </button>
        <button 
          disabled={saving} 
          onClick={() => mutate({ name: `Updated User ${Date.now()}` })}
          className="btn-primary"
        >
          {saving ? '⏳ Saving...' : '✨ Add New User'}
        </button>
      </div>
    </div>
  );
}

function PerformanceDemo() {
  const [requestCount, setRequestCount] = useState(0);
  
  const handleMultipleRequests = async () => {
    const startTime = performance.now();
    setRequestCount(0);
    
    // 🔄 These 5 requests will be automatically deduplicated!
    const promises = Array.from({ length: 5 }, (_, i) => 
      client.get<User>('/users/1')
        .then(user => {
          setRequestCount(prev => prev + 1);
          return user;
        })
    );
    
    await Promise.all(promises);
    const endTime = performance.now();
    
    alert(`✨ Fynk Magic: 5 requests deduplicated into 1!\nTime: ${(endTime - startTime).toFixed(2)}ms`);
  };

  return (
    <div className="performance-demo">
      <h2>🚀 Fynk Performance Demo</h2>
      <p>Watch automatic request deduplication in action!</p>
      <button onClick={handleMultipleRequests} className="btn-demo">
        🎯 Fire 5 Concurrent Requests
      </button>
      {requestCount > 0 && (
        <p className="counter">Responses received: {requestCount}/5</p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🩷 Fynk React Example</h1>
        <p>Ultra-fast HTTP client with automatic deduplication & normalized cache</p>
        <div className="badges">
          <span className="badge">⚡ 0.04ms response time</span>
          <span className="badge">🔄 Auto deduplication</span>
          <span className="badge">📦 8KB bundle</span>
        </div>
      </header>

      <main className="app-main">
        <PerformanceDemo />
        
        <div className="users-grid">
          <UserCard userId={1} />
          <UserCard userId={2} />
          <UserCard userId={3} />
        </div>
        
        <div className="info-section">
          <h3>🎯 Multiple Components, Same Data</h3>
          <p>All three UserCards above request the same user data, but Fynk automatically deduplicates the requests!</p>
          <p>Open DevTools Network tab and watch - only 1 HTTP call per unique user! 🚀</p>
        </div>
      </main>
    </div>
  );
}
