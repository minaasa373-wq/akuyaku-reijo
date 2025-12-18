import os
import json
import time
from typing import Dict, List, Any, Optional

import requests
import streamlit as st

# -----------------------------
# Data (same as your React version)
# -----------------------------
BEAT_SHEET = [
    {"turn": 1, "theme": "断罪のファンファーレ", "instruction": "舞踏会の最中、音楽が止まる。王子が婚約破棄を宣言する。衆人環視の恥辱。"},
    {"turn": 2, "theme": "泥棒猫の涙", "instruction": "ライバルの男爵令嬢が「いじめられた」と嘘泣きをする。王子はそれを信じ切っている。"},
    {"turn": 3, "theme": "氷の視線", "instruction": "昨日まで媚びてきた周囲の貴族たちが、一斉に掌を返し、嘲笑や軽蔑の目を向けてくる。"},
    {"turn": 4, "theme": "偽りの証拠", "instruction": "身に覚えのない「証拠（手紙や宝石）」が提示される。弁明するか、笑い飛ばすか。"},
    {"turn": 5, "theme": "幕引きの一撃（クライマックス）", "instruction": "会場を去る直前。王子たち、あるいは社交界全体へ、忘れられない「捨て台詞」や行動を叩きつける。"},
    {"turn": 6, "theme": "夜の馬車", "instruction": "喧騒から遮断された馬車の中。張り詰めていた糸が切れる瞬間、あるいは静かな怒りの再燃。"},
    {"turn": 7, "theme": "家門の閉門", "instruction": "実家にて。父（当主）は娘を守ろうとせず、体面を気にして勘当・追放を言い渡す。"},
    {"turn": 8, "theme": "最後の選択（重要アイテム）", "instruction": "自室で荷造り。ドレスを脱ぎ、何を持っていくか。宝石（過去）、短剣（意思）、手紙（秘密）。"},
    {"turn": 9, "theme": "影の忠誠", "instruction": "裏口から去ろうとする時、一人だけ付いて来ようとする者（侍女、庭師、護衛など）の描写。"},
    {"turn": 10, "theme": "夜明けの境界線", "instruction": "領地を出る境界線。朝日が昇る。振り返らずに新しい世界（隣国、平民街、あるいは荒野）へ踏み出す。"},
]

ARCHETYPES: Dict[str, Dict[str, str]] = {
    "Arrogant_Queen": {"name": "傲慢（プライド）", "desc": "「私が間違っているはずがない」"},
    "Ice_Schemer": {"name": "冷徹（クール）", "desc": "「……全て、計算通りよ」"},
    "Tragic_Heroine": {"name": "悲劇（ヒロイン）", "desc": "「どうして信じてくれないの…」"},
    "Wild_Spirit": {"name": "歓喜（フリーダム）", "desc": "「やっと自由になれるわ！」"},
}

STAT_TRANSLATIONS = {
    "pride": "プライド",
    "intelligence": "知性",
    "madness": "狂気",
    "charisma": "カリスマ",
    "survival": "生存力",
}

# -----------------------------
# Gemini REST helpers
# -----------------------------
def get_secret(key: str, default: str = "") -> str:
    # Streamlit secrets優先 → env fallback
    if key in st.secrets:
        return str(st.secrets[key])
    return os.getenv(key, default)

def extract_json(text: str) -> Any:
    text = (text or "").strip()
    try:
        return json.loads(text)
    except Exception:
        # 余計な前置きが混ざっても最初のJSON塊を拾う
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise

def gemini_generate_json(system_prompt: str, user_prompt: str, model: str, retries: int = 3) -> Any:
    api_key = get_secret("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY が未設定です（Streamlit secretsに入れてください）")

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"responseMimeType": "application/json"},
    }
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,  # URLクエリにキーを出さない
    }

    last_err = None
    for i in range(retries):
        try:
            r = requests.post(endpoint, headers=headers, json=payload, timeout=35)
            if r.status_code in (429, 503):
                time.sleep(0.6 * (2**i))
                continue
            if not r.ok:
                raise RuntimeError(f"Gemini HTTP {r.status_code}: {r.text[:800]}")
            data = r.json()
            txt = data["candidates"][0]["content"]["parts"][0]["text"]
            return extract_json(txt)
        except Exception as e:
            last_err = e
            time.sleep(0.4 * (2**i))
    raise RuntimeError(str(last_err))

