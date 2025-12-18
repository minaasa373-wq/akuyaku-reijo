const { useState, useEffect, useRef } = React;

// --- 設定 ---
// ここにあなたのAPIキーを貼り付けてください
const apiKey = "AIzaSyDTHwr1ijGcXLOSMxDERpotFgjFv56NXd0"; 

const BEAT_SHEET = [
  { turn: 1, theme: "断罪のファンファーレ", instruction: "舞踏会の最中、音楽が止まる。王子が婚約破棄を宣言する。衆人環視の恥辱。" },
  { turn: 2, theme: "泥棒猫の涙", instruction: "ライバルの男爵令嬢が「いじめられた」と嘘泣きをする。王子はそれを信じ切っている。" },
  { turn: 3, theme: "氷の視線", instruction: "昨日まで媚びてきた周囲の貴族たちが、一斉に掌を返し、嘲笑や軽蔑の目を向けてくる。" },
  { turn: 4, theme: "偽りの証拠", instruction: "身に覚えのない「証拠（手紙や宝石）」が提示される。弁明するか、笑い飛ばすか。" },
  { turn: 5, theme: "幕引きの一撃（クライマックス）", instruction: "会場を去る直前。王子たち、あるいは社交界全体へ、忘れられない「捨て台詞」や行動を叩きつける。" },
  { turn: 6, theme: "夜の馬車", instruction: "喧騒から遮断された馬車の中。張り詰めていた糸が切れる瞬間、あるいは静かな怒りの再燃。" },
  { turn: 7, theme: "家門の閉門", instruction: "実家にて。父（当主）は娘を守ろうとせず、体面を気にして勘当・追放を言い渡す。" },
  { turn: 8, theme: "最後の選択（重要アイテム）", instruction: "自室で荷造り。ドレスを脱ぎ、何を持っていくか。宝石（過去）、短剣（意思）、手紙（秘密）。" },
  { turn: 9, theme: "影の忠誠", instruction: "裏口から去ろうとする時、一人だけ付いて来ようとする者（侍女、庭師、護衛など）の描写。" },
  { turn: 10, theme: "夜明けの境界線", instruction: "領地を出る境界線。朝日が昇る。振り返らずに新しい世界（隣国、平民街、あるいは荒野）へ踏み出す。" }
];

const ARCHETYPES = [
  { id: "Arrogant_Queen", name: "傲慢", desc: "「私が間違っているはずがない」", color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-800", icon: "👑" },
  { id: "Ice_Schemer", name: "冷徹", desc: "「……全て、計算通りよ」", color: "text-blue-300", bg: "bg-slate-900/60", border: "border-blue-800", icon: "💎" },
  { id: "Tragic_Heroine", name: "悲劇", desc: "「どうして信じてくれないの…」", color: "text-purple-300", bg: "bg-purple-950/40", border: "border-purple-800", icon: "💔" },
  { id: "Wild_Spirit", name: "歓喜", desc: "「やっと自由になれるわ！」", color: "text-emerald-300", bg: "bg-emerald-950/40", border: "border-emerald-800", icon: "🕊️" }
];

async function callGeminiGM(history, archetype, currentTurn) {
  const currentBeat = BEAT_SHEET[currentTurn - 1];
  const systemPrompt = `あなたは悪役令嬢の追放劇を司るGMです。中世ヨーロッパ風の優雅で毒のある文体で描写してください。必ずJSONで返して。{"narrative": "...", "suggested_actions": ["A", "B", "C"]}`;
  const log = history.map(h => `${h.role}: ${h.text}`).join("\n");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: log + "\n次の展開をJSONで。" }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) { return { narrative: "通信エラーですわ...", suggested_actions: ["やり直す"] }; }
}

async function analyzePersonality(history) {
  const log = history.map(h => h.text).join("\n");
  const systemPrompt = `悪役令嬢診断をJSONで。{"rank": "...", "title": "...", "stats": {"pride":5, "intelligence":5, "madness":5, "charisma":5, "survival":5}, "comment": "..."}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: log }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) { return null; }
}

function VillainessTRPG() {
  const [gameState, setGameState] = useState('intro');
  const [archetype, setArchetype] = useState(null);
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const initGame = async (arch) => {
    setArchetype(arch);
    setGameState('playing');
    setIsLoading(true);
    const res = await callGeminiGM([{ role: 'user', text: '舞踏会の開幕' }], arch, 1);
    setHistory([{ role: 'model', text: res.narrative }]);
    setSuggestions(res.suggested_actions);
    setIsLoading(false);
  };

  const handleAction = async (text) => {
    if (!text || isLoading) return;
    const newHistory = [...history, { role: 'user', text }];
    setHistory(newHistory);
    setInputText("");
    setIsLoading(true);
    if (turn >= 10) {
      setGameState('result');
    } else {
      const res = await callGeminiGM(newHistory, archetype, turn + 1);
      setHistory([...newHistory, { role: 'model', text: res.narrative }]);
      setSuggestions(res.suggested_actions);
      setTurn(turn + 1);
    }
    setIsLoading(false);
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

  if (gameState === 'intro') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a0505] text-rose-50 p-6 text-center font-serif">
      <h1 className="text-4xl font-bold mb-4 text-amber-200">悪役令嬢の追放劇</h1>
      <p className="mb-10 opacity-70">今宵、あなたは断罪される。</p>
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {ARCHETYPES.map(arch => (
          <button key={arch.id} onClick={() => initGame(arch)} className={`p-4 border ${arch.border} ${arch.bg} rounded-lg text-left`}>
            <div className="flex justify-between items-center text-xl mb-1">
              <span className={arch.color}>{arch.name}</span>
              <span>{arch.icon}</span>
            </div>
            <p className="text-xs opacity-60">{arch.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (gameState === 'result') return (
    <div className="min-h-screen bg-[#0f0404] text-rose-100 p-6 flex flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold mb-6">終幕</h2>
      <div className="bg-[#150505] p-8 rounded-xl border border-rose-900/30">
        <p className="mb-6">あなたの物語は終わりました。</p>
        <button onClick={() => window.location.reload()} className="text-rose-500 underline">最初から遊ぶ</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0f0404] text-rose-50">
      <div className="p-4 bg-[#1a0505] border-b border-rose-900/30 flex justify-between">
        <span className={archetype.color}>{archetype.name} 令嬢 ({turn}/10)</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-rose-900/40' : 'bg-[#1a0505] border border-rose-900/20'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-rose-400 animate-pulse text-sm">執筆中...</div>}
      </div>
      <div className="p-4 bg-[#120505] border-t border-rose-900/30">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleAction(s)} className="bg-rose-950 px-3 py-1 rounded text-xs border border-rose-800 whitespace-nowrap">{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAction(inputText)} className="flex-1 bg-black p-3 rounded border border-rose-900 outline-none" placeholder="どう振る舞いますか？" />
          <button onClick={() => handleAction(inputText)} className="bg-rose-800 px-6 rounded">送信</button>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<VillainessTRPG />);

