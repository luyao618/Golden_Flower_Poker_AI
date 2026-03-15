# 角色立绘 + 背景图 UI 升级计划

> 本文档是游戏页面视觉升级的实施指南。
> 核心目标：将简单的 64px 圆形 emoji 头像替换为**全身赛博朋克角色立绘**，并添加沉浸式背景图。
> 前置条件：赛博朋克主题色已完成（见 `redesign-plan.md`）。

---

## 1. 设计决策总结

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 背景图处理 | `background-size: cover` 直接拉伸 | 1376×768 原图，暗色氛围下拉伸可接受 |
| 角色素材 | 转 WebP + 缩小至 800×800 | 原始 2048×2048 PNG 太大（2.4-3.5MB/张） |
| 角色分配 | 按座位索引固定分配 | 座位1→char-1, 座位2→char-2, ... |
| 人类玩家头像 | 完全移除 | 只显示手牌 + ActionPanel，不渲染头像 |
| 角色显示尺寸 | 大尺寸 ~300-400px（约35vh） | 有明显存在感，像真人坐在桌对面 |
| 角色位置 | 牌桌外侧/边缘 | 角色在桌外，牌和筹码在桌面上 |
| 信息展示 | 上方名字 + 下方筹码 | 名字在角色头顶，筹码在角色脚下 |
| 牌的位置 | 角色前方的桌面上 | 保持现有椭圆坐标，牌在桌面边缘 |

---

## 2. 当前架构分析

### 2.1 座位定位系统

当前使用百分比椭圆布局（`TableLayout.tsx:33-61`）：

```
椭圆参数：cx=50, cy=48, rx=43, ry=37
人类玩家：固定在底部中央（角度 PI/2 → 约 50%, 85%）
AI 玩家：从人类位置顺时针均匀分布在椭圆上
```

所有 UI 元素（头像、名字、筹码、牌）都围绕同一个椭圆点。

### 2.2 PlayerSeat 组件结构（PlayerSeat.tsx，320行）

```
<motion.div>  ← 整个座位容器，absolute + 百分比定位
  ├── <CardArea>  ← 牌，偏移40px朝向桌中心
  ├── <AvatarContainer>  ← 64px 圆形，带 NeonGlow
  │   ├── emoji (🤖/🧑)
  │   ├── Dealer badge ("D")
  │   └── AI badge ("AI")
  ├── <PlayerInfo>  ← 名字 + 筹码 + 状态标签
  ├── <ChatBubble>  ← 聊天气泡
  └── <ThinkingDots>  ← AI 思考动画
```

### 2.3 关键数据

- 游戏支持 **1-5 个 AI 对手**（含人类共 2-6 人）
- 有 **5 张角色立绘**正好对应最多 5 个 AI
- 角色素材均为 2048×2048 方形透明 PNG
- 背景图 1376×768（JPG 仅 236KB）
- 现有 `table-bg.png`（1024×1024，1.2MB）在项目中但**未使用**

---

## 3. 素材文件

### 3.1 原始素材位置

```
~/Downloads/GoldenFlowerPicV2/
├── 透明1.png   2048×2048  2.4MB  角色立绘1（透明背景）
├── 透明2.png   2048×2048  2.7MB  角色立绘2
├── 透明3.png   2048×2048  3.3MB  角色立绘3
├── 透明4.png   2048×2048  3.1MB  角色立绘4
├── 透明5.png   2048×2048  3.5MB  角色立绘5
├── 背景.png    1376×768   1.6MB  背景图（PNG，太大）
├── 背景.jpg    1376×768   236KB  背景图（JPG，推荐用这个）
└── 游戏背景加桌子无扑克.jpg  1024×1024  208KB  合成参考图（仅供参考，不使用）
```

### 3.2 目标文件结构

处理后放入项目：

```
frontend/src/assets/
├── game-bg.jpg              ← 从 背景.jpg 复制（236KB，无需转换）
├── characters/
│   ├── char-1.webp          ← 从 透明1.png 转换（800×800, ~300-500KB）
│   ├── char-2.webp          ← 从 透明2.png 转换
│   ├── char-3.webp          ← 从 透明3.png 转换
│   ├── char-4.webp          ← 从 透明4.png 转换
│   └── char-5.webp          ← 从 透明5.png 转换
├── table-bg.png             ← 已有，不动
├── result-bg.png            ← 已有，不动
└── lobby-bg.jpeg            ← 已有，不动
```

### 3.3 素材转换命令