def call_gm(history: List[Dict[str, str]], archetype: Dict[str, str], turn: int) -> Dict[str, Any]:
    beat = BEAT_SHEET[turn - 1]
    system_prompt = f"""
あなたは「悪役令嬢の追放劇」を司るストーリーテラーです。
世界観は「中世ヨーロッパ風の貴族社会」。
文体は「優雅」かつ「毒」を含んだもので、舞踏会の華やかさと、その裏にある人間の醜さを対比させて描写してください。

現在のターン: {turn} / 10
現在のテーマ: {beat["theme"]}
進行指示: {beat["instruction"]}

プレイヤーの性格: {archetype["name"]} ({archetype["desc"]})

# ルール
1. 描写は200〜300文字程度。情景（ドレス、音楽、香水）と感情を交えてください。
2. ストーリーテラーは、少し皮肉屋の「観測者」のような視点で語ってください。
3. 最後に、プレイヤーが取れそうな行動の選択肢を3つ提案してください。
4. 必ずJSON形式で返答してください。

# JSON
{{
  "narrative": "...",
  "suggested_actions": ["...", "...", "..."]
}}
""".strip()

    convo = "\n".join([f'{m["role"]}: {m["text"]}' for m in history])
    user_prompt = f"{convo}\n\n(次のシーンを描写し、JSON形式で返してください)"

    model = get_secret("GEMINI_MODEL", "gemini-2.5-flash-preview-09-2025")
    try:
        return gemini_generate_json(system_prompt, user_prompt, model=model)
    except Exception:
        return {
            "narrative": "……インクが滲んで読めない。（通信エラーが発生しました。再試行してください）",
            "suggested_actions": ["再試行する"],
        }

def analyze_personality(history: List[Dict[str, str]], archetype: Dict[str, str]) -> Optional[Dict[str, Any]]:
    log_text = "\n".join(
        [f'[{"プレイヤー" if m["role"]=="user" else "状況"}] {m["text"]}' for m in history]
    )
    system_prompt = """
あなたは辛口かつ優雅な「悪役令嬢評論家」です。
プレイヤーのゲームプレイログを分析し、その「悪役令嬢としての素質」を診断してください。

# 出力（JSON固定）
{
  "rank": "S級：...などユニークに",
  "title": "二つ名",
  "stats": {
    "pride": 1-5,
    "intelligence": 1-5,
    "madness": 1-5,
    "charisma": 1-5,
    "survival": 1-5
  },
  "comment": "200文字程度。具体的に引用して褒める/貶す"
}
""".strip()

    user_prompt = f"""
プレイヤーの性格設定: {archetype["name"]}
プレイログ:
{log_text}

このプレイヤーの悪役令嬢診断書を作成せよ。
""".strip()

    model = get_secret("GEMINI_MODEL", "gemini-2.5-flash-preview-09-2025")
    try:
        return gemini_generate_json(system_prompt, user_prompt, model=model)
    except Exception:
        return None

