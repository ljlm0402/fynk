
import express from 'express';
const app = express();

app.get('/events', (req, res) => {
  res.set({'Content-Type': 'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
  setInterval(() => {
    const evt = { type: 'user.updated', payload: { id: 1, partial: { name: 'Updated ' + Date.now() } } };
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }, 1000);
});

app.listen(4001, () => console.log('SSE server on http://localhost:4001'));
