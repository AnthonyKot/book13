import type { Chapter } from '../types';

export const ch17: Chapter = {
  id: 'ch17',
  order: 7,
  module: 'think',
  title: 'Defer Evaluates Its Arguments Now, Not on Return',
  mentalModel: 'A defer statement schedules the function call for return time, but evaluates the function value and all of its arguments immediately when defer executes.',
  outcome: 'Observe and report the final outcome of a function in a deferred call by reading variables inside a deferred closure.',
  recognitionCue: 'When a deferred call needs a variable whose value is computed later in the function, wrap the call in defer func() { ... }().',
  prediction: {
    prompt: 'status is updated after the defer statement. What does run print when it returns?',
    code: `func run() {
	status := "starting"
	defer fmt.Println(status)
	status = "finished"
}`,
    options: [
      {
        id: 'finished',
        label: 'finished — defer reads status when run returns',
        explanation: 'The call to fmt.Println is delayed until return, but its argument status was evaluated and copied at the line where defer ran.',
      },
      {
        id: 'starting',
        label: 'starting — the argument was evaluated at the defer line',
        explanation: 'Correct. Go evaluates fmt.Println’s argument immediately when executing the defer statement, capturing "starting". To read the final value on return, use a closure: defer func() { fmt.Println(status) }().',
      },
      {
        id: 'both',
        label: 'starting and then finished',
        explanation: 'fmt.Println is scheduled only once. It runs as run returns, using the argument value captured when defer executed.',
      },
    ],
    correctOptionId: 'starting',
  },
  lesson: `
    <p><code>defer</code> splits a call into two moments: <strong>registration</strong> (when the <code>defer</code> statement is reached) and <strong>execution</strong> (when the surrounding function returns). Everything inside the parentheses—the arguments and any receiver expression—is evaluated at registration time.</p>
    <p>That makes <code>defer file.Close()</code> safe when <code>file</code> will not change, and makes <code>defer report(name, err)</code> a bug when <code>err</code> is still <code>nil</code> at the top of the function. At registration time Go copies <code>nil</code> into the deferred call’s argument slot; later assignments to <code>err</code> never touch that copy.</p>
    <pre><code>// broken: captures err == nil when defer runs
func RunStep(name string, work func() error, report func(string, error)) error {
	var err error
	defer report(name, err)
	err = work()
	return err
}

// fixed: the closure takes no arguments now and reads err when it runs on return
func RunStep(name string, work func() error, report func(string, error)) (err error) {
	defer func() {
		report(name, err)
	}()
	if err = work(); err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	return nil
}</code></pre>
    <p>Pairing a deferred closure with a named return value <code>(err error)</code> guarantees that whatever <code>return</code> statement exits the function, the closure sees the exact final <code>err</code> that the caller receives.</p>
  `,
  challenge: {
    title: 'Report the final error on every exit path',
    description: '<code>RunWithAudit</code> runs <code>work</code>, wraps any failure with the step name, and must call <code>report(name, finalErr)</code> as it returns. Fix the deferred audit so <code>report</code> runs after <code>work</code> and receives the exact error returned to the caller.',
  },
  starterCode: `package main

import (
	"errors"
	"fmt"
)

func RunWithAudit(name string, work func() error, report func(step string, err error)) error {
	var err error
	// BUG: err is evaluated right now (as nil), before work() has even run.
	defer report(name, err)

	err = work()
	if err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	return nil
}

func main() {
	_ = RunWithAudit("migrate", func() error {
		return errors.New("disk full")
	}, func(step string, err error) {
		fmt.Println("audit:", step, "err:", err)
	})
}
`,
  hiddenTestCode: `func() {
	var events []string
	var reportedErr error
	retErr := RunWithAudit("seed", func() error {
		events = append(events, "work")
		return nil
	}, func(step string, err error) {
		events = append(events, "report:"+step)
		reportedErr = err
	})
	if retErr == nil && reportedErr == nil && len(events) == 2 && events[0] == "work" && events[1] == "report:seed" {
		println("__GO_SHIFT_TEST__\\tPASS\\tsuccess audited after work\\tRan work first and reported a nil error on success.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tsuccess audited after work\\tOn success, run work first, report (name, nil) on return, and return nil.")
	}

	boom := errors.New("connection refused")
	var failReported error
	var failStep string
	failRet := RunWithAudit("migrate", func() error {
		return boom
	}, func(step string, err error) {
		failStep = step
		failReported = err
	})
	if failStep == "migrate" && failReported != nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tfailure observed by defer\\tThe deferred audit observed a non-nil error when work failed.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tfailure observed by defer\\treport received a nil error even though work failed. Wrap the call in defer func() { ... }() so err is read at return time.")
	}

	if failRet != nil && failReported != nil && failRet.Error() == "migrate: connection refused" && failReported.Error() == failRet.Error() {
		println("__GO_SHIFT_TEST__\\tPASS\\twrapped error matches return\\tThe audit callback received the exact wrapped error returned to the caller.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\twrapped error matches return\\tBoth the caller and report must receive the wrapped error \\"migrate: connection refused\\". Assign the wrapped error to err (or use a named return) before returning.")
	}

	if errors.Is(failRet, boom) && errors.Is(failReported, boom) {
		println("__GO_SHIFT_TEST__\\tPASS\\tpreserves wrapped cause\\tWrapped the underlying error with %w so errors.Is still matches.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tpreserves wrapped cause\\tKeep fmt.Errorf(\\"%s: %w\\", name, err) so errors.Is matches the original error.")
	}
}()`,
  testNames: ['success audited after work', 'failure observed by defer', 'wrapped error matches return', 'preserves wrapped cause'],
  hints: [
    'Run the starter and look at the output: <code>audit: migrate err: &lt;nil&gt;</code> even though <code>work</code> returned <code>disk full</code>.',
    '<code>defer report(name, err)</code> copies the value of <code>err</code> at the moment the <code>defer</code> statement executes. A closure <code>defer func() { report(name, err) }()</code> reads <code>err</code> when the outer function returns.',
    'Note the second bug once you use a closure: <code>return fmt.Errorf("%s: %w", name, err)</code> does not update <code>err</code> unless you assign <code>err = fmt.Errorf(...)</code> or use a named return <code>(err error)</code>.',
  ],
  debrief: {
    title: 'The shift: registration time vs. return time',
    summary: 'Defer delays the call, not the evaluation of its arguments. Whenever a deferred action depends on state computed later in the function—an error, a status code, or elapsed time—capture the variable by reference inside a zero-argument closure.',
    transfer: 'Why does defer fmt.Println(time.Since(start)) always print nearly 0s, and what one-line change makes it measure the whole function?',
  },
};