def generate_novel_prompt(history: List[Dict[str, str]], archetype: Dict[str, str]) -> str:
    log_text = "\n".join(
        [f'[{"令嬢の行動" if m["role"]=="user" else "状況描写"}] {m["text"]}' for m in history]
    )
    return f"""# Role
あなたは「悪役令嬢もの」「婚約破棄もの」で絶大な人気を誇るライトノベル作家です。
以下のプレイログを元に、**文字数3,000〜4,000文字**のドラマチックな短編小説を執筆してください。

# プレイログ (Villainess History)
{log_text}

# 執筆ガイドライン (重要)

## 1. 文字数と密度の確保
本文は必ず3000文字以上とする。
3000文字未満で物語を完結させることは禁止。
文字数が3000文字に達するまでは、結末を書いてはならない。
- ログは「あらすじ」に過ぎません。これを小説化する際は、一瞬の出来事を「スローモーション」のように引き伸ばして描写してください。
- 1ターンの出来事に対し、その5倍の分量の「心理描写」と「情景描写」を肉付けしてください。

## 2. 徹底的な五感と装飾の描写
- 視覚/聴覚/嗅覚/触覚を執拗に描写し、貴族社会の「美しさ」と「残酷さ」を表現。

## 3. 余白の補完（ログにない描写の追加）
- ログとログの間の沈黙や回想を創作して埋めてよい（筋は変えない）。

## 4. 文体
- 主人公の性格（{archetype["name"]}）に基づいた没入感のある一人称視点。

# 出力形式
- タイトル（Web小説風のキャッチーなもの）
- キャッチコピー（3行）
- 本文（マークダウン形式）
"""

# -----------------------------
# Streamlit UI
# -----------------------------
st.set_page_config(page_title="悪役令嬢の追放劇", layout="wide")

st.markdown(
    """
<style>
/* ちょい世界観 */
.block-container { padding-top: 2rem; }
.stApp { background: radial-gradient(ellipse at top, #2a0a0a 0%, #0f0404 60%); }
h1, h2, h3, h4, p, div, span { color: #ffe4e6; }
</style>
""",
    unsafe_allow_html=True,
)

def ss_init():
    st.session_state.setdefault("stage", "intro")  # intro / playing / result
    st.session_state.setdefault("archetype_id", None)
    st.session_state.setdefault("turn", 1)
    st.session_state.setdefault("history", [])  # list of {role, text}
    st.session_state.setdefault("suggestions", [])
    st.session_state.setdefault("pending_action", None)
    st.session_state.setdefault("analysis", None)

def reset_all():
    st.session_state.stage = "intro"
    st.session_state.archetype_id = None
    st.session_state.turn = 1
    st.session_state.history = []
    st.session_state.suggestions = []
    st.session_state.pending_action = None
    st.session_state.analysis = None

ss_init()

with st.sidebar:
    st.markdown("### 設定")
    st.caption("APIキーはStreamlit secretsに入れる（コードに直書きしない）。")
    st.divider()
    if st.button("リセット（最初から）", use_container_width=True):
        reset_all()
        st.rerun()

    st.divider()
    st.markdown("### 注意")
    st.caption("Community Cloudは無操作が続くとスリープします。 :contentReference[oaicite:1]{index=1}")

# ---- Intro ----
if st.session_state.stage == "intro":
    st.markdown("# 👑 悪役令嬢の追放劇")
    st.markdown("**今宵、あなたは断罪される。涙を流すか、高らかに笑うか。**")
    st.markdown("アーキタイプを選んで開始。")

    cols = st.columns(4)
    for i, (aid, a) in enumerate(ARCHETYPES.items()):
        with cols[i]:
            if st.button(f'{a["name"]}\n\n{a["desc"]}', use_container_width=True):
                st.session_state.archetype_id = aid
                st.session_state.stage = "playing"
                st.session_state.turn = 1
                st.session_state.history = []
                st.session_state.suggestions = []
                st.session_state.analysis = None

                # Start
                with st.spinner("物語を執筆中…"):
                    start_prompt = [{"role": "system", "text": "舞踏会の開幕"}]
                    gm = call_gm(start_prompt, a, 1)
                    st.session_state.history = [{"role": "model", "text": gm.get("narrative", "")}]
                    st.session_state.suggestions = gm.get("suggested_actions", [])
                st.rerun()

