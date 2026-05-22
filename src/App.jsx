import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const FIELD_CFG = {
  focus: { min: 1, max: 120, suffix: '분', hint: '1 ~ 120분 사이로 설정 가능' },
  rest:  { min: 1, max: 90,  suffix: '분', hint: '1 ~ 90분 사이로 설정 가능'  },
  count: { min: 1, max: 10,  suffix: '회', hint: '1 ~ 10회 설정 가능'        },
};

const DEFAULT_TASKS = [
  { id: 1, text: '리서치 자료 정리하기', done: false, tag: '지금' },
  { id: 2, text: '보고서 개요 작성',     done: false, tag: '다음' },
  { id: 3, text: '이메일 답장 보내기',   done: false, tag: null  },
  { id: 4, text: '회의 노트 정리',       done: false, tag: null  },
  { id: 5, text: '오전 루틴 완료',       done: false, tag: null  },
];

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export default function App() {
  const [focusTime,    setFocusTime]    = useState(() => load('focusTime', 25));
  const [restTime,     setRestTime]     = useState(() => load('restTime', 5));
  const [sessionCount, setSessionCount] = useState(() => load('sessionCount', 4));
  const [mode,         setMode]         = useState(() => load('timerMode', 'focus'));
  const [secs,         setSecs]         = useState(() => load('timerSecs', load('focusTime', 25) * 60));
  const [running,      setRunning]      = useState(false);
  const [completedSessions, setCompletedSessions] = useState(() => load('completedSessions', 0));
  const [allDone,      setAllDone]      = useState(() => load('allDone', false));
  const [tasks,        setTasks]        = useState(() => load('tasks', DEFAULT_TASKS));
  const [activeScreen, setActiveScreen] = useState(() => load('activeScreen', 'timer'));
  const [editingField, setEditingField] = useState(null);
  const [inputValue,   setInputValue]   = useState('');
  const [activeModal,  setActiveModal]  = useState(null);
  const [clockStr,     setClockStr]     = useState('');
  const [fontSize,     setFontSize]     = useState(() => load('fontSize', 17));
  const [letterSpacing,setLetterSpacing]= useState(() => load('letterSpacing', 1));
  const [lineHeight,   setLineHeight]   = useState(() => load('lineHeight', 1.7));
  const [selectedFont, setSelectedFont] = useState(() => load('selectedFont', 'Lexend'));
  const [bgColor,      setBgColor]      = useState(() => load('bgColor', '#4A1042'));
  const [selectedSound,setSelectedSound]= useState(() => load('selectedSound', 'forest'));
  const [toggles,      setToggles]      = useState(() => load('toggles', { vibration: true, tts: true }));

  const waveRef         = useRef(null);
  const intervalRef     = useRef(null);
  const secsRef         = useRef(secs);
  const modeRef         = useRef(mode);
  const focusTimeRef    = useRef(focusTime);
  const restTimeRef     = useRef(restTime);
  const sessionCountRef = useRef(sessionCount);
  const completedRef    = useRef(completedSessions);
  const allDoneRef      = useRef(allDone);
  const inputRef        = useRef(null);

  secsRef.current         = secs;
  modeRef.current         = mode;
  focusTimeRef.current    = focusTime;
  restTimeRef.current     = restTime;
  sessionCountRef.current = sessionCount;
  completedRef.current    = completedSessions;
  allDoneRef.current      = allDone;

  // 모든 상태 자동 저장
  useEffect(() => { save('focusTime',          focusTime);          }, [focusTime]);
  useEffect(() => { save('restTime',           restTime);           }, [restTime]);
  useEffect(() => { save('sessionCount',       sessionCount);       }, [sessionCount]);
  useEffect(() => { save('timerMode',          mode);               }, [mode]);
  useEffect(() => { save('timerSecs',          secs);               }, [secs]);
  useEffect(() => { save('completedSessions',  completedSessions);  }, [completedSessions]);
  useEffect(() => { save('allDone',            allDone);            }, [allDone]);
  useEffect(() => { save('tasks',              tasks);              }, [tasks]);
  useEffect(() => { save('activeScreen',       activeScreen);       }, [activeScreen]);
  useEffect(() => { save('fontSize',           fontSize);           }, [fontSize]);
  useEffect(() => { save('letterSpacing',      letterSpacing);      }, [letterSpacing]);
  useEffect(() => { save('lineHeight',         lineHeight);         }, [lineHeight]);
  useEffect(() => { save('selectedFont',       selectedFont);       }, [selectedFont]);
  useEffect(() => { save('bgColor',            bgColor);            }, [bgColor]);
  useEffect(() => { save('selectedSound',      selectedSound);      }, [selectedSound]);
  useEffect(() => { save('toggles',            toggles);            }, [toggles]);

  // 페이지 닫히기 직전 ref 값 강제 저장 (타이머 도중 꺼질 때 대비)
  useEffect(() => {
    const flush = () => {
      save('timerSecs',         secsRef.current);
      save('timerMode',         modeRef.current);
      save('completedSessions', completedRef.current);
      save('allDone',           allDoneRef.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  useEffect(() => {
    if (!document.getElementById('fa-cdn')) {
      const link = document.createElement('link');
      link.id = 'fa-cdn'; link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockStr(String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'));
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!waveRef.current) return;
    const total = mode === 'focus' ? focusTime * 60 : restTime * 60;
    const ratio = total > 0 ? secs / total : 0;
    const level = 3 + (1 - Math.max(0, Math.min(1, ratio))) * 103;
    waveRef.current.style.setProperty('--fill-pct', `${level}%`);
  }, [secs, mode, focusTime, restTime]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    if (activeModal === 'input' && inputRef.current) {
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 350);
    }
  }, [activeModal]);

  const handleTimerEnd = useCallback(() => {
    const curMode = modeRef.current;
    if (curMode === 'focus') {
      const newCompleted = completedRef.current + 1;
      setCompletedSessions(newCompleted);
      completedRef.current = newCompleted;
      if (newCompleted >= sessionCountRef.current) {
        setAllDone(true); allDoneRef.current = true;
        setMode('done'); setActiveModal('all-done');
      } else {
        setActiveModal('focus-end');
      }
    } else {
      setMode('focus'); modeRef.current = 'focus';
      const s = focusTimeRef.current * 60;
      setSecs(s); secsRef.current = s;
      setRunning(false); setActiveModal('rest-end');
    }
  }, []);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const next = secsRef.current - 1;
      secsRef.current = next; setSecs(next);
      if (next <= 0) { clearInterval(intervalRef.current); setRunning(false); handleTimerEnd(); }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, handleTimerEnd]);

  const toggleTimer = () => { if (allDone) return; setRunning(r => !r); };

  const resetTimer = () => {
    clearInterval(intervalRef.current); setRunning(false);
    const s = mode === 'focus' ? focusTime * 60 : restTime * 60;
    setSecs(s); secsRef.current = s;
  };

  const resetAll = () => {
    clearInterval(intervalRef.current); setRunning(false);
    setCompletedSessions(0); completedRef.current = 0;
    setAllDone(false); allDoneRef.current = false;
    setMode('focus'); modeRef.current = 'focus';
    const s = focusTimeRef.current * 60; setSecs(s); secsRef.current = s;
  };

  const handleModeTab = (tab) => {
    if (tab === 'done') return;
    clearInterval(intervalRef.current); setRunning(false);
    setMode(tab); modeRef.current = tab;
    const s = tab === 'focus' ? focusTime * 60 : restTime * 60;
    setSecs(s); secsRef.current = s;
  };

  const startRestMode = (autoStart = false) => {
    setMode('rest'); modeRef.current = 'rest';
    const s = restTimeRef.current * 60; setSecs(s); secsRef.current = s;
    setActiveModal(null); setRunning(autoStart);
  };

  const startFocusMode = (autoStart = false) => {
    setMode('focus'); modeRef.current = 'focus';
    const s = focusTimeRef.current * 60; setSecs(s); secsRef.current = s;
    setActiveModal(null); setRunning(autoStart);
  };

  const handleSlider = (field, rawVal) => {
    const v = parseInt(rawVal);
    if (field === 'focus') {
      setFocusTime(v); focusTimeRef.current = v;
      if (modeRef.current === 'focus' && !running) { setSecs(v * 60); secsRef.current = v * 60; }
    } else if (field === 'rest') {
      setRestTime(v); restTimeRef.current = v;
      if (modeRef.current === 'rest' && !running) { setSecs(v * 60); secsRef.current = v * 60; }
    } else if (field === 'count') {
      setSessionCount(v); sessionCountRef.current = v;
      setCompletedSessions(c => Math.min(c, v));
    }
  };

  const openInputModal = (field) => {
    setEditingField(field);
    const cur = field === 'focus' ? focusTime : field === 'rest' ? restTime : sessionCount;
    setInputValue(String(cur)); setActiveModal('input');
  };

  const confirmInput = () => {
    const cfg = FIELD_CFG[editingField];
    let v = parseInt(inputValue);
    if (isNaN(v)) { setActiveModal(null); return; }
    v = Math.max(cfg.min, Math.min(cfg.max, v));
    handleSlider(editingField, v); setActiveModal(null);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const totalSecs = mode === 'focus' ? focusTime * 60 : restTime * 60;
  const fontSizeLabel = fontSize <= 14 ? '작게' : fontSize <= 17 ? '보통' : fontSize <= 20 ? '크게' : '매우 크게';
  const activeTask     = tasks.find(t => !t.done);
  const activeTaskText = activeTask ? activeTask.text : '';
  const doneCnt        = tasks.filter(t => t.done).length;

  return (
    <div className="phone-frame">
      <div className="status-bar">
        <span>{clockStr || '00:00'}</span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <i className="fa fa-signal" style={{ fontSize:13 }}></i>
          <i className="fa fa-wifi" style={{ fontSize:13 }}></i>
          <i className="fa fa-battery-three-quarters" style={{ fontSize:13 }}></i>
        </div>
      </div>

      {/* ══ TIMER SCREEN ══ */}
      <div className={`screen timer-screen${activeScreen === 'timer' ? ' active' : ''}`}>
        <div className="mode-tabs">
          <button className={`mode-tab${mode === 'focus' ? ' active' : ''}`} onClick={() => handleModeTab('focus')}>집중 시간</button>
          <button className={`mode-tab${mode === 'rest'  ? ' active' : ''}`} onClick={() => handleModeTab('rest')}>쉬는 시간</button>
          <button className={`mode-tab${mode === 'done'  ? ' active' : ''}${!allDone ? ' tab-disabled' : ''}`}>완료</button>
        </div>
        <div className="task-label">{activeTaskText}</div>
        <div className="session-dots-wrap">
          <div className="session-dots">
            {Array.from({ length: sessionCount }, (_, i) => (
              <div key={i} className={`dot${i < completedSessions ? ' filled' : ''}`} />
            ))}
          </div>
        </div>
        <div className="timer-ring-wrap">
          <div className="wave-circle" ref={waveRef}>
            <div className="wave-fill back">
              <div className="wave-body"></div>
              <div className="wave-surface flow-back">
                <svg viewBox="0 0 200 28" preserveAspectRatio="none">
                  <path className="wave-path" d="M0,14 C25,2 75,2 100,14 C125,26 175,26 200,14 L200,28 L0,28 Z"/>
                </svg>
              </div>
            </div>
            <div className="wave-fill front">
              <div className="wave-body"></div>
              <div className="wave-surface flow-front">
                <svg viewBox="0 0 200 28" preserveAspectRatio="none">
                  <path className="wave-path" d="M0,14 C25,26 75,26 100,14 C125,2 175,2 200,14 L200,28 L0,28 Z"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="timer-inner">
            <div className="timer-time">{mm}:{ss}</div>
          </div>
        </div>
        <div className="btn-group">
          <button className="main-btn" onClick={toggleTimer} disabled={allDone && mode === 'done'}>
            <i className={`fa fa-${running ? 'pause' : 'play'}`}></i>
            &nbsp;{running ? '정지' : secs < totalSecs && secs > 0 ? '계속하기' : '시작'}
          </button>
          <button className="secondary-btn" onClick={resetTimer}>
            <i className="fa fa-rotate-right" style={{ marginRight:6, fontSize:14 }}></i>처음부터
          </button>
        </div>
      </div>

      {/* ══ CHECKLIST SCREEN ══ */}
      <div className={`screen${activeScreen === 'checklist' ? ' active' : ''}`}>
        <div className="screen-header">
          <div className="screen-title">오늘의 할 일</div>
          <div className="screen-subtitle">차근차근 토닥토닥</div>
        </div>
        <div className="progress-chips">
          <div className="chip active">전체 {tasks.length}</div>
          <div className="chip">완료 {doneCnt}</div>
          <div className="chip">남은 것 {tasks.length - doneCnt}</div>
        </div>
        <div className="checklist-wrap">
          {tasks.map((task, idx) => (
            <div key={task.id}
              className={`check-item${idx === 0 && !task.done ? ' active-task' : ''}${task.done ? ' done-task' : ''}`}
              onClick={() => toggleTask(task.id)}>
              <div className={`check-box${task.done ? ' checked' : ''}`}>
                <i className="fa fa-check chk-icon"></i>
              </div>
              <div className="check-text-label">{task.text}</div>
              {task.tag && (
                <div className={`check-tag ${task.tag === '지금' ? 'tag-now' : 'tag-soon'}`}>{task.tag}</div>
              )}
            </div>
          ))}
        </div>
        <button className="add-task-btn">
          <i className="fa fa-plus" style={{ fontSize:16, color:'var(--text-muted)' }}></i>
          새 할 일 추가하기
        </button>
        <div style={{ padding:'24px 24px 8px' }}>
          <div className="section-label">읽기 가이드 미리보기</div>
        </div>
        <div className="reading-guide-demo">
          <div className="guide-line">회의 전에 슬라이드 검토하기</div>
          <div className="guide-line highlight">리서치 자료를 팀원과 공유하기</div>
          <div className="guide-line">보고서 초안 작성 완료하기</div>
          <div className="guide-line">피드백 반영 후 최종본 저장</div>
        </div>
      </div>

      {/* ══ SETTINGS SCREEN ══ */}
      <div className={`screen${activeScreen === 'settings' ? ' active' : ''}`}>
        <div className="screen-header"><div className="screen-title">설정</div></div>

        <div className="settings-section">
          <div className="section-label">세션 설정</div>
          <div className="setting-card">
            <div className="slider-row">
              <div className="slider-label">
                <span>집중 시간</span>
                <button className="slider-val-btn" onClick={() => openInputModal('focus')}>{focusTime}분</button>
              </div>
              <input type="range" min="0" max="120" value={focusTime} step="5"
                onChange={e => handleSlider('focus', e.target.value)} />
            </div>
            <div className="slider-row">
              <div className="slider-label">
                <span>휴식 시간</span>
                <button className="slider-val-btn" onClick={() => openInputModal('rest')}>{restTime}분</button>
              </div>
              <input type="range" min="0" max="90" value={restTime} step="5"
                onChange={e => handleSlider('rest', e.target.value)} />
            </div>
            <div className="slider-row">
              <div className="slider-label">
                <span>세션 횟수</span>
                <button className="slider-val-btn" onClick={() => openInputModal('count')}>{sessionCount}회</button>
              </div>
              <input type="range" min="1" max="10" value={sessionCount} step="1"
                onChange={e => handleSlider('count', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">글자 설정</div>
          <div className="setting-card">
            <div className="slider-row">
              <div className="slider-label">
                <span>글자 크기</span>
                <span style={{ fontSize:14, color:'var(--text-muted)' }}>{fontSizeLabel}</span>
              </div>
              <input type="range" min="14" max="24" value={fontSize} step="1"
                onChange={e => setFontSize(Number(e.target.value))} />
            </div>
            <div className="slider-row">
              <div className="slider-label">
                <span>자간</span>
                <span style={{ fontSize:14, color:'var(--text-muted)' }}>보통</span>
              </div>
              <input type="range" min="0" max="5" value={letterSpacing} step="1"
                onChange={e => setLetterSpacing(Number(e.target.value))} />
            </div>
            <div className="slider-row">
              <div className="slider-label">
                <span>줄간격</span>
                <span style={{ fontSize:14, color:'var(--text-muted)' }}>넉넉하게</span>
              </div>
              <input type="range" min="1.4" max="2.2" value={lineHeight} step="0.1"
                onChange={e => setLineHeight(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">폰트 선택</div>
          <div className="setting-card">
            {[
              { key: 'Lexend',    label: 'Lexend',                style: "'Lexend', sans-serif" },
              { key: 'serif',     label: 'Atkinson Hyperlegible', style: 'Georgia, serif' },
              { key: 'monospace', label: 'OpenDyslexic 스타일',   style: "'Courier New', monospace" },
            ].map(f => (
              <div key={f.key} className="font-option" onClick={() => setSelectedFont(f.key)}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:'2.5px solid var(--blue-focus)',
                  background: selectedFont === f.key ? 'var(--blue-focus)' : 'transparent', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)' }}>{f.label}</div>
                  <div style={{ fontFamily:f.style, fontSize:14, color:'var(--text-secondary)', marginTop:4 }}>가나다라 마바사아</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">배경 색상</div>
          <div className="setting-card">
            <div style={{ padding:'16px 20px', display:'flex', gap:12 }}>
              {['#4A1042','#3A0C34','#5C1A52','#2D1B3D','#3A1228'].map(color => (
                <div key={color} onClick={() => setBgColor(color)}
                  style={{ width:36, height:36, borderRadius:'50%', background:color, cursor:'pointer',
                    border: bgColor === color ? '2.5px solid rgba(255,255,255,0.8)' : '2.5px solid rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">알림 및 소리</div>
          <div className="setting-card">
            {[
              { label:'진동 알림', desc:'세션 종료 시 진동',          key:'vibration' },
              { label:'음성 안내', desc:'TTS로 안내 메시지 읽어주기', key:'tts'       },
            ].map(item => (
              <div key={item.key} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', flex:1 }}>
                  {item.label}
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{item.desc}</div>
                </div>
                <div onClick={() => setToggles(t => ({ ...t, [item.key]: !t[item.key] }))}
                  style={{ width:48, height:28, borderRadius:14, background: toggles[item.key] ? 'var(--blue-focus)' : 'var(--cream-dark)',
                    cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: toggles[item.key] ? 22 : 3,
                    width:22, height:22, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
                </div>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px' }}>
              <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', flex:1 }}>
                배경 소리
                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
                  {selectedSound === 'forest' ? '숲 소리' : selectedSound === 'rain' ? '비' : selectedSound === 'lofi' ? '로파이' : '화이트 노이즈'} 선택됨
                </div>
              </div>
              <i className="fa fa-chevron-right" style={{ color:'var(--text-muted)' }}></i>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">배경 소리 선택</div>
          <div className="setting-card">
            {[
              { key:'forest', icon:'fa-tree',        label:'숲',           desc:'새소리와 바람 소리' },
              { key:'rain',   icon:'fa-cloud-rain',  label:'비',           desc:'부드러운 빗소리'    },
              { key:'lofi',   icon:'fa-headphones',  label:'로파이',       desc:'잔잔한 배경 음악'   },
              { key:'white',  icon:'fa-wave-square', label:'화이트 노이즈',desc:'균일한 백색소음'    },
            ].map(s => (
              <div key={s.key} onClick={() => setSelectedSound(s.key)}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }}>
                <div style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                  background: selectedSound === s.key ? 'var(--blue-focus)' : 'var(--cream-dark)', fontSize:16,
                  color: selectedSound === s.key ? 'var(--navy)' : 'var(--text-secondary)', flexShrink:0 }}>
                  <i className={`fa ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)' }}>{s.label}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM NAV ══ */}
      <nav className="bottom-nav">
        <button className={`nav-item${activeScreen === 'timer'     ? ' active' : ''}`} onClick={() => setActiveScreen('timer')}>
          <i className="fa fa-circle-play"></i><span>타이머</span>
        </button>
        <button className={`nav-item${activeScreen === 'checklist' ? ' active' : ''}`} onClick={() => setActiveScreen('checklist')}>
          <i className="fa fa-list-check"></i><span>할 일</span>
        </button>
        <button className={`nav-item${activeScreen === 'settings'  ? ' active' : ''}`} onClick={() => setActiveScreen('settings')}>
          <i className="fa fa-sliders"></i><span>설정</span>
        </button>
      </nav>

      {/* ══ MODAL: DIRECT INPUT ══ */}
      <div className={`modal-overlay${activeModal === 'input' ? ' show' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
        <div className="modal-sheet">
          <div className="modal-handle"></div>
          <div className="input-range-hint">{editingField ? FIELD_CFG[editingField].hint : ''}</div>
          <input ref={inputRef} type="number" className="input-field" inputMode="numeric"
            value={inputValue}
            min={editingField ? FIELD_CFG[editingField].min : 1}
            max={editingField ? FIELD_CFG[editingField].max : 99}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmInput(); if (e.key === 'Escape') setActiveModal(null); }}
          />
          <div className="modal-btn-group">
            <button className="main-btn" onClick={confirmInput}><i className="fa fa-check"></i>&nbsp; 적용</button>
            <button className="secondary-btn" onClick={() => setActiveModal(null)}>취소</button>
          </div>
        </div>
      </div>

      {/* ══ MODAL: FOCUS END ══ */}
      <div className={`modal-overlay${activeModal === 'focus-end' ? ' show' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
        <div className="modal-sheet">
          <div className="modal-handle"></div>
          <div className="modal-icon-wrap"><i className="fa fa-mug-hot"></i></div>
          <div className="modal-title">집중 시간 종료</div>
          <div className="modal-btn-group">
            <button className="main-btn" onClick={() => startRestMode(true)}><i className="fa fa-leaf"></i>&nbsp; 휴식 시작하기</button>
            <button className="secondary-btn" onClick={() => startFocusMode(true)}>바로 이어가기</button>
          </div>
        </div>
      </div>

      {/* ══ MODAL: REST END ══ */}
      <div className={`modal-overlay${activeModal === 'rest-end' ? ' show' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
        <div className="modal-sheet">
          <div className="modal-handle"></div>
          <div className="modal-icon-wrap" style={{ background:'rgba(224,162,62,0.15)', color:'#EAB75C' }}>
            <i className="fa fa-sun"></i>
          </div>
          <div className="modal-title">쉬는 시간 종료</div>
          <div className="modal-btn-group">
            <button className="main-btn" onClick={() => startFocusMode(true)}><i className="fa fa-play"></i>&nbsp; 집중 시작하기</button>
            <button className="secondary-btn" onClick={() => startFocusMode(false)}>더 쉬기</button>
          </div>
        </div>
      </div>

      {/* ══ MODAL: ALL DONE ══ */}
      <div className={`modal-overlay${activeModal === 'all-done' ? ' show' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
        <div className="modal-sheet">
          <div className="modal-handle"></div>
          <div className="modal-icon-wrap" style={{ background:'rgba(234,183,92,0.26)', color:'#F5E090' }}>
            <i className="fa fa-star"></i>
          </div>
          <div className="modal-title">전체 세션 완료!</div>
          <div className="modal-btn-group">
            <button className="main-btn" onClick={() => { setActiveModal(null); resetAll(); }}>
              <i className="fa fa-arrow-rotate-left"></i>&nbsp; 새로 시작하기
            </button>
            <button className="secondary-btn" onClick={() => setActiveModal(null)}>여기까지</button>
          </div>
        </div>
      </div>

    </div>
  );
}