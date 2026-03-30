import { useEffect } from 'react';
import {
  EMOTES,
  TOTAL_WAVES,
  RANDOM_TOWER_COST,
  TIER_NAMES,
  type PlacementFailureReason,
  type TowerDef,
} from '@gld/shared';
import { EventBus } from '@gld/phaser-game';
import { uiMobileArt } from '../assets/uiMobileArt';
import { EmoteBubble } from '../components/EmoteBubble';
import { EmotePanel } from '../components/EmotePanel';
import { PixelButton } from '../components/ui/PixelButton';
import { PhaserGame } from '../game/PhaserGame';
import { useEmoteStore } from '../stores/emoteStore';
import { useGameStore } from '../stores/gameStore';
import type { FieldTab } from '../stores/gameStore';
import { colors } from '../styles/tokens';

const feedbackCopy: Record<PlacementFailureReason, string> = {
  combat_phase: '건설 페이즈 전용입니다. 다음 준비 시간을 기다려주세요.',
  insufficient_gold: '골드가 부족합니다.',
  occupied: '해당 타일이 막혀있습니다. 다른 위치를 선택하세요.',
  blocked_path: '해당 배치는 적의 경로를 차단합니다.',
  out_of_bounds: '전장 그리드 안을 탭하세요.',
};

const TIER_COLORS: Record<number, string> = {
  1: '#aaaaaa',
  2: '#5bc8e8',
  3: '#c8a04a',
  4: '#9060e0',
  5: '#ffe870',
};

function formatWaveLabel(wave: number, totalWaves: number) {
  return Math.min(totalWaves, Math.max(1, wave || 1));
}

