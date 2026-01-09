import './App.css'
import { GameCanvas } from './components/GameCanvas'
import { BattleOverlay } from './components/BattleOverlay'

function App() {
  return (
    <div className="App">
      <h1>Pokemon HTML5 Engine</h1>
      <div style={{ position: 'relative', width: '800px', height: '600px', margin: '0 auto' }}>
        <GameCanvas />
        <BattleOverlay />
      </div>
    </div>
  )
}

export default App