const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TARGET_CHANNEL_ID = '933182459208683530';

// 最新のデータを保持する変数
let latestData = {
  url: null,
  type: null,
  author_id: null,
  message_id: null,
  created_at: null
};

// 過去の履歴を保持する配列
const historyData = [];

// Discordクライアントの初期化（アップデート確認などを無効化して安定させる設定）
const client = new Client({ checkUpdate: false });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// メッセージ受信時の処理
client.on('messageCreate', (message) => {
  // 対象チャンネル以外のメッセージは無視
  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  const content = message.content;
  console.log(`New message received: ${content}`);

  // 正規表現でURL、タイプ、投稿者IDを抽出
  const urlMatch = content.match(/<https?:\/\/[^\s>]+>/);
  const typeMatch = content.match(/\(([^)]+)\)/);
  const authorMatch = content.match(/by\s+<@!?(\d+)>/);

  if (urlMatch) {
    const rawUrl = urlMatch[0].slice(1, -1);
    const type = typeMatch ? typeMatch[1] : 'unknown';
    const authorId = authorMatch ? authorMatch[1] : message.author.id;

    const data = {
      url: rawUrl,
      type: type,
      author_id: authorId,
      message_id: message.id,
      created_at: message.createdAt
    };

    // 最新データを更新
    latestData = data;

    // 履歴に追加（上限50件）
    historyData.unshift(data);
    if (historyData.length > 50) {
      historyData.pop();
    }

    console.log('Extracted and saved data:', data);
  }
});

// APIエンドポイント: 最新のURL情報を取得
app.get('/api/latest', (req, res) => {
  if (!latestData.url) {
    return res.status(404).json({ error: 'No data found yet' });
  }
  res.json(latestData);
});

// APIエンドポイント: 履歴を取得
app.get('/api/history', (req, res) => {
  res.json(historyData);
});

// ヘルスチェック用
app.get('/', (req, res) => {
  res.send('Discord Selfbot API is running');
});

// サーバー起動（クラウド環境向けに '0.0.0.0' を明示）
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// Discordにログイン
// 環境変数 DISCORD_TOKEN があればそれを使い、なければ右側の文字列を使用する
const token = process.env.DISCORD_TOKEN || "MTUzNjIxNjM1MTMzNTY0OTM1Mg.Gnnuyv.I6sCzgjM74hCLenZcZWHhAikoCoZWD-8HZmKlg";

if (!token || token === "your_token_here") {
  console.error('⚠️ 警告: トークンが正しく設定されていません。APIサーバーは起動しますが、Discordの監視は行われません。');
} else {
  // 万が一ログインエラーになっても、強制終了させずにエラーログだけ出す
  client.login(token).catch(error => {
    console.error('Discord login failed:', error);
  });
}