# ---- Playing ----
elif st.session_state.stage == "playing":
    archetype = ARCHETYPES[st.session_state.archetype_id]
    turn = st.session_state.turn

    st.markdown(f"# 🎭 {archetype['name']}")
    st.caption(f"CHAPTER {turn} / 10 ・ {BEAT_SHEET[turn-1]['theme']}")
    st.progress(turn / 10)

    # Chat history
    for m in st.session_state.history:
        who = "user" if m["role"] == "user" else "assistant"
        with st.chat_message(who):
            st.write(m["text"])

    # Suggestions
    if st.session_state.suggestions:
        st.markdown("#### 選択肢")
        sug_cols = st.columns(min(3, len(st.session_state.suggestions)))
        for idx, sug in enumerate(st.session_state.suggestions[:3]):
            with sug_cols[idx]:
                if st.button(sug, use_container_width=True):
                    st.session_state.pending_action = sug
                    st.rerun()

    # Free input
    user_text = st.chat_input("次の行動、あるいは言葉を…")
    if user_text:
        st.session_state.pending_action = user_text
        st.rerun()

    # Handle pending action (one place to avoid double-submit)
    if st.session_state.pending_action:
        action_text = (st.session_state.pending_action or "").strip()
        st.session_state.pending_action = None

        if action_text:
            # basic guard (友達に公開するなら無限入力は事故る)
            if len(action_text) > 500:
                action_text = action_text[:500]

            st.session_state.history.append({"role": "user", "text": action_text})

            with st.spinner("物語を執筆中…"):
                if st.session_state.turn >= 10:
                    gm = call_gm(st.session_state.history, archetype, 10)
                    st.session_state.history.append({"role": "model", "text": gm.get("narrative", "")})
                    st.session_state.stage = "result"
                else:
                    st.session_state.turn += 1
                    gm = call_gm(st.session_state.history, archetype, st.session_state.turn)
                    st.session_state.history.append({"role": "model", "text": gm.get("narrative", "")})
                    st.session_state.suggestions = gm.get("suggested_actions", [])
            st.rerun()

# ---- Result ----
else:
    archetype = ARCHETYPES[st.session_state.archetype_id]
    st.markdown("# 📜 終幕")
    st.write("断罪の夜は明け、あなたの物語は歴史となった。")

    log_text = "\n\n".join(
        [f'[{"令嬢" if m["role"]=="user" else "語り部"}] {m["text"]}' for m in st.session_state.history]
    )
    novel_prompt = generate_novel_prompt(st.session_state.history, archetype)

    c1, c2, c3 = st.columns([1, 1, 1])
    with c1:
        st.download_button("ログをダウンロード（.txt）", data=log_text.encode("utf-8"), file_name="villainess_log.txt", use_container_width=True)
    with c2:
        st.download_button("小説化プロンプトをDL（.md）", data=novel_prompt.encode("utf-8"), file_name="novel_prompt.md", use_container_width=True)
    with c3:
        if st.button("別の運命を歩む", use_container_width=True):
            reset_all()
            st.rerun()

    st.markdown("### プレイログ")
    st.text_area("（ここをCtrl+A → Ctrl+CでコピーもOK）", value=log_text, height=260)

    st.markdown("### 小説化プロンプト")
    st.text_area("（このままChatGPT等へコピペ）", value=novel_prompt, height=280)

    st.divider()
    st.markdown("### 悪役令嬢 性格診断")

    if st.button("診断する", use_container_width=True):
        with st.spinner("あなたの本性を暴いています…"):
            st.session_state.analysis = analyze_personality(st.session_state.history, archetype)
        st.rerun()

    if st.session_state.analysis:
        a = st.session_state.analysis
        st.subheader(a.get("rank", ""))
        st.write(f'**"{a.get("title", "")}"**')

        stats = a.get("stats", {})
        for k, v in stats.items():
            label = STAT_TRANSLATIONS.get(k, k)
            try:
                vv = int(v)
            except Exception:
                vv = 0
            st.write(f"{label}：{vv}/5")
            st.progress(max(0, min(1, vv / 5)))

        st.markdown("#### 批評")
        st.write(a.get("comment", "（診断コメントなし）"))
    elif st.session_state.analysis is None:
        st.caption("まだ診断していません。")