export function GamePage() {
  const runId = useGameStore((s) => s.runId);
  const runStatus = useGameStore((s) => s.runStatus);
  const gameReady = useGameStore((s) => s.gameReady);
  const lives = useGameStore((s) => s.lives);
  const gold = useGameStore((s) => s.gold);
  const wave = useGameStore((s) => s.wave);
  const countdown = useGameStore((s) => s.countdown);
  const placementFeedback = useGameStore((s) => s.placementFeedback);
  const rolledTower = useGameStore((s) => s.rolledTower);
  const activeTab = useGameStore((s) => s.activeTab);
  const opponentHp = useGameStore((s) => s.opponentHp);
  const opponentGold = useGameStore((s) => s.opponentGold);
  const opponentTowerCount = useGameStore((s) => s.opponentTowerCount);
  const setRunStatus = useGameStore((s) => s.setRunStatus);
  const setLives = useGameStore((s) => s.setLives);
  const setGold = useGameStore((s) => s.setGold);
  const setWave = useGameStore((s) => s.setWave);
  const setWavePhase = useGameStore((s) => s.setWavePhase);
  const setCountdown = useGameStore((s) => s.setCountdown);
  const setPlacementFeedback = useGameStore((s) => s.setPlacementFeedback);
  const setRolledTower = useGameStore((s) => s.setRolledTower);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const setOpponentState = useGameStore((s) => s.setOpponentState);
  const resetRun = useGameStore((s) => s.resetRun);
  const enterLobby = useGameStore((s) => s.enterLobby);
  const myEmote = useEmoteStore((s) => s.myEmote);
  const opponentEmote = useEmoteStore((s) => s.opponentEmote);
  const receiveEmote = useEmoteStore((s) => s.receiveEmote);
  const clearMyEmote = useEmoteStore((s) => s.clearMyEmote);
  const clearOpponentEmote = useEmoteStore((s) => s.clearOpponentEmote);

  const totalWaves = TOTAL_WAVES;

  useEffect(() => {
    const onDamaged = (data: { remainingHp: number }) => setLives(data.remainingHp);
    const onGoldChanged = (data: { gold: number }) => setGold(data.gold);
    const onGameOver = (data: { winnerId: string }) => {
      setRunStatus(data.winnerId === 'local' ? 'victory' : 'defeat');
    };
    const onWaveStarted = (data: { wave: number }) => {
      setWave(data.wave);
      setWavePhase('combat');
      setRunStatus('combat');
      setPlacementFeedback(null);
    };
    const onBuildingPhase = (data: { nextWave: number; countdown: number }) => {
      setWave(data.nextWave);
      setWavePhase('building');
      setRunStatus('building');
      setCountdown(data.countdown);
    };
    const onCountdownTick = (data: { secondsLeft: number }) => setCountdown(data.secondsLeft);
    const onTowerPlaced = (data: { success: boolean; reason?: PlacementFailureReason }) => {
      setPlacementFeedback(data.success ? null : data.reason ?? 'occupied');
      if (data.success) {
        setRolledTower(null);
      }
    };

    const setWavePreview = useGameStore.getState().setWavePreview;
    const onWavePreview = (data: { groups: Array<{ unitId: string; unitName: string; count: number }> }) => {
      setWavePreview(data.groups);
    };
    const onWaveStartedClearPreview = () => {
      setWavePreview(null);
    };

    const onRandomTowerRolled = (data: { towerId: string; towerDef: TowerDef }) => {
      setRolledTower(data.towerDef);
    };

    const onOpponentState = (data: { gold: number; hp: number; towerCount: number }) => {
      setOpponentState(data);
    };
    const onEmoteReceived = (data: { emoteId: string; playerId: string }) => {
      if (data.playerId !== 'opponent') return;
      receiveEmote(data.emoteId);
    };

    EventBus.on('player-damaged', onDamaged);
    EventBus.on('gold-changed', onGoldChanged);
    EventBus.on('game-over', onGameOver);
    EventBus.on('wave-started', onWaveStarted);
    EventBus.on('building-phase-started', onBuildingPhase);
    EventBus.on('countdown-tick', onCountdownTick);
    EventBus.on('tower-placed', onTowerPlaced);
    EventBus.on('wave-preview', onWavePreview);
    EventBus.on('wave-started', onWaveStartedClearPreview);
    EventBus.on('random-tower-rolled', onRandomTowerRolled);
    EventBus.on('opponent-state', onOpponentState);
    EventBus.on('emote-received', onEmoteReceived);

    return () => {
      EventBus.off('player-damaged', onDamaged);
      EventBus.off('gold-changed', onGoldChanged);
      EventBus.off('game-over', onGameOver);
      EventBus.off('wave-started', onWaveStarted);
      EventBus.off('building-phase-started', onBuildingPhase);
      EventBus.off('countdown-tick', onCountdownTick);
      EventBus.off('tower-placed', onTowerPlaced);
      EventBus.off('wave-preview', onWavePreview);
      EventBus.off('wave-started', onWaveStartedClearPreview);
      EventBus.off('random-tower-rolled', onRandomTowerRolled);
      EventBus.off('opponent-state', onOpponentState);
      EventBus.off('emote-received', onEmoteReceived);
    };
  }, [
    setCountdown,
    setGold,
    setLives,
    setOpponentState,
    setPlacementFeedback,
    receiveEmote,
    setRolledTower,
    setRunStatus,
    setWave,
    setWavePhase,
  ]);

  const feedbackText = placementFeedback ? feedbackCopy[placementFeedback] : null;
  const resultTitle = runStatus === 'victory' ? '방어 성공' : '방어 실패';

  useEffect(() => {
    if (!myEmote) return;
    EventBus.emit('send-emote', { emoteId: myEmote.id });

    const aiResponse = EMOTES[Math.floor(Math.random() * EMOTES.length)];
    const timer = window.setTimeout(() => {
      EventBus.emit('emote-received', { emoteId: aiResponse.id, playerId: 'opponent' });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [myEmote]);

  const tabStyle = (tab: FieldTab) => ({
    flex: 1,
    padding: '8px 12px',
    fontSize: '8px',
    background: activeTab === tab ? 'rgba(200,160,74,0.2)' : 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : '2px solid transparent',
    color: activeTab === tab ? colors.gold : colors.textSecondary,
    cursor: 'pointer' as const,
  });

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        background:
          'radial-gradient(circle at top, rgba(200,160,74,0.2), transparent 24%), linear-gradient(180deg, #1a1208 0%, #2a2010 48%, #0f0a04 100%)',
        padding: '8px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 460px)',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '28px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          background: 'linear-gradient(180deg, rgba(26,18,8,0.98) 0%, rgba(42,32,16,0.98) 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '14px 14px 12px',
            borderBottom: `1px solid rgba(148, 161, 178, 0.22)`,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: colors.accent, fontSize: '8px' }}>팔라스 개인랜덤타워디펜스</span>
              <span style={{ color: colors.textSecondary, fontSize: '8px' }}>
                웨이브 {formatWaveLabel(wave, totalWaves)}/{totalWaves}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 10px', borderRadius: '14px', background: 'rgba(229,49,112,0.12)', color: colors.danger, fontSize: '8px' }}>
                HP {lives}
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '14px', background: 'rgba(226,183,20,0.12)', color: colors.gold, fontSize: '8px' }}>
                골드 {gold}
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '14px', background: 'rgba(200,160,74,0.14)', color: colors.text, fontSize: '8px' }}>
                {runStatus === 'building' && `건설 ${countdown}s`}
                {runStatus === 'combat' && '전투'}
                {runStatus === 'victory' && '승리'}
                {runStatus === 'defeat' && '패배'}
              </div>
            </div>
          </div>

          <PixelButton
            variant="danger"
            style={{ fontSize: '8px', padding: '8px 12px', minWidth: 'auto' }}
            onClick={enterLobby}
          >
            나가기
          </PixelButton>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(148, 161, 178, 0.15)' }}>
          <button type="button" style={tabStyle('player')} onClick={() => setActiveTab('player')}>
            내 필드
          </button>
          <button type="button" style={tabStyle('opponent')} onClick={() => setActiveTab('opponent')}>
            상대 필드
          </button>
        </div>

        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {activeTab === 'player' ? (
            <>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3 / 2',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: `1px solid rgba(127, 90, 240, 0.22)`,
                  background: '#0b0d17',
                }}
              >
                <PhaserGame key={runId} />

                {!gameReady && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(4, 5, 12, 0.72)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.textSecondary,
                      fontSize: '9px',
                      zIndex: 2,
                    }}
                  >
                    그리드 부팅 중...
                  </div>
                )}

                {myEmote && (
                  <EmoteBubble
                    emoteId={myEmote.id}
                    onDone={clearMyEmote}
                    position="right"
                  />
                )}

                {opponentEmote && (
                  <EmoteBubble
                    emoteId={opponentEmote.id}
                    onDone={clearOpponentEmote}
                    position="left"
                  />
                )}

                {(runStatus === 'victory' || runStatus === 'defeat') && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 3,
                      background: 'rgba(6, 8, 16, 0.82)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        padding: '20px',
                        borderRadius: '20px',
                        background: 'rgba(12, 15, 26, 0.96)',
                        border: `1px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        textAlign: 'center',
                      }}
                    >
                      <h2
                        style={{
                          color: runStatus === 'victory' ? colors.success : colors.danger,
                          fontSize: '12px',
                        }}
                      >
                        {resultTitle}
                      </h2>
                      <p style={{ color: colors.textSecondary, fontSize: '8px', lineHeight: 1.8 }}>
                        {runStatus === 'victory'
                          ? '상대를 물리치고 왕국을 지켰습니다!'
                          : '방어선이 무너졌습니다.'}
                      </p>
                      <PixelButton variant="gold" style={{ width: '100%' }} onClick={resetRun}>
                        다시 시작
                      </PixelButton>
                      <PixelButton variant="secondary" style={{ width: '100%' }} onClick={enterLobby}>
                        로비로 돌아가기
                      </PixelButton>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  borderRadius: '24px',
                  padding: '14px',
                  border: `1px solid rgba(148, 161, 178, 0.2)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#0b101a',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(180deg, rgba(8,11,20,0.42) 0%, rgba(8,11,20,0.22) 24%, rgba(7,9,18,0.82) 100%), url(${uiMobileArt.tacticalDockBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.96,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ color: colors.text, fontSize: '8px' }}>전술 독</span>
                      <span style={{ color: colors.textSecondary, fontSize: '8px' }}>
                        타워를 구매한 후 그리드를 탭하여 배치하세요. 같은 타워를 드래그하여 합성!
                      </span>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <EmotePanel />
                    </div>
                  </div>

                  {feedbackText && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: 'rgba(229,49,112,0.12)',
                        color: colors.text,
                        fontSize: '8px',
                        lineHeight: 1.8,
                      }}
                    >
                      {feedbackText}
                    </div>
                  )}

                  {rolledTower && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: `${TIER_COLORS[rolledTower.tier] ?? '#aaa'}18`,
                        border: `1px solid ${TIER_COLORS[rolledTower.tier] ?? '#aaa'}44`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          border: `1px solid ${TIER_COLORS[rolledTower.tier] ?? '#aaa'}`,
                          backgroundImage: `url(/assets/towers/${rolledTower.id}.png)`,
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '24px 24px',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '8px', color: TIER_COLORS[rolledTower.tier] ?? '#aaa' }}>
                          [{TIER_NAMES[rolledTower.tier]?.toUpperCase()}]
                        </span>
                        <span style={{ fontSize: '9px', color: colors.text }}>{rolledTower.name}</span>
                        <span style={{ fontSize: '7px', color: colors.textSecondary }}>
                          DMG {rolledTower.stats.damage} | RNG {rolledTower.stats.range} | SPD {rolledTower.stats.attackSpeed}
                          {rolledTower.stats.special ? ` | ${rolledTower.stats.special}` : ''}
                        </span>
                      </span>
                    </div>
                  )}

                  {runStatus === 'building' && useGameStore.getState().wavePreview && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '14px',
                        background: 'rgba(200,160,74,0.08)',
                        border: '1px solid rgba(200,160,74,0.2)',
                        color: colors.textSecondary,
                        fontSize: '8px',
                        lineHeight: 1.8,
                      }}
                    >
                      <span style={{ color: colors.gold, marginRight: '6px' }}>다음 웨이브:</span>
                      {useGameStore.getState().wavePreview!.map((g, i) => (
                        <span key={g.unitId}>
                          {i > 0 && ', '}
                          {g.unitName} x{g.count}
                        </span>
                      ))}
                    </div>
                  )}

                  <PixelButton
                    variant="gold"
                    style={{ width: '100%', padding: '14px 16px', fontSize: '9px' }}
                    onClick={() => EventBus.emit('request-buy-random-tower')}
                    disabled={runStatus !== 'building' || gold < RANDOM_TOWER_COST || rolledTower !== null}
                  >
                    {rolledTower ? '배치 대기 중...' : `타워 구매 ${RANDOM_TOWER_COST}G`}
                  </PixelButton>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '18px',
                      padding: '8px',
                      background: 'rgba(4,6,12,0.34)',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `linear-gradient(90deg, rgba(8,11,20,0.92) 0%, rgba(8,11,20,0.5) 46%, rgba(8,11,20,0.84) 100%), url(${uiMobileArt.ctaPointArt})`,
                        backgroundSize: 'cover',
                        backgroundPosition: '78% center',
                        opacity: 0.68,
                      }}
                    />
                    <PixelButton
                      variant="gold"
                      style={{ flex: 1, padding: '14px 16px', fontSize: '9px', position: 'relative', zIndex: 1 }}
                      onClick={() => EventBus.emit('request-start-wave')}
                      disabled={runStatus !== 'building'}
                    >
                      {runStatus === 'building' ? '웨이브 시작' : '웨이브 대기'}
                    </PixelButton>
                    <PixelButton
                      variant="secondary"
                      style={{ flex: 1, padding: '14px 16px', fontSize: '9px', position: 'relative', zIndex: 1 }}
                      onClick={resetRun}
                    >
                      초기화
                    </PixelButton>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Opponent tab */
            <div
              style={{
                borderRadius: '24px',
                padding: '20px',
                border: `1px solid rgba(148, 161, 178, 0.2)`,
                background: '#0b101a',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <span style={{ color: colors.text, fontSize: '10px' }}>AI 상대 정보</span>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(229,49,112,0.12)', color: colors.danger, fontSize: '9px' }}>
                  HP {opponentHp}
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(226,183,20,0.12)', color: colors.gold, fontSize: '9px' }}>
                  골드 {opponentGold}
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(200,160,74,0.14)', color: colors.text, fontSize: '9px' }}>
                  타워 {opponentTowerCount}
                </div>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '8px', lineHeight: 1.8 }}>
                AI 상대는 자동으로 타워를 구매하고 배치합니다. 킬 트랜스퍼로 상대 필드에 유닛을 보내세요!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
