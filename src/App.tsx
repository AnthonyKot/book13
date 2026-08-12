import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useCourseStore } from './store';
import { BookOpen, Terminal, CheckCircle, Play, Settings, ChevronRight, List } from 'lucide-react';
import { chapters } from './data/chapters';

function App() {
  const { currentChapterId, codeSnippets, completedChapters, saveCodeSnippet, setChapter, markChapterCompleted } = useCourseStore();
  const [output, setOutput] = useState<string>("Run the code to see output...");
  const [isRunning, setIsRunning] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  const currentChapterIndex = chapters.findIndex(c => c.id === currentChapterId);
  const chapter = chapters[currentChapterIndex] || chapters[0];
  const code = codeSnippets[chapter.id] !== undefined ? codeSnippets[chapter.id] : chapter.initialCode;

  const totalChapters = chapters.length;
  const completedCount = Object.keys(completedChapters).filter(k => completedChapters[k]).length;
  const progressPercentage = Math.round((completedCount / totalChapters) * 100);

  useEffect(() => {
    setOutput("Run the code to see output...");
  }, [chapter.id]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      saveCodeSnippet(chapter.id, value);
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput("Executing via WebAssembly...\n\n");
    
    setTimeout(() => {
      let executionOutput = "";
      
      // @ts-ignore
      if (typeof window.runGoCode === 'function') {
        try {
          // @ts-ignore
          executionOutput = window.runGoCode(code);
        } catch (e) {
          executionOutput = "WASM Execution Error: " + e;
        }
      } else {
        executionOutput = "WASM engine is still loading... please try again in a moment.";
      }
      
      const result = chapter.validate(code);
      if (result.success) {
        markChapterCompleted(chapter.id);
      }
      
      setOutput("[Terminal Output]\n" + executionOutput + "\n\n[Challenge Validation]\n" + result.message);
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className={"sidebar-icon " + (!showChapters ? "active" : "")} onClick={() => setShowChapters(false)} title="Current Lesson">
          <BookOpen size={20} />
        </div>
        <div className={"sidebar-icon " + (showChapters ? "active" : "")} onClick={() => setShowChapters(true)} title="Chapter List">
          <List size={20} />
        </div>
        <div className="sidebar-icon" style={{ marginTop: 'auto', marginBottom: '20px' }}>
          <Settings size={20} />
        </div>
      </div>

      {/* Lesson Content Pane */}
      <div className="content-pane">
        <div className="progress-container">
          <div className="progress-bar" style={{ width: progressPercentage + "%" }}></div>
        </div>
        <div className="progress-text">{progressPercentage}% Completed</div>

        {showChapters ? (
          <div className="chapter-list-pane">
            <div className="chapter-header">
              <h1 className="chapter-title">Table of Contents</h1>
            </div>
            <div className="chapter-list">
              {chapters.map((c) => (
                <div 
                  key={c.id} 
                  className={"chapter-list-item " + (c.id === chapter.id ? "active" : "")}
                  onClick={() => { setChapter(c.id); setShowChapters(false); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="chapter-list-tag">{c.tag}</div>
                      <div className="chapter-list-title">{c.title}</div>
                    </div>
                    {completedChapters[c.id] && <CheckCircle size={20} color="#10b981" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="chapter-header">
              <span className="chapter-tag">{chapter.tag}</span>
              <h1 className="chapter-title">{chapter.title}</h1>
            </div>
            <div className="chapter-content">
              <div dangerouslySetInnerHTML={{ __html: chapter.content }} />

              <div className="challenge-box">
                <div className="challenge-title">
                  <CheckCircle size={18} color={completedChapters[chapter.id] ? "#10b981" : "#fbbf24"} />
                  <span>Challenge: {chapter.challengeTitle}</span>
                </div>
                <div dangerouslySetInnerHTML={{ __html: chapter.challengeDescription }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Editor & Terminal Pane */}
      <div className="editor-pane">
        <div className="editor-toolbar">
          <div className="file-name">
            <ChevronRight size={16} /> main.go
          </div>
          <button className="run-btn" onClick={runCode} disabled={isRunning}>
            <Play size={16} fill="currentColor" /> {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
        
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            defaultLanguage="go"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div className="terminal-pane">
          <div className="terminal-header">Output Console</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {output}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
