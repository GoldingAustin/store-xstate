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
import { useActor, useMachine } from '../src';
import { ActorRef, ActorRefFrom, interpret, sendParent, spawn, toActorRef } from 'xstate';
import React, { FC, useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createObservableMachine, assign } from 'legend-xstate';
import { vitest } from 'vitest';
import { observer } from '@legendapp/state/react-components';
import { opaqueObject } from '@legendapp/state';

describe('legend useActor test', () => {
  test('initial invoked actor should be immediately available', () =>
    new Promise<void>((done) => {
      const childMachine = createObservableMachine({
        id: 'childMachine',
        initial: 'active',
        states: {
          active: {},
        },
      });
      const machine = createObservableMachine({
        initial: 'active',
        invoke: {
          id: 'child',
          src: childMachine,
        },
        states: {
          active: {},
        },
      });

      const ChildTest: FC<{ actor: ActorRefFrom<typeof childMachine> }> = observer(({ actor }) => {
        const [state] = useActor(actor);

        expect(state.value).toEqual('active');

        done();

        return null;
      });

      const Test = observer(() => {
        const [state] = useMachine(machine);

        return <ChildTest actor={state.children.child as ActorRefFrom<typeof childMachine>} />;
      });

      render(<Test />);
    }));

  test('invoked actor should be able to receive (deferred) events that it replays when active', () =>
    new Promise<void>((done) => {
      const childMachine = createObservableMachine({
        id: 'childMachine',
        initial: 'active',
        states: {
          active: {
            on: {
              FINISH: { actions: sendParent('FINISH') },
            },
          },
        },
      });
      const machine = createObservableMachine({
        initial: 'active',
        invoke: {
          id: 'child',
          src: childMachine,
        },
        states: {
          active: {
            on: { FINISH: 'success' },
          },
          success: {},
        },
      });

      const ChildTest: FC<{ actor: ActorRefFrom<typeof childMachine> }> = ({ actor }) => {
        const [state, send] = useActor(actor);

        expect(state.value).toEqual('active');

        useEffect(() => {
          send({ type: 'FINISH' });
        }, []);

        return null;
      };

      const Test = () => {
        const [state] = useMachine(machine);

        if (state.matches('success')) {
          done();
        }

        return <ChildTest actor={state.children.child as ActorRefFrom<typeof childMachine>} />;
      };

      render(<Test />);
    }));

  test('initial spawned actor should be immediately available', () =>
    new Promise<void>((done) => {
      const childMachine = createObservableMachine({
        id: 'childMachine',
        initial: 'active',
        states: {
          active: {},
        },
      });

      interface Ctx {
        actorRef: undefined | ActorRefFrom<typeof childMachine>;
      }

      const machine = createObservableMachine<Ctx>({
        initial: 'active',
        context: {
          actorRef: undefined,
        },
        states: {
          active: {
            entry: assign((store) => {
              store.actorRef?.set(opaqueObject(spawn(childMachine)));
            }),
          },
        },
      });

      const ChildTest: React.FC<{ actor: ActorRefFrom<typeof childMachine> }> = ({ actor }) => {
        const [state] = useActor(actor);

        expect(state.value).toEqual('active');

        done();

        return null;
      };

      const Test = () => {
        const [state] = useMachine(machine);
        const { actorRef } = state.context;

        return <ChildTest actor={actorRef?.get()!} />;
      };

      render(<Test />);
    }));

  test('spawned actor should be able to receive (deferred) events that it replays when active', () =>
    new Promise<void>((done) => {
      const childMachine = createObservableMachine({
        id: 'childMachine',
        initial: 'active',
        states: {
          active: {
            on: {
              FINISH: { actions: sendParent('FINISH') },
            },
          },
        },
      });
      const machine = createObservableMachine<{
        actorRef: undefined | ActorRefFrom<typeof childMachine>;
      }>({
        initial: 'active',
        context: {
          actorRef: undefined,
        },
        states: {
          active: {
            entry: assign((store) => {
              store.actorRef?.set(() => opaqueObject(spawn(childMachine)));
            }),
            on: { FINISH: 'success' },
          },
          success: {},
        },
      });

      const ChildTest: React.FC<{ actor: ActorRefFrom<typeof childMachine> }> = observer(({ actor }) => {
        const [state, send] = useActor(actor);

        expect(state.value).toEqual('active');

        React.useEffect(() => {
          send({ type: 'FINISH' });
        }, []);

        return null;
      });

      const Test = observer(() => {
        const [state] = useMachine(machine);

        if (state.matches('success')) {
          done();
        }

        return <ChildTest actor={state.context.actorRef.get()!} />;
      });

      render(<Test />);
    }));

  test('actor should provide snapshot value immediately', () => {
    const simpleActor = toActorRef({
      send: () => {
        /* ... */
      },
      latestValue: 42,
      subscribe: () => {
        return {
          unsubscribe: () => {
            /* ... */
          },
        };
      },
    }) as ActorRef<any, number> & {
      latestValue: number;
    };

    const Test = () => {
      const [state] = useActor(simpleActor, (a) => a.latestValue);

      return <div data-testid="state">{state}</div>;
    };

    render(<Test />);

    const div = screen.getByTestId('state');

    expect(div.textContent).toEqual('42');
  });

  test('should provide value from `actor.getSnapshot()`', () => {
    const simpleActor = toActorRef({
      id: 'test',
      send: () => {
        /* ... */
      },
      getSnapshot: () => 42,
      subscribe: () => {
        return {
          unsubscribe: () => {
            /* ... */
          },
        };
      },
    });

    const Test = () => {
      const [state] = useActor(simpleActor);

      return <div data-testid="state">{state}</div>;
    };

    render(<Test />);

    const div = screen.getByTestId('state');

    expect(div.textContent).toEqual('42');
  });

  test('should update snapshot value when actor changes', () => {
    const createSimpleActor = (value: number) =>
      toActorRef({
        send: () => {
          /* ... */
        },
        latestValue: value,
        subscribe: () => {
          return {
            unsubscribe: () => {
              /* ... */
            },
          };
        },
      }) as ActorRef<any> & { latestValue: number };

    const Test = observer(() => {
      const [actor, setActor] = useState(createSimpleActor(42));
      const [state] = useActor(actor, (a) => a.latestValue);

      return (
        <>
          <div data-testid="state">{state}</div>
          <button data-testid="button" onClick={() => setActor(createSimpleActor(100))}></button>
        </>
      );
    });

    render(<Test />);

    const div = screen.getByTestId('state');
    const button = screen.getByTestId('button');

    expect(div.textContent).toEqual('42');
    fireEvent.click(button);
    expect(div.textContent).toEqual('100');
  });

  test('send() should be stable', () =>
    new Promise<void>((done) => {
      vitest.useFakeTimers();
      const fakeSubscribe = () => {
        return {
          unsubscribe: () => {
            /* ... */
          },
        };
      };
      const noop = () => {
        /* ... */
      };
      const firstActor = toActorRef({
        send: noop,
        subscribe: fakeSubscribe,
      });
      const lastActor = toActorRef({
        send: () => {
          done();
        },
        subscribe: fakeSubscribe,
      });

      const Test = () => {
        const [actor, setActor] = useState(firstActor);
        const [, send] = useActor(actor);

        React.useEffect(() => {
          setTimeout(() => {
            // The `send` here is closed-in
            send({ type: 'anything' });
          }, 10);
        }, []); // Intentionally omit `send` from dependency array

        return (
          <>
            <button data-testid="button" onClick={() => setActor(lastActor)}></button>
          </>
        );
      };

      render(<Test />);

      // At this point, `send` refers to the first (noop) actor

      const button = screen.getByTestId('button');
      fireEvent.click(button);

      // At this point, `send` refers to the last actor

      vitest.advanceTimersByTime(20);

      // The effect will call the closed-in `send`, which originally
      // was the reference to the first actor. Now that `send` is stable,
      // it will always refer to the latest actor.
    }));

  test('should also work with services', () => {
    const counterMachine = createObservableMachine<{ count: number }, { type: 'INC' } | { type: 'SOMETHING' }>(
      {
        id: 'counter',
        initial: 'active',
        context: { count: 0 },
        states: {
          active: {
            on: {
              INC: { actions: assign((store) => store.count.set((c) => c + 1)) },
              SOMETHING: { actions: 'doSomething' },
            },
          },
        },
      },
      {
        actions: {
          doSomething: () => {
            /* do nothing */
          },
        },
      }
    );
    const counterService = interpret(counterMachine).start();

    const Counter = observer(() => {
      const [state, send] = useActor(counterService);

      return (
        <div
          data-testid="count"
          onClick={() => {
            send('INC');
            // @ts-expect-error
            send('FAKE');
          }}
        >
          {state.context.count.get()}
        </div>
      );
    });

    render(
      <>
        <Counter />
        <Counter />
      </>
    );

    const countEls = screen.getAllByTestId('count');

    expect(countEls.length).toBe(2);

    countEls.forEach((countEl) => {
      expect(countEl.textContent).toBe('0');
    });

    act(() => {
      counterService.send({ type: 'INC' });
    });

    countEls.forEach((countEl) => {
      expect(countEl.textContent).toBe('1');
    });
  });

  test('should work with initially deferred actors spawned in lazy context', () => {
    const childMachine = createObservableMachine<undefined, { type: 'NEXT' }>({
      initial: 'one',
      states: {
        one: {
          on: { NEXT: 'two' },
        },
        two: {},
      },
    });

    const machine = createObservableMachine<{ ref: ActorRef<any> }>({
      context: () => ({
        ref: opaqueObject(spawn(childMachine) as any),
      }),
      initial: 'waiting',
      states: {
        waiting: {
          on: { TEST: 'success' },
        },
        success: {
          type: 'final',
        },
      },
    });

    const App = observer(() => {
      const [state] = useMachine(machine);
      const [childState, childSend] = useActor(state.context.ref.get());

      return (
        <>
          <div data-testid="child-state">{childState.value}</div>
          <button data-testid="child-send" onClick={() => childSend('NEXT')}></button>
        </>
      );
    });

    render(<App />);

    const elState = screen.getByTestId('child-state');
    const elSend = screen.getByTestId('child-send');

    expect(elState.textContent).toEqual('one');
    fireEvent.click(elSend);

    expect(elState.textContent).toEqual('two');
  });
});