```bash
# 创建目录
mkdir -p frontend/src/assets/characters

# 复制背景图
cp ~/Downloads/GoldenFlowerPicV2/背景.jpg frontend/src/assets/game-bg.jpg

# 转换角色立绘：缩小到 800×800 + 转 WebP
# macOS 方案（需要 cwebp，用 brew install webp 安装）：
for i in 1 2 3 4 5; do
  sips -Z 800 ~/Downloads/GoldenFlowerPicV2/透明${i}.png --out /tmp/char-${i}.png
  cwebp -q 90 -alpha_q 90 /tmp/char-${i}.png -o frontend/src/assets/characters/char-${i}.webp
done

# 如果没有 cwebp，可以直接用缩小后的 PNG（稍大但可行）：
for i in 1 2 3 4 5; do
  sips -Z 800 ~/Downloads/GoldenFlowerPicV2/透明${i}.png --out frontend/src/assets/characters/char-${i}.png
done
```

> **注意**：`sips -Z 800` 按最长边缩放到 800px，保持宽高比和透明通道。

---

## 4. 实施步骤

### Step 1: 素材准备

**目标**：将素材文件处理好并放入项目。

**操作**：执行上面 3.3 节的转换命令。

**验证**：
- `frontend/src/assets/game-bg.jpg` 存在（~236KB）
- `frontend/src/assets/characters/char-{1..5}.webp`（或 .png）存在
- 每个角色文件 < 500KB（如果用 WebP）或 < 1MB（如果用 PNG）

---

### Step 2: 背景图集成（GamePage.tsx）

**目标**：在游戏页面添加赛博朋克背景图层，底部渐变融入 `#06060f`。

**修改文件**：`frontend/src/pages/GamePage.tsx`

**具体改动**：

1. 导入背景图：
```tsx
import gameBg from '../assets/game-bg.jpg'
```

2. 在 `<main>` 容器内、ambient glow 之前，添加背景图层：

```tsx
{/* 背景图层 */}
<div
  className="absolute inset-0 z-0"
  style={{
    backgroundImage: `url(${gameBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
  }}
/>
{/* 底部渐变遮罩：让背景图底部淡出到 --bg-deepest */}
<div
  className="absolute inset-0 z-0"
  style={{
    background: 'linear-gradient(to bottom, transparent 40%, rgba(6,6,15,0.7) 60%, #06060f 80%)',
  }}
/>
```

3. 确保现有的 ambient glow、TableLayout 等元素的 z-index 在背景图之上。

**层级关系**（从底到顶）：

```
z-0:  背景图 + 底部渐变遮罩
z-0:  ambient glow（现有的四角径向渐变）
z-auto: TableLayout（CSS 牌桌）
z-10: GameLog, ChatPanel
z-20: PlayerSeat（座位）
z-30: 顶部 header 浮层
z-固定: 底部 ActionPanel footer
```

**验证**：
- 游戏页面可以看到赛博朋克酒吧/赌场背景
- 背景图底部平滑过渡到深色，CSS 牌桌自然融入
- 现有 UI 元素不被遮挡

---

### Step 3: 角色工具函数（theme.ts）

**目标**：添加角色图片映射函数。

**修改文件**：`frontend/src/utils/theme.ts`

**新增内容**：

```tsx
// 角色立绘映射
import char1 from '../assets/characters/char-1.webp'
import char2 from '../assets/characters/char-2.webp'
import char3 from '../assets/characters/char-3.webp'
import char4 from '../assets/characters/char-4.webp'
import char5 from '../assets/characters/char-5.webp'

const CHARACTER_IMAGES = [char1, char2, char3, char4, char5]

/**
 * 根据座位索引获取角色立绘
 * @param seatIndex 座位索引（0-based，在 AI 玩家中的顺序）
 * @returns 角色图片 URL
 */
export function getCharacterImage(seatIndex: number): string {
  return CHARACTER_IMAGES[seatIndex % CHARACTER_IMAGES.length]
}
```

> 如果用 PNG 而非 WebP，把 import 路径改成 `.png` 后缀。

**验证**：TypeScript 编译无错误。

---

### Step 4: 座位布局重构（TableLayout.tsx）

**目标**：分离「角色位置」和「牌位置」两组坐标。

**修改文件**：`frontend/src/components/Table/TableLayout.tsx`

**核心思路**：

当前每个座位只有一组坐标（椭圆上的一个点），所有元素都围绕这个点。

新布局需要两组坐标：
- **牌位置（cardPosition）**：保持现有椭圆坐标不变。牌和下注筹码显示在这里（桌面边缘）。
- **角色位置（characterPosition）**：向椭圆外侧偏移。角色立绘显示在这里（桌外）。

**具体改动**：

1. 修改 `calculateSeatPositions` 返回类型，或新增 `calculateCharacterPositions` 函数：

```tsx
interface SeatPositionSet {
  card: { left: number; top: number }       // 牌的位置（现有椭圆上）
  character: { left: number; top: number }   // 角色的位置（椭圆外侧）
}

