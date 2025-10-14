
import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));

let users = Array.from({ length: 50 }, (_, i) => ({ id: i+1, name: `User ${i+1}`, email: `u${i+1}@a.com` }));

app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  setTimeout(() => res.json(users.find(u => u.id === id)), 50); // 50ms latency
});

app.post('/users', (req, res) => {
  const b = req.body || {};
  const newUser = { id: users.length + 1, name: b.name ?? 'NoName', email: '' };
  users.push(newUser);
  res.json(newUser);
});

app.listen(4000, () => console.log('API server on http://localhost:4000'));
