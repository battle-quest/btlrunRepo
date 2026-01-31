import { useState } from 'preact/hooks';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div class="container">
      <header class="header">
        <h1 class="title">btl.run</h1>
        <p class="subtitle">Hyper-efficient battle game</p>
      </header>
      
      <main class="main">
        <div class="card">
          <button 
            class="button" 
            onClick={() => setCount((c) => c + 1)}
          >
            Count: {count}
          </button>
          <p class="hint">
            Edit <code>src/app.tsx</code> to start building
          </p>
        </div>
      </main>

      <footer class="footer">
        <p>Built with Preact + Vite</p>
      </footer>
    </div>
  );
}