function calculateSeatPositions(playerCount: number): SeatPositionSet[] {
  const cx = 50, cy = 48
  const cardRx = 43, cardRy = 37       // 牌位置（现有）
  const charRx = 56, charRy = 48       // 角色位置（外扩约13/11个百分点）
  // ↑ 这些数值需要实际调试。角色要在牌桌外边缘，不遮挡桌面。

  const positions: SeatPositionSet[] = []
  const startAngle = Math.PI / 2  // 从底部开始

  for (let i = 0; i < playerCount; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / playerCount

    positions.push({
      card: {
        left: Math.round((cx + cardRx * Math.cos(angle)) * 100) / 100,
        top: Math.round((cy + cardRy * Math.sin(angle)) * 100) / 100,
      },
      character: {
        left: Math.round((cx + charRx * Math.cos(angle)) * 100) / 100,
        top: Math.round((cy + charRy * Math.sin(angle)) * 100) / 100,
      },
    })
  }
  return positions
}
```

2. 将 `card` 坐标传给 PlayerSeat 用于定位牌和筹码。
3. 将 `character` 坐标传给 PlayerSeat 用于定位角色立绘。
4. 人类玩家（index 0）不需要 character 坐标。

**重要**：`charRx`/`charRy` 的值需要在浏览器中实际调试。初始值建议：
- `charRx = 56`（比牌的 43 大约 13 个点）
- `charRy = 48`（比牌的 37 大约 11 个点）
- 上方的座位角色位置可能需要更靠近顶部边缘

5. `playerPositions` 映射（用于动画）继续使用 `card` 坐标，不受影响。

**验证**：
- 现有牌和筹码位置不变
- 新增的 `character` 坐标在桌外合理位置

---

### Step 5: PlayerSeat 组件重构（核心）

**目标**：AI 玩家用大角色立绘替代 64px 圆形头像。人类玩家移除头像。

**修改文件**：`frontend/src/components/Player/PlayerSeat.tsx`

**新增 props**：

```tsx
interface PlayerSeatProps {
  // ... 现有 props
  characterPosition?: { left: number; top: number }  // 角色位置（仅 AI）
  seatIndex: number  // 座位索引，用于角色映射
}
```

**新的组件结构**：

```
<Fragment>
  {/* 1. 角色立绘容器（仅 AI 玩家） */}
  {!isHuman && (
    <motion.div style={{ position: 'absolute', left: characterPosition.left + '%', top: characterPosition.top + '%', transform: 'translate(-50%, -50%)' }}>

      {/* 名字（角色上方） */}
      <div className="text-center mb-1">
        <span className="text-sm font-bold">{player.name}</span>
        {isDealer && <DealerBadge />}
      </div>

      {/* 角色图片 */}
      <div className="relative" style={{ height: '35vh', maxHeight: '400px', minHeight: '200px' }}>
        <img
          src={getCharacterImage(seatIndex)}
          alt={player.name}
          className={clsx(
            'h-full w-auto object-contain select-none',
            isDimmed && 'opacity-40 grayscale-[0.5]',
            isActive && 'drop-shadow-[0_0_20px_rgba(0,212,255,0.4)]',
          )}
          loading="eager"
          draggable={false}
        />
        {/* 活跃玩家光效 */}
        {isActive && (
          <motion.div
            className="absolute inset-0"
            animate={{
              filter: [
                'drop-shadow(0 0 10px rgba(0,212,255,0.2))',
                'drop-shadow(0 0 25px rgba(0,212,255,0.5))',
                'drop-shadow(0 0 10px rgba(0,212,255,0.2))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {/* AI 思考动画（角色上方或旁边） */}
        {isThinking && <ThinkingDots />}
      </div>

      {/* 筹码信息（角色下方） */}
      <div className="text-center mt-1">
        <span className="text-[var(--color-gold)] font-mono text-sm">
          💰 {player.chips}
        </span>
        {statusLabel && <StatusBadge />}
        {roundBet > 0 && <BetAmount />}
      </div>

    </motion.div>
  )}

  {/* 2. 牌区域（所有玩家，使用 card position） */}
  <div style={{ position: 'absolute', left: cardPosition.left + '%', top: cardPosition.top + '%', transform: 'translate(-50%, -50%)' }}>
    <CardHand ... />
  </div>

  {/* 3. 聊天气泡 */}
  {chatMessage && <ChatBubble ... />}
</Fragment>
```

**关键设计要点**：

| 要点 | 处理方式 |
|------|----------|
| 角色尺寸 | `height: 35vh`，`max-height: 400px`，`min-height: 200px`。用 `object-contain` 保持比例 |
| 角色底部融合 | 可用 CSS `mask-image: linear-gradient(to bottom, black 70%, transparent 100%)` 让脚部淡出 |
| 非活跃/弃牌 | `opacity-40 grayscale-[0.5]`（与现有一致） |
| 活跃高亮 | 用 `filter: drop-shadow()` 而非 `box-shadow`（因为形状不规则） |
| 点击打开思维面板 | 保留：角色图片可点击（`cursor-pointer` + `onClick` → 打开 ThoughtDrawer） |
| 人类玩家 | 不渲染角色图片，不渲染名字/筹码（ActionPanel 已有这些信息），只保留手牌区域 |
| NeonGlow 组件 | 移除或重构。圆形 glow 不适合不规则角色。改用 `drop-shadow` |

**人类玩家处理**：

```tsx
{isHuman && (
  // 只渲染牌区域，位于底部中央
  <div style={{ position: 'absolute', left: cardPosition.left + '%', top: cardPosition.top + '%' }}>
    {/* 手牌 */}
    <CardHand ... />
    {/* 点击看牌提示 */}
    {canLook && <div className="animate-pulse">点击看牌</div>}
  </div>
)}
```

**验证**：
- AI 玩家显示大角色立绘
- 角色在牌桌外侧，不遮挡桌面
- 牌显示在桌面边缘（角色前方）
- 名字在角色上方，筹码在下方
- 人类玩家只显示手牌，无头像
- 活跃玩家有呼吸光效
- 弃牌玩家变灰
- 点击角色可打开思维面板

---

### Step 6: ChatBubble 适配

**目标**：聊天气泡位置适配大尺寸角色。

**修改文件**：`frontend/src/components/Player/ChatBubble.tsx`

**改动**：
- 气泡位置可能需要从角色上/下方改为**侧面**（左或右），避免被大角色遮挡
- 或者放在角色**头部上方**（需要足够的偏移量）
- 具体位置需要在浏览器中调试

---

### Step 7: 辅助调整

**7.1 动画组件（无需修改）**

以下组件使用 `playerPositions`（基于牌位置坐标），不受角色位置影响：
- `DealingAnimation.tsx` — 发牌目标是牌位置
- `ChipFlyAnimation.tsx` — 筹码飞向牌位置
- `WinChipAnimation.tsx` — 赢取筹码从牌位置飞出

**7.2 NeonGlow 组件处理**

两个选择（建议选 A）：
- A. **移除 NeonGlow 组件**，在角色图片上直接用 CSS `filter: drop-shadow()` 实现活跃光效
- B. 保留但重构为一个通用的光效包装器

**7.3 CompareSelector 适配**

比牌选择模式下，目标玩家需要高亮。改为给角色图片加边框/光效，而非给小圆形头像加。

```tsx
// 在比牌模式下，目标 AI 的角色图片：
className={clsx(
  isCompareTarget && 'cursor-pointer hover:scale-105 transition-transform',
  isCompareTarget && 'ring-2 ring-[var(--color-secondary)] drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]'
)}
```

---

### Step 8: 加载优化

**目标**：确保角色图片快速加载，不影响游戏体验。

**8.1 预加载**

在 `index.html` 中添加预加载提示（可选）：
```html
<link rel="preload" as="image" href="/src/assets/characters/char-1.webp" type="image/webp">
<!-- ... char-2 到 char-5 ... -->
```

或者在 GamePage 组件 mount 时用 JavaScript 预加载：
```tsx
useEffect(() => {
  CHARACTER_IMAGES.forEach(src => {
    const img = new Image()
    img.src = src
  })
}, [])
```

**8.2 加载占位**

角色图片加载中显示一个发光轮廓占位（可选增强）：
```tsx
const [loaded, setLoaded] = useState(false)
<img onLoad={() => setLoaded(true)} className={loaded ? 'opacity-100' : 'opacity-0'} />
{!loaded && <div className="animate-pulse bg-white/5 rounded-lg" style={{height:'35vh'}} />}
```

---

### Step 9: 视觉微调

这一步在所有功能完成后进行，在浏览器中实际调试：

1. **角色间距**：在不同玩家数量（2人/3人/4人/5人/6人）下检查角色是否重叠
2. **charRx/charRy 值调整**：通过浏览器 DevTools 调试最佳的外扩椭圆参数
3. **角色尺寸微调**：在 1920×1080 和 2560×1440 分辨率下检查
4. **背景渐变过渡**：调整渐变比例让背景图底部与牌桌融合得更自然
5. **色调一致性**：如果角色立绘色调与背景差异太大，用 CSS `filter` 微调（如 `brightness(0.9)` 或 `hue-rotate()`）

---

## 5. 文件修改总览

| 文件 | 类型 | 改动量 | 说明 |
|------|------|--------|------|
| `frontend/src/assets/game-bg.jpg` | **新增** | — | 背景图（从素材复制） |
| `frontend/src/assets/characters/char-{1-5}.webp` | **新增** | — | 角色立绘（转换后） |
| `frontend/src/pages/GamePage.tsx` | 修改 | 小 | 添加背景图层 + 渐变遮罩（约+15行） |
| `frontend/src/utils/theme.ts` | 修改 | 小 | 新增 `getCharacterImage()` 函数（约+15行） |
| `frontend/src/components/Table/TableLayout.tsx` | 修改 | 中 | 分离角色/牌双坐标系统（约+30行改动） |
| `frontend/src/components/Player/PlayerSeat.tsx` | **重构** | 大 | 角色立绘替代圆形头像（约重写 50%） |
| `frontend/src/components/Player/ChatBubble.tsx` | 修改 | 小 | 位置适配 |

**不需要修改的文件**：
- `DealingAnimation.tsx` — 使用牌坐标，不受影响
- `ChipFlyAnimation.tsx` — 同上
- `WinChipAnimation.tsx` — 同上
- `ActionPanel.tsx` — 独立于座位渲染
- `PotDisplay.tsx` — 独立于座位渲染
- `CardFace.tsx` / `CardHand.tsx` — 牌的渲染不变
- `index.css` — 可能不需要改（除非添加角色相关动画类）

---

## 6. 实施顺序建议

```
Step 1: 素材准备（5分钟）
  ↓
Step 2: 背景图集成（10分钟）← 最快看到效果
  ↓
Step 3: 角色工具函数（5分钟）
  ↓
Step 4: 座位布局重构（20分钟）← 架构关键
  ↓
Step 5: PlayerSeat 重构（40分钟）← 核心工作量
  ↓
Step 6-7: ChatBubble + 辅助调整（15分钟）
  ↓
Step 8: 加载优化（10分钟）
  ↓
Step 9: 视觉微调（在浏览器中调试）
```

总预估：约 2 小时

---

## 7. 给 AI Session 的指令模板

```
请先阅读以下文件了解上下文：
1. docs/character-upgrade-plan.md — 完整实施计划（你正在看的这个）
2. docs/design-system.md — 设计规范（色板、CSS变量）

本次升级的核心目标：
- 将 64px 圆形 emoji 头像替换为全身赛博朋克角色立绘（300-400px高）
- 添加赛博朋克背景图
- 角色在牌桌外侧，牌在桌面上
- 人类玩家不要头像，只显示手牌

注意：
- 只改视觉/布局，不改游戏逻辑
- 所有 UI 文字保持简体中文
- 使用 CSS 自定义属性（var(--color-xxx)）
- 角色素材在 frontend/src/assets/characters/ 目录下

请按 Step 1 到 Step 9 的顺序执行。
```

---

## 8. 验收标准

- [ ] 游戏页面有赛博朋克背景图，底部自然融入深色牌桌
- [ ] AI 对手显示大角色立绘（~300-400px高）
- [ ] 角色在牌桌外侧边缘
- [ ] 名字在角色上方，筹码在角色下方
- [ ] 牌显示在桌面上（角色前方）
- [ ] 人类玩家无头像，只有手牌
- [ ] 活跃玩家角色有呼吸光效
- [ ] 弃牌/淘汰玩家角色变灰变暗
- [ ] 点击 AI 角色可打开思维面板
- [ ] 比牌模式下目标角色有高亮
- [ ] 发牌/筹码飞行等动画正常工作
- [ ] 2-6 人游戏中角色布局合理，不严重重叠
- [ ] `npm run dev` 无控制台错误
- [ ] `npm run build` 正常完成
