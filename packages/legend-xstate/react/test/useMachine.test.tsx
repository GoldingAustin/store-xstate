/// <reference types="vitest/globals" />
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 David Khourshid
 * Copyright (c) 2022 Austin Golding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { fireEvent, screen, render, act } from '@testing-library/react';
import * as React from 'react';
import { AnyState, DoneEventObject, doneInvoke, Interpreter, InterpreterFrom, send, spawn, State } from 'xstate';
import { assign, createObservableMachine } from 'legend-xstate';
import { useActor, useMachine } from '../src';
import { FC, useCallback, useState } from 'react';
import { vitest } from 'vitest';
import { opaqueObject } from '@legendapp/state';
import { observer } from '@legendapp/state/react-components';

describe('legend useMachine test', () => {
  const context = {
    data: undefined,
  };
  const fetchMachine = () =>
    createObservableMachine<typeof context, { type: 'FETCH' } | DoneEventObject>({
      id: 'fetch',
      initial: 'idle',
      context: {
        data: undefined,
      },
      states: {
        idle: {
          on: { FETCH: 'loading' },
        },
        loading: {
          invoke: {
            id: 'fetchData',
            src: 'fetchData',
            onDone: {
              target: 'success',
              actions: assign((store, e) => store.data.set(e.data)),
              cond: (_, e) => e.data.length,
            },
          },
        },
        success: {
          type: 'final',
        },
      },
    });

  const persistedFetchState = fetchMachine().transition('loading', doneInvoke('fetchData', 'persisted data'));

  const Fetcher: FC<{
    onFetch: () => Promise<any>;
    persistedState?: AnyState;
  }> = ({ onFetch = () => new Promise((res) => res('some data')), persistedState }) => {
    const [current, send] = useMachine(fetchMachine, {
      services: {
        fetchData: onFetch,
      },
      state: persistedState,
    });

    switch (current.value) {
      case 'idle':
        return <button onClick={(_) => send('FETCH')}>Fetch</button>;
      case 'loading':
        return <div>Loading...</div>;
      case 'success':
        return (
          <div>
            Success! Data: <div data-testid="data">{current.context.data.get()}</div>
          </div>
        );
      default:
        return null;
    }
  };

  test('should work with the useMachine hook', async () => {
    render(<Fetcher onFetch={() => new Promise((res) => res('fake data'))} />);
    const button = screen.getByText('Fetch');
    fireEvent.click(button);
    screen.getByText('Loading...');
    await screen.findByText(/Success/);
    const dataEl = screen.getByTestId('data');
    expect(dataEl.textContent).toBe('fake data');
  });

  test('should work with the useMachine hook (rehydrated state)', async () => {
    render(<Fetcher onFetch={() => new Promise((res) => res('fake data'))} persistedState={persistedFetchState} />);

    await screen.findByText(/Success/);
    const dataEl = screen.getByTestId('data');
    expect(dataEl.textContent).toBe('persisted data');
  });

  test('should work with the useMachine hook (rehydrated state config)', async () => {
    const persistedFetchStateConfig = JSON.parse(
      JSON.stringify({ ...persistedFetchState, context: persistedFetchState.context.get() })
    );
    render(
      <Fetcher onFetch={() => new Promise((res) => res('fake data'))} persistedState={persistedFetchStateConfig} />
    );

    await screen.findByText(/Success/);
    const dataEl = screen.getByTestId('data');
    expect(dataEl.textContent).toBe('persisted data');
  });

  test('should provide the service', () => {
    const Test = () => {
      const [, , service] = useMachine(fetchMachine);

      if (!(service instanceof Interpreter)) {
        throw new Error('service not instance of Interpreter');
      }

      return null;
    };

    render(<Test />);
  });

  test('should provide options for the service', () => {
    const Test = () => {
      const [, , service] = useMachine(fetchMachine, {
        execute: false,
      });

      expect(service.options.execute).toBe(false);

      return null;
    };

    render(<Test />);
  });

  test('should merge machine context with options.context', () => {
    const testMachine = createObservableMachine<{ foo: string; test: boolean }>({
      context: {
        foo: 'bar',
        test: false,
      },
      initial: 'idle',
      states: {
        idle: {},
      },
    });

    const Test = () => {
      const [state] = useMachine(testMachine, { context: { test: true } });
      expect(state.context.get()).toEqual({
        foo: 'bar',
        test: true,
      });

      return null;
    };

    render(<Test />);
  });

  test('should not spawn actors until service is started', () =>
    new Promise<void>(async (done) => {
      const spawnMachine = createObservableMachine<{ ref: any }>({
        id: 'spawn',
        initial: 'start',
        context: { ref: undefined },
        states: {
          start: {
            entry: assign((store) => {
              store.ref.set(opaqueObject(spawn(() => new Promise((res) => res(42)), 'my-promise')));
            }),
            on: {
              [doneInvoke('my-promise')]: 'success',
            },
          },
          success: {
            type: 'final',
          },
        },
      });

      const Spawner = () => {
        const [current] = useMachine(spawnMachine);

        switch (current.value) {
          case 'start':
            return <span data-testid="start" />;
          case 'success':
            return <span data-testid="success" />;
          default:
            return null;
        }
      };

      render(<Spawner />);
      await screen.findByTestId('success');
      done();
    }));

  test('actions should not have stale data', () =>
    new Promise<void>(async (done) => {
      const toggleMachine = createObservableMachine<any, { type: 'TOGGLE' }>({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
          },
          active: {
            entry: 'doAction',
          },
        },
      });

      const Toggle = () => {
        const [ext, setExt] = useState(false);

        const doAction = useCallback(() => {
          expect(ext).toBeTruthy();
          done();
        }, [ext]);

        const [, send] = useMachine(toggleMachine, {
          actions: {
            doAction,
          },
        });

        return (
          <>
            <button
              data-testid="extbutton"
              onClick={(_) => {
                setExt(true);
              }}
            />
            <button
              data-testid="button"
              onClick={(_) => {
                send('TOGGLE');
              }}
            />
          </>
        );
      };

      render(<Toggle />);

      const button = screen.getByTestId('button');
      const extButton = screen.getByTestId('extbutton');
      fireEvent.click(extButton);

      fireEvent.click(button);
    }));

  test('should compile with typed matches (createObservableMachine)', () => {
    interface TestContext {
      count?: number;
      user?: { name: string };
    }

    type TestState =
      | {
          value: 'loading';
          context: { count: number; user: undefined };
        }
      | {
          value: 'loaded';
          context: { user: { name: string } };
        };

    const machine = createObservableMachine<TestContext, any, TestState>({
      initial: 'loading',
      states: {
        loading: {
          initial: 'one',
          states: {
            one: {},
            two: {},
          },
        },
        loaded: {},
      },
    });

    const ServiceApp: React.FC<{
      service: InterpreterFrom<typeof machine>;
    }> = ({ service }) => {
      const [state] = useActor(service);

      if (state.matches('loaded')) {
        const name = state.context.user?.get()?.name;

        // never called - it's okay if the name is undefined
        expect(name).toBeTruthy();
      } else if (state.matches('loading')) {
        // Make sure state isn't "never" - if it is, tests will fail to compile
        expect(state).toBeTruthy();
      }

      return null;
    };

    const App = () => {
      const [state, , service] = useMachine(machine);

      if (state.matches('loaded')) {
        const name = state.context.user?.get()?.name;

        // never called - it's okay if the name is undefined
        expect(name).toBeTruthy();
      } else if (state.matches('loading')) {
        // Make sure state isn't "never" - if it is, tests will fail to compile
        expect(state).toBeTruthy();
      }

      return <ServiceApp service={service} />;
    };

    // Just testing that it compiles
    render(<App />);
  });

  test('should successfully spawn actors from the lazily declared context', () => {
    let childSpawned = false;

    const machine = createObservableMachine({
      context: () => ({
        ref: spawn(() => {
          childSpawned = true;
        }),
      }),
    });

    const App = () => {
      useMachine(machine);
      return null;
    };

    render(<App />);

    expect(childSpawned).toBe(true);
  });

  test('should be able to use an action provided outside of React', () => {
    let actionCalled = false;

    const machine = createObservableMachine(
      {
        on: {
          EV: {
            actions: 'foo',
          },
        },
      },
      {
        actions: {
          foo: () => (actionCalled = true),
        },
      }
    );

    const App = () => {
      const [_state, send] = useMachine(machine);
      React.useEffect(() => {
        send({ type: 'EV' });
      }, []);
      return null;
    };

    render(<App />);

    expect(actionCalled).toBe(true);
  });

  test('should be able to use a guard provided outside of React', () => {
    let guardCalled = false;

    const machine = createObservableMachine(
      {
        initial: 'a',
        states: {
          a: {
            on: {
              EV: {
                cond: 'isAwesome',
                target: 'b',
              },
            },
          },
          b: {},
        },
      },
      {
        guards: {
          isAwesome: () => {
            guardCalled = true;
            return true;
          },
        },
      }
    );

    const App = () => {
      const [_state, send] = useMachine(machine);
      React.useEffect(() => {
        send({ type: 'EV' });
      }, []);
      return null;
    };

    render(<App />);

    expect(guardCalled).toBe(true);
  });

  test('should be able to use a service provided outside of React', () => {
    let serviceCalled = false;

    const machine = createObservableMachine(
      {
        initial: 'a',
        states: {
          a: {
            on: {
              EV: 'b',
            },
          },
          b: {
            invoke: {
              src: 'foo',
            },
          },
        },
      },
      {
        services: {
          foo: () => {
            serviceCalled = true;
            return Promise.resolve();
          },
        },
      }
    );

    const App = () => {
      const [_state, send] = useMachine(machine);
      React.useEffect(() => {
        send({ type: 'EV' });
      }, []);
      return null;
    };

    render(<App />);

    expect(serviceCalled).toBe(true);
  });

  test('should be able to use a delay provided outside of React', () => {
    vitest.useFakeTimers();

    const machine = createObservableMachine(
      {
        initial: 'a',
        states: {
          a: {
            on: {
              EV: 'b',
            },
          },
          b: {
            after: {
              myDelay: 'c',
            },
          },
          c: {},
        },
      },
      {
        delays: {
          myDelay: () => {
            return 300;
          },
        },
      }
    );

    const App = () => {
      const [state, send] = useMachine(machine);
      return (
        <>
          <div data-testid="result">{state.value.toString()}</div>
          <button onClick={() => send({ type: 'EV' })} />
        </>
      );
    };

    render(<App />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('result').textContent).toBe('b');

    act(() => {
      vitest.advanceTimersByTime(310);
    });

    expect(screen.getByTestId('result').textContent).toBe('c');
  });

  test('should not use stale data in a guard', () => {
    const machine = createObservableMachine({
      initial: 'a',
      states: {
        a: {
          on: {
            EV: {
              cond: 'isAwesome',
              target: 'b',
            },
          },
        },
        b: {},
      },
    });

    const App = ({ isAwesome }: { isAwesome: boolean }) => {
      const [state, send] = useMachine(machine, {
        guards: {
          isAwesome: () => isAwesome,
        },
      });
      return (
        <>
          <div data-testid="result">{state.value.toString()}</div>
          <button onClick={() => send({ type: 'EV' })} />
        </>
      );
    };

    const { rerender } = render(<App isAwesome={false} />);
    rerender(<App isAwesome={true} />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    expect(screen.getByTestId('result').textContent).toBe('b');
  });

  test('should not invoke initial services more than once', () => {
    let activatedCount = 0;
    const machine = createObservableMachine({
      initial: 'active',
      invoke: {
        src: () => {
          activatedCount++;
          return () => {};
        },
      },
      states: {
        active: {},
      },
    });

    const Test = () => {
      useMachine(machine);

      return null;
    };

    render(<Test />);

    expect(activatedCount).toEqual(1);
  });

  test('child component should be able to send an event to a parent immediately in an effect', () =>
    new Promise<void>((done) => {
      const machine = createObservableMachine<any, { type: 'FINISH' }>({
        initial: 'active',
        states: {
          active: {
            on: { FINISH: 'success' },
          },
          success: {},
        },
      });

      const ChildTest: React.FC<{ send: any }> = ({ send }) => {
        // This will send an event to the parent service
        // BEFORE the service is ready.
        React.useLayoutEffect(() => {
          send({ type: 'FINISH' });
        }, []);

        return null;
      };

      const Test = () => {
        const [state, send] = useMachine(machine);

        if (state.matches('success')) {
          done();
        }

        return <ChildTest send={send} />;
      };

      render(<Test />);
    }));

  test('custom data should be available right away for the invoked actor', () => {
    const childMachine = createObservableMachine({
      initial: 'intitial',
      context: {
        value: 100,
      },
      states: {
        intitial: {},
      },
    });

    const machine = createObservableMachine({
      initial: 'active',
      states: {
        active: {
          invoke: {
            id: 'test',
            src: childMachine,
            data: {
              store: {
                value: 42,
              },
            },
          },
        },
      },
    });

    const Test = () => {
      const [state] = useMachine(machine);
      const [childState] = useActor(state.children.test);

      expect(childState.context.store.value).toBe(42);

      return null;
    };

    render(<Test />);
  });

  // https://github.com/statelyai/xstate/issues/1334
  test('delayed transitions should work when initializing from a rehydrated state', () => {
    vitest.useFakeTimers();
    const testMachine = createObservableMachine<any, { type: 'START' }>({
      id: 'app',
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: 'doingStuff',
          },
        },
        doingStuff: {
          id: 'doingStuff',
          after: {
            100: 'idle',
          },
        },
      },
    });

    const persistedState = JSON.stringify(testMachine.initialState);

    let currentState: State<any, any, any, any, any>;

    const Test = () => {
      const [state, send] = useMachine(testMachine, {
        state: State.create(JSON.parse(persistedState)),
      });

      currentState = state;

      return <button onClick={() => send('START')} data-testid="button"></button>;
    };

    render(<Test />);

    const button = screen.getByTestId('button');

    fireEvent.click(button);
    act(() => {
      vitest.advanceTimersByTime(110);
    });

    expect(currentState!.matches('idle')).toBe(true);
  });

  test('should accept a lazily created machine', () => {
    const App = () => {
      const [state] = useMachine(() =>
        createObservableMachine({
          initial: 'idle',
          states: {
            idle: {},
          },
        })
      );

      expect(state.matches('idle')).toBeTruthy();

      return null;
    };

    render(<App />);
  });

  test('should not miss initial synchronous updates', () => {
    const m = createObservableMachine<{ count: number }>({
      initial: 'idle',
      context: {
        count: 0,
      },
      entry: [assign((c) => c.assign({ count: 1 })), send('INC')],
      on: {
        INC: {
          actions: [assign((c) => c.count.set((c) => c + 1)), send('UNHANDLED')],
        },
      },
      states: {
        idle: {},
      },
    });

    const App = observer(() => {
      const [state] = useMachine(m);
      return <>{state.context.count.get()}</>;
    });

    const { container } = render(<App />);

    expect(container.textContent).toBe('2');
  });
});
