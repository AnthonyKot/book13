import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code2,
  FlaskConical,
  Lightbulb,
  Link2,
  List,
  LoaderCircle,
  Menu,
  Play,
  RotateCcw,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import { chapters } from './data/chapters';
import { courseModules, type RuntimeResult } from './data/types';
import { useCourseStore } from './store';

type MobileTab = 'learn' | 'code' | 'result';

// Stable, shareable lab URLs: #lab-4 → the chapter whose order is 4. Lab numbers are the public
// identity; chapter ids stay internal (they key saved progress).
const labHash = (order: number) => `#lab-${order}`;
const chapterIdFromHash = (hash: string): string | null => {
  const match = /^#lab-(\d+)$/.exec(hash);
  if (!match) return null;
  return chapters.find((item) => item.order === Number(match[1]))?.id ?? null;
};
type RuntimeState = 'loading' | 'ready' | 'error';

function App() {
  const {
    currentChapterId,
    codeSnippets,
    completions,
    predictionSelections,
    checkedPredictions,
    hintsRevealed,
    attempts,
    setChapter,
    saveCodeSnippet,
    resetCodeSnippet,
    selectPrediction,
    checkPrediction,
    revealHint,
    recordAttempt,
    recordCompletion,
  } = useCourseStore();
  const [result, setResult] = useState<RuntimeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('loading');
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('learn');
  const [linkCopied, setLinkCopied] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const pendingChapterRef = useRef<string | null>(null);
  const curriculumCloseRef = useRef<HTMLButtonElement | null>(null);
  const curriculumOpenerRef = useRef<HTMLElement | null>(null);

  const chapterIndex = Math.max(0, chapters.findIndex((item) => item.id === currentChapterId));
  const chapter = chapters[chapterIndex] ?? chapters[0];
  const nextChapter = chapters[chapterIndex + 1];
  const code = codeSnippets[chapter.id] ?? chapter.starterCode;
  const selectedPrediction = predictionSelections[chapter.id];
  const predictionChecked = checkedPredictions[chapter.id] ?? false;
  const revealedHints = hintsRevealed[chapter.id] ?? 0;
  const completion = completions[chapter.id];
  const completedCount = Object.keys(completions).filter((id) => chapters.some((item) => item.id === id)).length;
  const progress = Math.round((completedCount / chapters.length) * 100);

  const selectedOption = useMemo(
    () => chapter.prediction.options.find((option) => option.id === selectedPrediction),
    [chapter, selectedPrediction],
  );
  const predictionCorrect = selectedPrediction === chapter.prediction.correctOptionId;

  const finishRun = useCallback((nextResult: RuntimeResult, completedChapterId: string) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingChapterRef.current = null;
    recordAttempt(completedChapterId);
    if (nextResult.status === 'passed') recordCompletion(completedChapterId);
    setResult(nextResult);
    setIsRunning(false);
  }, [recordAttempt, recordCompletion]);

  const startWorker = useCallback(() => {
    workerRef.current?.terminate();
    setRuntimeState('loading');
    const worker = new Worker(`${import.meta.env.BASE_URL}go-runner-worker.js`);
    workerRef.current = worker;
    worker.onmessage = (event) => {
      if (event.data?.type === 'ready') {
        setRuntimeState('ready');
        return;
      }
      if (event.data?.type === 'runtime-error') {
        setRuntimeState('error');
        return;
      }
      if (event.data?.type === 'result' && pendingChapterRef.current) {
        let nextResult: RuntimeResult;
        try {
          nextResult = JSON.parse(event.data.result) as RuntimeResult;
        } catch (error) {
          nextResult = { status: 'runtime_error', stdout: '', error: error instanceof Error ? error.message : String(error), tests: [] };
        }
        const completedChapterId = pendingChapterRef.current;
        const completedChapter = chapters.find((item) => item.id === completedChapterId);
        if (nextResult.status === 'runtime_error' && nextResult.tests.length === 0 && completedChapter?.contractFailureMessage) {
          nextResult = {
            ...nextResult,
            status: 'failed',
            error: undefined,
            tests: [{ name: 'dependency boundary', passed: false, message: completedChapter.contractFailureMessage }],
          };
        }
        finishRun(nextResult, completedChapterId);
      }
    };
    worker.onerror = () => setRuntimeState('error');
  }, [finishRun]);

  useEffect(() => {
    startWorker();
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      workerRef.current?.terminate();
    };
  }, [startWorker]);

  useEffect(() => {
    const fromHash = chapterIdFromHash(window.location.hash);
    if (fromHash) setChapter(fromHash);
    const onHashChange = () => {
      const id = chapterIdFromHash(window.location.hash);
      if (id) setChapter(id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [setChapter]);

  useEffect(() => {
    setResult(null);
    setMobileTab('learn');
    setLinkCopied(false);
    if (window.location.hash !== labHash(chapter.order)) {
      window.history.replaceState(null, '', labHash(chapter.order));
    }
    document.title = `Lab ${chapter.order}: ${chapter.title} — The Go Shift`;
  }, [chapter.id, chapter.order, chapter.title]);

  useEffect(() => {
    if (!curriculumOpen) return;
    curriculumCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCurriculumOpen(false);
        window.setTimeout(() => curriculumOpenerRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [curriculumOpen]);

  const runCode = () => {
    if (!predictionChecked || !workerRef.current || runtimeState !== 'ready' || isRunning) return;
    setIsRunning(true);
    setMobileTab('result');
    const requestId = `${chapter.id}-${Date.now()}`;
    pendingChapterRef.current = chapter.id;
    workerRef.current.postMessage({ type: 'run', requestId, code, hiddenTests: chapter.hiddenTestCode });
    timeoutRef.current = window.setTimeout(() => {
      const timedOutChapter = pendingChapterRef.current;
      workerRef.current?.terminate();
      if (timedOutChapter) {
        finishRun({ status: 'runtime_error', stdout: '', error: 'Execution exceeded 5 seconds and was stopped. Your code is still in the editor.', tests: [] }, timedOutChapter);
      }
      startWorker();
    }, 5000);
  };

  const resetLab = () => {
    resetCodeSnippet(chapter.id);
    setResult(null);
    setMobileTab('code');
  };

  const goToChapter = (id: string) => {
    setChapter(id);
    setCurriculumOpen(false);
  };

  const labUrl = `${window.location.origin}${window.location.pathname}${labHash(chapter.order)}`;
  const copyLabLink = async () => {
    try {
      await navigator.clipboard.writeText(labUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt('Copy this lab link', labUrl);
    }
  };

  const openCurriculum = () => {
    curriculumOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCurriculumOpen(true);
  };

  const closeCurriculum = () => {
    setCurriculumOpen(false);
    window.setTimeout(() => curriculumOpenerRef.current?.focus(), 0);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="The Go Shift home">
          <span className="brand-mark" aria-hidden="true">G<span>↗</span></span>
          <span><strong>The Go Shift</strong><small>{chapters.length} labs for experienced developers</small></span>
        </a>
        <div className="header-progress" aria-label={`${completedCount} of ${chapters.length} labs passed`}>
          <span>{completedCount}/{chapters.length} labs</span>
          <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <button className="quiet-button curriculum-button" type="button" onClick={openCurriculum}>
          <List size={17} /> Curriculum
        </button>
        <button className="icon-button curriculum-icon" type="button" aria-label="Open curriculum" onClick={openCurriculum}>
          <Menu size={20} />
        </button>
      </header>

      <nav className="mobile-tabs" aria-label="Lab workspace">
        {([
          ['learn', BookOpen, 'Learn'],
          ['code', Code2, 'Code'],
          ['result', TerminalSquare, 'Result'],
        ] as const).map(([id, Icon, label]) => (
          <button key={id} type="button" className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)}>
            <Icon size={16} /> {label}
            {id === 'result' && result?.status === 'passed' ? <Check size={14} /> : null}
          </button>
        ))}
      </nav>

      <main className="workspace">
        <article className={`lesson-pane ${mobileTab === 'learn' ? 'mobile-active' : ''}`}>
          <div className="lesson-inner">
            <div className="chapter-kicker">
              <span>{courseModules.find((item) => item.id === chapter.module)?.title}</span>
              <span>
                Lab {chapter.order} of {chapters.length}
                <button className="copy-link" type="button" onClick={copyLabLink} title={labUrl} aria-label="Copy link to this lab">
                  <Link2 size={13} /> {linkCopied ? 'Link copied' : 'Copy link'}
                </button>
              </span>
            </div>
            <h1>{chapter.title}</h1>

            <section className={`orientation ${predictionChecked ? '' : 'single'}`} aria-labelledby="outcome-heading">
              <div>
                <FlaskConical size={18} aria-hidden="true" />
                <p><strong id="outcome-heading">By the end</strong>{chapter.outcome}</p>
              </div>
              {predictionChecked ? (
                <div>
                  <Lightbulb size={18} aria-hidden="true" />
                  <p><strong>Recognition cue</strong>{chapter.recognitionCue}</p>
                </div>
              ) : null}
            </section>

            <section className="prediction-card" aria-labelledby="prediction-heading">
              <span className="step-label">01 · Predict before running</span>
              <h2 id="prediction-heading">{chapter.prediction.prompt}</h2>
              {chapter.prediction.code ? <pre><code>{chapter.prediction.code}</code></pre> : null}
              <fieldset disabled={predictionChecked}>
                <legend className="sr-only">Choose your prediction</legend>
                {chapter.prediction.options.map((option) => (
                  <label key={option.id} className={selectedPrediction === option.id ? 'selected' : ''}>
                    <input
                      type="radio"
                      name={`prediction-${chapter.id}`}
                      value={option.id}
                      checked={selectedPrediction === option.id}
                      onChange={() => selectPrediction(chapter.id, option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              {!predictionChecked ? (
                <button className="secondary-button" type="button" disabled={!selectedPrediction} onClick={() => checkPrediction(chapter.id)}>
                  Commit prediction
                </button>
              ) : (
                <div className={`prediction-feedback ${predictionCorrect ? 'correct' : 'incorrect'}`} role="status">
                  {predictionCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <p><strong>{predictionCorrect ? 'That is the shift.' : 'Useful miss.'}</strong>{selectedOption?.explanation}</p>
                </div>
              )}
              {predictionChecked ? <p className="mental-model"><span>The shift</span>{chapter.mentalModel}</p> : null}
            </section>

            <section className="prose-section" aria-labelledby="rule-heading">
              <span className="step-label">02 · See the rule</span>
              <h2 id="rule-heading">What Go is actually doing</h2>
              <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: chapter.lesson }} />
            </section>

            <section className="challenge-card" aria-labelledby="challenge-heading">
              <span className="step-label">03 · Prove it in code</span>
              <h2 id="challenge-heading">{chapter.challenge.title}</h2>
              <p dangerouslySetInnerHTML={{ __html: chapter.challenge.description }} />
              <button className="primary-button mobile-code-cta" type="button" onClick={() => setMobileTab('code')}>
                Open code lab <ArrowRight size={17} />
              </button>
            </section>

            <section className="hints" aria-labelledby="hints-heading">
              <div className="section-row">
                <div><span className="step-label">Need a nudge?</span><h2 id="hints-heading">Progressive hints</h2></div>
                {revealedHints < chapter.hints.length ? (
                  <button className="text-button" type="button" onClick={() => revealHint(chapter.id, revealedHints + 1)}>
                    Reveal hint {revealedHints + 1}
                  </button>
                ) : null}
              </div>
              {revealedHints === 0 ? <p className="muted">Try the lab once before opening a hint. Your code will be preserved.</p> : null}
              <ol>
                {chapter.hints.slice(0, revealedHints).map((hint, index) => (
                  <li key={hint}><span>{index + 1}</span><p dangerouslySetInnerHTML={{ __html: hint }} /></li>
                ))}
              </ol>
            </section>

            {result?.status === 'passed' || completion ? (
              <section className="debrief-card" aria-labelledby="debrief-heading">
                <span className="step-label">04 · Carry it forward</span>
                <h2 id="debrief-heading">{chapter.debrief.title}</h2>
                <p>{chapter.debrief.summary}</p>
                <div className="transfer-question"><strong>Transfer question</strong><p>{chapter.debrief.transfer}</p></div>
                {nextChapter ? (
                  <button className="primary-button" type="button" onClick={() => goToChapter(nextChapter.id)}>
                    Next lab: {nextChapter.title} <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="secondary-button" type="button" onClick={openCurriculum}>
                    Return to curriculum <List size={17} />
                  </button>
                )}
              </section>
            ) : null}
          </div>
        </article>

        <section className={`lab-pane ${mobileTab === 'code' || mobileTab === 'result' ? 'mobile-active' : ''}`} aria-label="Code lab">
          <div className="lab-toolbar">
            <div className="file-tab"><ChevronRight size={15} /> main.go</div>
            <div className={`runtime-state ${runtimeState}`}>
              <span /> {runtimeState === 'ready' ? 'Go ready' : runtimeState === 'loading' ? 'Loading Go…' : 'Runtime unavailable'}
            </div>
            <button className="quiet-button" type="button" onClick={resetLab}><RotateCcw size={15} /> Reset</button>
            <button
              className="run-button"
              type="button"
              disabled={!predictionChecked || runtimeState !== 'ready' || isRunning}
              onClick={runCode}
              title={!predictionChecked ? 'Commit your prediction first' : undefined}
            >
              {isRunning ? <LoaderCircle className="spin" size={17} /> : <Play size={17} fill="currentColor" />}
              {isRunning ? 'Running tests…' : 'Run tests'}
            </button>
          </div>

          <div className={`editor-region ${mobileTab === 'result' ? 'mobile-hidden' : ''}`}>
            <Editor
              height="100%"
              defaultLanguage="go"
              theme="vs-dark"
              value={code}
              onChange={(value) => value !== undefined && saveCodeSnippet(chapter.id, value)}
              loading={<div className="editor-loading">Loading editor…</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
                lineHeight: 22,
                padding: { top: 18, bottom: 18 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          <section className={`results-panel ${mobileTab === 'result' ? 'mobile-expanded' : ''}`} aria-labelledby="results-heading" aria-live="polite">
            <div className="results-heading-row">
              <div>
                <span className="eyebrow">Behavioral tests</span>
                <h2 id="results-heading">
                  {!result ? 'Your evidence will appear here' : result.status === 'passed' ? 'All tests passed' : result.status === 'failed' ? 'Some behavior still differs' : result.status === 'compile_error' ? 'The program did not compile' : 'The run could not finish'}
                </h2>
              </div>
              <span className="attempt-count">{attempts[chapter.id] ?? 0} {(attempts[chapter.id] ?? 0) === 1 ? 'attempt' : 'attempts'}</span>
            </div>

            {!predictionChecked ? (
              <div className="empty-result"><Circle size={18} /><p>Commit the prediction in the lesson to unlock the lab.</p></div>
            ) : !result ? (
              <div className="test-preview">
                {chapter.testNames.map((name) => <span key={name}><Circle size={15} />{name}</span>)}
              </div>
            ) : (
              <>
                {result.error ? <pre className="error-output"><code>{result.error}</code></pre> : null}
                <div className="test-results">
                  {result.tests.map((test) => (
                    <div key={test.name} className={test.passed ? 'pass' : 'fail'}>
                      {test.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      <p><strong>{test.name}</strong><span>{test.message}</span></p>
                    </div>
                  ))}
                </div>
                {result.stdout ? <details><summary>Program output</summary><pre><code>{result.stdout}</code></pre></details> : null}
                {result.status === 'passed' ? (
                  <button className="primary-button mobile-debrief-cta" type="button" onClick={() => setMobileTab('learn')}>
                    Read the debrief <ArrowRight size={17} />
                  </button>
                ) : null}
              </>
            )}
          </section>
        </section>
      </main>

      {curriculumOpen ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={closeCurriculum}>
          <aside className="curriculum-drawer" role="dialog" aria-modal="true" aria-label="Course curriculum" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header"><div><span className="eyebrow">The Go Shift</span><h2>Curriculum</h2></div><button ref={curriculumCloseRef} className="icon-button" type="button" aria-label="Close curriculum" onClick={closeCurriculum}>×</button></div>
            {courseModules.map((module) => {
              const moduleChapters = chapters.filter((item) => item.module === module.id);
              return (
                <section key={module.id} className="module-group">
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <ol>
                    {moduleChapters.map((item) => (
                      <li key={item.id}>
                        <a href={labHash(item.order)} className={item.id === chapter.id ? 'current' : ''} onClick={(event) => { event.preventDefault(); goToChapter(item.id); }}>
                          <span>{completions[item.id] ? <Check size={14} /> : item.order}</span>
                          <span><strong>{item.title}</strong><small>{item.outcome}</small></span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;
