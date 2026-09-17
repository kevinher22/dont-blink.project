import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, SkinId, UserSettings, DailyChallenge } from './types';
import { GameEngine } from './game/engine';
import { storage } from './services/storage';
import { sound } from './services/audio';
import { analytics } from './services/analytics';
import { leaderboardService } from './services/leaderboard';
import { INITIAL_ACHIEVEMENTS } from './game/constants';

import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { CustomizeModal } from './components/CustomizeModal';
import { DailyChallengeModal } from './components/DailyChallengeModal';
import { AchievementsModal } from './components/AchievementsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';
import { AchievementToast } from './components/AchievementToast';

export default function App() {
  // State Machine
  const [gameState, setGameState] = useState<GameState>('MENU');

  // Game Engine Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistent User Data State
  const [bestScore, setBestScore] = useState<number>(0);
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('default');
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(['default']);
  const [settings, setSettings] = useState<UserSettings>({
    soundEnabled: true,
    musicEnabled: true,
    reducedMotion: false,
  });
  const [achievementsMap, setAchievementsMap] = useState<Record<string, { unlocked: boolean; unlockedAt?: number }>>({});

  // Active Run HUD State
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [coinsEarnedRun, setCoinsEarnedRun] = useState<number>(0);
  const [showTutorialHint, setShowTutorialHint] = useState<boolean>(false);

  // Game Over Results
  const [finalRunResult, setFinalRunResult] = useState<{
    score: number;
    bestScore: number;
    combo: number;
    coins: number;
    isNewRecord: boolean;
  }>({
    score: 0,
    bestScore: 0,
    combo: 0,
    coins: 0,
    isNewRecord: false,
  });

  // Daily Challenge State
  const todayKey = new Date().toISOString().split('T')[0];
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(() =>
    storage.getDailyChallenge(todayKey)
  );

  // Achievement Toast Notification
  const [activeToast, setActiveToast] = useState<{ title: string; description: string } | null>(null);

  // Load Initial Persistent Data
  useEffect(() => {
    const data = storage.getData();
    setBestScore(data.bestScore);
    setTotalCoins(data.coins);
    setSelectedSkin(data.selectedSkin);
    setUnlockedSkins(data.unlockedSkins);
    setSettings(data.settings);
    setAchievementsMap(data.achievements);
    setDailyChallenge(storage.getDailyChallenge(todayKey));
  }, [todayKey]);

  // Check & Unlock Achievement helper
  const unlockAchievement = useCallback((id: string) => {
    const unlocked = storage.unlockAchievement(id);
    if (unlocked) {
      sound.playAchievement();
      const meta = INITIAL_ACHIEVEMENTS.find((a) => a.id === id);
      if (meta) {
        setActiveToast({ title: meta.title, description: meta.description });
      }
      setAchievementsMap({ ...storage.getData().achievements });
      analytics.logEvent('achievement_unlocked', { achievement_id: id });
    }
  }, []);

  // Update Daily Challenge progress helper
  const updateDailyProgress = useCallback((val: number) => {
    const { completedNow } = storage.updateDailyProgress(todayKey, val);
    const updated = storage.getDailyChallenge(todayKey);
    setDailyChallenge(updated);

    if (completedNow) {
      sound.playAchievement();
      setActiveToast({
        title: 'Daily Challenge Complete!',
        description: `Mission finished: ${updated.title}`,
      });
      analytics.logEvent('daily_challenge_completed');
    }
  }, [todayKey]);

  // Keep gameState in ref for callbacks/resize
  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Keep game callbacks in ref to avoid engine teardown on state/prop changes
  const callbacksRef = useRef({
    onScoreUpdate: (score: number, combo: number, multiplier: number) => {
      setCurrentScore(score);
      setCurrentCombo(combo);
      setCurrentMultiplier(multiplier);
    },
    onCoinCollected: (_coinsTotal: number, earned: number) => {
      setCoinsEarnedRun((prev) => prev + earned);
      storage.addCoins(earned);
      setTotalCoins(storage.getData().coins);

      const totalEarnedSoFar = storage.getData().stats.totalCoinsCollected;
      if (totalEarnedSoFar >= 50) {
        unlockAchievement('coin_collector');
      }
    },
    onNewRecord: (_score: number) => {
      unlockAchievement('record_breaker');
    },
    onAchievementProgress: (event: string, value: number) => {
      if (event === 'game_started') {
        unlockAchievement('first_run');
      } else if (event === 'current_score') {
        if (value >= 100) unlockAchievement('century');
        if (value >= 1000) unlockAchievement('high_roller');
        if (dailyChallenge.targetType === 'score') {
          updateDailyProgress(value);
        }
      } else if (event === 'survival_time') {
        if (value >= 30) unlockAchievement('speedrunner');
        if (dailyChallenge.targetType === 'time') {
          updateDailyProgress(Math.floor(value));
        }
      } else if (event === 'max_combo') {
        if (value >= 6) unlockAchievement('combo_master');
        if (dailyChallenge.targetType === 'combo') {
          updateDailyProgress(value);
        }
      } else if (event === 'coins_collected') {
        if (dailyChallenge.targetType === 'coins') {
          updateDailyProgress(value);
        }
      } else if (event === 'obstacles_dodged') {
        if (value >= 5) {
          unlockAchievement('no_hit');
        }
      }
    },
    onGameOver: (score: number, maxCombo: number, coinsEarned: number, durationSec: number) => {
      const prevBest = storage.getData().bestScore;
      const isNewRecord = storage.updateBestScore(score);
      const newBest = storage.getData().bestScore;

      // Submit to Leaderboard Architecture
      leaderboardService.submitScore({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        score,
        combo: maxCombo,
        durationSeconds: durationSec,
        coinsEarned,
        timestamp: Date.now(),
        skinUsed: selectedSkin,
      });

      analytics.logEvent('game_over', { score, combo: maxCombo, coins: coinsEarned });

      setBestScore(newBest);
      setFinalRunResult({
        score,
        bestScore: newBest,
        combo: maxCombo,
        coins: coinsEarned,
        isNewRecord: isNewRecord && prevBest > 0,
      });

      setGameState('GAME_OVER');
    },
  });

  // Keep callbacks ref updated with current closure values
  useEffect(() => {
    callbacksRef.current = {
      onScoreUpdate: (score: number, combo: number, multiplier: number) => {
        setCurrentScore(score);
        setCurrentCombo(combo);
        setCurrentMultiplier(multiplier);
      },
      onCoinCollected: (_coinsTotal: number, earned: number) => {
        setCoinsEarnedRun((prev) => prev + earned);
        storage.addCoins(earned);
        setTotalCoins(storage.getData().coins);

        const totalEarnedSoFar = storage.getData().stats.totalCoinsCollected;
        if (totalEarnedSoFar >= 50) {
          unlockAchievement('coin_collector');
        }
      },
      onNewRecord: (_score: number) => {
        unlockAchievement('record_breaker');
      },
      onAchievementProgress: (event: string, value: number) => {
        if (event === 'game_started') {
          unlockAchievement('first_run');
        } else if (event === 'current_score') {
          if (value >= 100) unlockAchievement('century');
          if (value >= 1000) unlockAchievement('high_roller');
          if (dailyChallenge.targetType === 'score') {
            updateDailyProgress(value);
          }
        } else if (event === 'survival_time') {
          if (value >= 30) unlockAchievement('speedrunner');
          if (dailyChallenge.targetType === 'time') {
            updateDailyProgress(Math.floor(value));
          }
        } else if (event === 'max_combo') {
          if (value >= 6) unlockAchievement('combo_master');
          if (dailyChallenge.targetType === 'combo') {
            updateDailyProgress(value);
          }
        } else if (event === 'coins_collected') {
          if (dailyChallenge.targetType === 'coins') {
            updateDailyProgress(value);
          }
        } else if (event === 'obstacles_dodged') {
          if (value >= 5) {
            unlockAchievement('no_hit');
          }
        }
      },
      onGameOver: (score: number, maxCombo: number, coinsEarned: number, durationSec: number) => {
        const prevBest = storage.getData().bestScore;
        const isNewRecord = storage.updateBestScore(score);
        const newBest = storage.getData().bestScore;

        leaderboardService.submitScore({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          score,
          combo: maxCombo,
          durationSeconds: durationSec,
          coinsEarned,
          timestamp: Date.now(),
          skinUsed: selectedSkin,
        });

        analytics.logEvent('game_over', { score, combo: maxCombo, coins: coinsEarned });

        setBestScore(newBest);
        setFinalRunResult({
          score,
          bestScore: newBest,
          combo: maxCombo,
          coins: coinsEarned,
          isNewRecord: isNewRecord && prevBest > 0,
        });

        setGameState('GAME_OVER');
      },
    };
  });

  // Initialize Game Engine ONCE on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onScoreUpdate: (...args) => callbacksRef.current.onScoreUpdate(...args),
      onCoinCollected: (...args) => callbacksRef.current.onCoinCollected(...args),
      onNewRecord: (...args) => callbacksRef.current.onNewRecord(...args),
      onAchievementProgress: (...args) => callbacksRef.current.onAchievementProgress(...args),
      onGameOver: (...args) => callbacksRef.current.onGameOver(...args),
    });

    engine.setPersonalBest(storage.getData().bestScore);
    engine.setSkin(storage.getData().selectedSkin);
    engine.setReducedMotion(storage.getData().settings.reducedMotion);
    engineRef.current = engine;

    engine.setupCanvasDimensions();
    engine.renderMenuPreview();

    // Resize Observer to keep crisp aspect ratio on screen changes
    const resizeObserver = new ResizeObserver(() => {
      engine.setupCanvasDimensions();
      if (gameStateRef.current === 'MENU') {
        engine.renderMenuPreview();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      engine.stop();
      resizeObserver.disconnect();
    };
  }, []);

  // Continuous Menu Preview Animation Loop (only while in MENU state)
  useEffect(() => {
    if (gameState !== 'MENU') return;

    let animId: number;
    const loop = () => {
      if (engineRef.current && gameStateRef.current === 'MENU') {
        engineRef.current.renderMenuPreview();
        animId = requestAnimationFrame(loop);
      }
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState]);

  // Sync settings/skins to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSkin(selectedSkin);
      engineRef.current.setPersonalBest(bestScore);
      engineRef.current.setReducedMotion(settings.reducedMotion);
    }
  }, [selectedSkin, bestScore, settings.reducedMotion]);

  // Start a new run
  const handleStartGame = useCallback(() => {
    sound.playClick();
    setCurrentScore(0);
    setCurrentCombo(0);
    setCurrentMultiplier(1);
    setCoinsEarnedRun(0);
    setGameState('PLAYING');

    // Show tutorial hint for 3.2 seconds
    setShowTutorialHint(true);
    setTimeout(() => {
      setShowTutorialHint(false);
      storage.markTutorialCompleted();
    }, 3200);

    if (engineRef.current) {
      engineRef.current.setPersonalBest(storage.getData().bestScore);
      engineRef.current.setSkin(selectedSkin);
      engineRef.current.start();
    }

    analytics.logEvent('game_started');
  }, [selectedSkin]);

  // Action / Tap / Jump handler
  const handlePlayerAction = useCallback((e?: React.SyntheticEvent | KeyboardEvent) => {
    if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (gameState === 'PLAYING') {
      if (engineRef.current) {
        engineRef.current.handleAction();
      }
    } else if (gameState === 'GAME_OVER') {
      handleStartGame();
    } else if (gameState === 'MENU') {
      handleStartGame();
    }
  }, [gameState, handleStartGame]);

  // Keyboard Event Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayerAction(e);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          sound.playClick();
          engineRef.current?.pause();
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          sound.playClick();
          engineRef.current?.resume();
          setGameState('PLAYING');
        } else if (gameState !== 'MENU') {
          sound.playClick();
          setGameState('MENU');
        }
      } else if (e.code === 'KeyR') {
        if (gameState === 'GAME_OVER' || gameState === 'PLAYING') {
          handleStartGame();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handlePlayerAction, handleStartGame]);

  // Pause Controls
  const handlePauseToggle = useCallback(() => {
    if (gameState === 'PLAYING') {
      engineRef.current?.pause();
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      engineRef.current?.resume();
      setGameState('PLAYING');
    }
  }, [gameState]);

  // Sound toggles
  const handleToggleSound = useCallback(() => {
    const updated = storage.updateSettings({ soundEnabled: !settings.soundEnabled });
    setSettings(updated);
  }, [settings.soundEnabled]);

  const handleToggleMusic = useCallback(() => {
    const nextVal = !settings.musicEnabled;
    const updated = storage.updateSettings({ musicEnabled: nextVal });
    setSettings(updated);
    sound.toggleMusic(nextVal);
  }, [settings.musicEnabled]);

  // Skin unlock & selection
  const handleSelectSkin = useCallback((id: SkinId) => {
    storage.selectSkin(id);
    setSelectedSkin(id);
  }, []);

  const handleBuySkin = useCallback((id: SkinId, cost: number) => {
    const success = storage.unlockSkin(id, cost);
    if (success) {
      setSelectedSkin(id);
      setUnlockedSkins([...storage.getData().unlockedSkins]);
      setTotalCoins(storage.getData().coins);
      unlockAchievement('fashionista');
      analytics.logEvent('skin_unlocked', { skin_id: id });
    }
  }, [unlockAchievement]);

  // Claim Daily Challenge reward
  const handleClaimDailyReward = useCallback((reward: number) => {
    const claimed = storage.claimDailyReward(todayKey, reward);
    if (claimed) {
      setDailyChallenge(storage.getDailyChallenge(todayKey));
      setTotalCoins(storage.getData().coins);
      setActiveToast({
        title: `+${reward} Orbs Claimed!`,
        description: 'Spend them in the Skin Locker!',
      });
    }
  }, [todayKey]);

  // Reset progress
  const handleResetData = useCallback(() => {
    storage.resetAll();
    const data = storage.getData();
    setBestScore(data.bestScore);
    setTotalCoins(data.coins);
    setSelectedSkin('default');
    setUnlockedSkins(['default']);
    setSettings(data.settings);
    setAchievementsMap({});
    setDailyChallenge(storage.getDailyChallenge(todayKey));
    setGameState('MENU');
    setActiveToast({
      title: 'Progress Reset',
      description: 'Clean slate established.',
    });
  }, [todayKey]);

  return (
    <div
      id="app-root"
      ref={containerRef}
      className="relative w-full h-screen bg-[#070913] text-white flex items-center justify-center overflow-hidden touch-manipulation select-none"
      onPointerDown={(e) => {
        // Trigger action if clicked directly on playing viewport
        if (gameState === 'PLAYING') {
          handlePlayerAction(e);
        }
      }}
    >
      {/* Game Canvas Container */}
      <div className="relative w-full max-w-5xl h-full max-h-[640px] flex items-center justify-center">
        <canvas
          id="game-canvas"
          ref={canvasRef}
          className="w-full h-full object-contain block cursor-pointer"
          onPointerDown={(e) => {
            if (gameState === 'PLAYING') {
              e.stopPropagation();
              handlePlayerAction(e);
            }
          }}
        />

        {/* In-Game HUD during PLAYING state */}
        {gameState === 'PLAYING' && (
          <HUD
            score={currentScore}
            combo={currentCombo}
            multiplier={currentMultiplier}
            bestScore={bestScore}
            coinsEarned={coinsEarnedRun}
            isPaused={false}
            soundEnabled={settings.soundEnabled}
            musicEnabled={settings.musicEnabled}
            showTutorialHint={showTutorialHint}
            onPauseToggle={handlePauseToggle}
            onSoundToggle={handleToggleSound}
            onMusicToggle={handleToggleMusic}
          />
        )}

        {/* Main Menu Overlay */}
        {gameState === 'MENU' && (
          <MainMenu
            bestScore={bestScore}
            totalCoins={totalCoins}
            onPlay={handleStartGame}
            onOpenCustomize={() => setGameState('CUSTOMIZE')}
            onOpenDaily={() => setGameState('DAILY_CHALLENGE')}
            onOpenAchievements={() => setGameState('ACHIEVEMENTS')}
            onOpenSettings={() => setGameState('SETTINGS')}
            onOpenLeaderboard={() => setGameState('LEADERBOARD')}
            hasDailyRewardReady={dailyChallenge.completed && !dailyChallenge.claimed}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'GAME_OVER' && (
          <GameOverModal
            score={finalRunResult.score}
            bestScore={finalRunResult.bestScore}
            combo={finalRunResult.combo}
            coinsEarned={finalRunResult.coins}
            isNewRecord={finalRunResult.isNewRecord}
            onPlayAgain={handleStartGame}
            onOpenCustomize={() => setGameState('CUSTOMIZE')}
            onOpenAchievements={() => setGameState('ACHIEVEMENTS')}
            onBackToMenu={() => setGameState('MENU')}
          />
        )}

        {/* Pause Modal */}
        {gameState === 'PAUSED' && (
          <PauseModal
            soundEnabled={settings.soundEnabled}
            musicEnabled={settings.musicEnabled}
            onResume={handlePauseToggle}
            onRestart={handleStartGame}
            onQuit={() => {
              engineRef.current?.stop();
              setGameState('MENU');
            }}
            onToggleSound={handleToggleSound}
            onToggleMusic={handleToggleMusic}
          />
        )}

        {/* Skin Locker / Customize Modal */}
        {gameState === 'CUSTOMIZE' && (
          <CustomizeModal
            currentSkin={selectedSkin}
            unlockedSkins={unlockedSkins}
            totalCoins={totalCoins}
            onSelectSkin={handleSelectSkin}
            onBuySkin={handleBuySkin}
            onClose={() => setGameState('MENU')}
          />
        )}

        {/* Daily Challenge Modal */}
        {gameState === 'DAILY_CHALLENGE' && (
          <DailyChallengeModal
            challenge={dailyChallenge}
            onClaimReward={handleClaimDailyReward}
            onClose={() => setGameState('MENU')}
          />
        )}

        {/* Achievements Modal */}
        {gameState === 'ACHIEVEMENTS' && (
          <AchievementsModal
            unlockedMap={achievementsMap}
            onClose={() => setGameState('MENU')}
          />
        )}

        {/* Leaderboard / Personal Hall of Fame Modal */}
        {gameState === 'LEADERBOARD' && (
          <LeaderboardModal onClose={() => setGameState('MENU')} />
        )}

        {/* Settings Modal */}
        {gameState === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={(partial) => {
              const updated = storage.updateSettings(partial);
              setSettings(updated);
            }}
            onResetData={handleResetData}
            onClose={() => setGameState('MENU')}
          />
        )}

        {/* Achievement Toast */}
        {activeToast && (
          <AchievementToast
            title={activeToast.title}
            description={activeToast.description}
            onDismiss={() => setActiveToast(null)}
          />
        )}
      </div>
    </div>
  );
}
