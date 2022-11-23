import { StateMachine } from "./typed-state-machine";

type BasicStateOrEvent = { type: string };

type TestState =
  | { type: "state1"; state1: boolean }
  | { type: "state2"; state2: boolean }
  | { type: "state3"; state3: boolean };

type TestEvent =
  | { type: "action1"; action1: boolean }
  | { type: "action2"; action2: boolean }
  | { type: "action3"; action3: boolean };

describe("Typed State Machine", () => {
  test("should throw when config callback is not provided", () => {
    // @ts-expect-error Absence of the first arugment is expected
    expect(() => new StateMachine()).toThrowError(
      "The StateMachine constructor expects a callback as the first argument"
    );
  });

  test("should throw when no initial state was provided", () => {
    expect(
      () =>
        new StateMachine(({ state }) => {
          state("state", () => {
            // do nothing
          });
        })
    ).toThrowError("No initial state provided");
  });

  test("should throw when no state definition was provided", () => {
    expect(
      () =>
        new StateMachine(({ initialState }) => {
          initialState({ type: "state" });
        })
    ).toThrowError("No state definition was provided");
  });

  test("should throw when `initialState` is used outside of the config callback", () => {
    const errorMessage =
      "Call to `initialState` is allowed only from within the config callback, but not inside a state callback";
    expect(
      () =>
        new StateMachine(({ initialState, state }) => {
          state("state", () => {
            initialState({ type: "state" });
          });
        })
    ).toThrowError(errorMessage);
    expect(() => {
      let outerInitialState!: Parameters<
        ConstructorParameters<
          typeof StateMachine<BasicStateOrEvent, BasicStateOrEvent>
        >["0"]
      >["0"]["initialState"];
      new StateMachine(({ initialState, state }) => {
        outerInitialState = initialState;
        initialState({ type: "state" });

        state("state", () => {
          // do nothing
        });
      });
      outerInitialState({ type: "state" });
    }).toThrowError(errorMessage);
  });

  test("should throw when `state` is used outside of the config callback", () => {
    const errorMessage =
      "Call to `initialState` is allowed only from within the config callback, but not inside a state callback";
    expect(
      () =>
        new StateMachine(({ initialState, state }) => {
          initialState({ type: "state" });

          state("state", () => {
            state("state", () => {
              // do nothing
            });
          });
        })
    ).toThrowError(errorMessage);
    expect(() => {
      let outerState!: Parameters<
        ConstructorParameters<
          typeof StateMachine<BasicStateOrEvent, BasicStateOrEvent>
        >["0"]
      >["0"]["state"];
      new StateMachine(({ initialState, state }) => {
        outerState = state;
        initialState({ type: "state" });

        state("state", () => {
          // do nothing
        });
      });
      outerState("state", () => {
        //
      });
    }).toThrowError(errorMessage);
  });

  test("should throw when `on` is used outside of the state callback", () => {
    const errorMessage =
      "Call to `on` is allowed only from within a state callback";
    expect(() => {
      let outerOn!: Parameters<
        Parameters<
          Parameters<
            ConstructorParameters<
              typeof StateMachine<BasicStateOrEvent, BasicStateOrEvent>
            >["0"]
          >["0"]["state"]
        >["1"]
      >["0"]["on"];
      new StateMachine<BasicStateOrEvent, BasicStateOrEvent>(
        ({ initialState, state }) => {
          initialState({ type: "state" });

          state("state" as string, ({ on }) => {
            outerOn = on;
          });

          outerOn("state", ({ dontTransition }) => {
            return dontTransition();
          });
        }
      );
    }).toThrowError(errorMessage);
  });

  test("should throw when `onEnter` is used outside of the state callback", () => {
    const errorMessage =
      "Call to `onEnter` is allowed only from within a state callback";
    expect(() => {
      let outerOnEnter!: Parameters<
        Parameters<
          Parameters<
            ConstructorParameters<
              typeof StateMachine<BasicStateOrEvent, BasicStateOrEvent>
            >["0"]
          >["0"]["state"]
        >["1"]
      >["0"]["onEnter"];
      new StateMachine<BasicStateOrEvent, BasicStateOrEvent>(
        ({ initialState, state }) => {
          initialState({ type: "state" });

          state("state" as string, ({ onEnter }) => {
            outerOnEnter = onEnter;
          });

          outerOnEnter(() => {
            // do nothing
          });
        }
      );
    }).toThrowError(errorMessage);
  });

  test("should throw when `onEnter` is used outside of the state callback", () => {
    const errorMessage =
      "Call to `onExit` is allowed only from within a state callback";
    expect(() => {
      let outerOnExit!: Parameters<
        Parameters<
          Parameters<
            ConstructorParameters<
              typeof StateMachine<BasicStateOrEvent, BasicStateOrEvent>
            >["0"]
          >["0"]["state"]
        >["1"]
      >["0"]["onExit"];
      new StateMachine<BasicStateOrEvent, BasicStateOrEvent>(
        ({ initialState, state }) => {
          initialState({ type: "state" });

          state("state" as string, ({ onExit }) => {
            outerOnExit = onExit;
          });

          outerOnExit(() => {
            // do nothing
          });
        }
      );
    }).toThrowError(errorMessage);
  });

  test("should work when setup properly", () => {
    const data: {
      [key: string]: {
        onEnter: number;
        onExit: number;
        on: string[];
      };
    } = {
      state1: {
        onEnter: 0,
        onExit: 0,
        on: [],
      },
      state2: {
        onEnter: 0,
        onExit: 0,
        on: [],
      },
      state3: {
        onEnter: 0,
        onExit: 0,
        on: [],
      },
    };
    const fsm = new StateMachine<TestState, TestEvent>(
      ({ initialState, state }) => {
        initialState({ type: "state1", state1: true });

        state("state1", ({ onEnter, onExit, on }) => {
          onEnter(({ state }) => {
            data.state1.onEnter++;
            expect(state).toEqual({
              type: "state1",
              state1: true,
            });
          });
          onExit(({ state }) => {
            data.state1.onExit++;
            expect(state).toEqual({
              type: "state1",
              state1: true,
            });
          });
          on("action1", ({ transitionTo }) => {
            return transitionTo({ type: "state2", state2: true });
          });
        });
        state("state2", ({ onEnter, onExit, on }) => {
          onEnter(({ state }) => {
            data.state2.onEnter++;
            expect(state).toEqual({
              type: "state2",
              state2: true,
            });
          });
          onExit(({ state }) => {
            data.state2.onExit++;
            expect(state).toEqual({
              type: "state2",
              state2: true,
            });
          });
          on("action2", ({ transitionTo }) => {
            return transitionTo({ type: "state3", state3: true });
          });
        });
        state("state3", ({ onEnter, onExit, on }) => {
          onEnter(({ state }) => {
            data.state3.onEnter++;
            expect(state).toEqual({
              type: "state3",
              state3: true,
            });
          });
          onExit(({ state }) => {
            data.state3.onExit++;
            expect(state).toEqual({
              type: "state3",
              state3: true,
            });
          });
          on("action3", ({ transitionTo }) => {
            return transitionTo({ type: "state1", state1: true });
          });
        });
      }
    );

    let firstCall = true;
    fsm.subscribe((previous, current, event) => {
      if (firstCall) {
        expect(previous).toEqual(null);
        expect(event).toEqual(null);
        firstCall = false;
      }

      expect(current.type).toEqual(expect.any(String));

      if (!previous || !event) {
        return;
      }

      data[previous.type].on.push(event.type);
    });

    fsm.transition({ type: "action1", action1: true });
    expect(fsm.state).toEqual({ type: "state2", state2: true });

    fsm.transition({ type: "action2", action2: true });
    expect(fsm.state).toEqual({ type: "state3", state3: true });

    fsm.transition({ type: "action3", action3: true });
    expect(fsm.state).toEqual({ type: "state1", state1: true });
    expect(data).toEqual({
      state1: { onEnter: 2, onExit: 1, on: ["action1"] },
      state2: { onEnter: 1, onExit: 1, on: ["action2"] },
      state3: { onEnter: 1, onExit: 1, on: ["action3"] },
    });
  });

  test("should execute side effects from the event loop", (done) => {
    const actions: string[] = [];
    const fsm = new StateMachine(({ initialState, state }) => {
      initialState({ type: "state1" });

      state("state1", ({ on }) => {
        on("action1", ({ transitionTo }) => {
          actions.push("action1");
          return transitionTo({ type: "state2" }, () => {
            actions.push("sideEffect1");
          });
        });
      });
      state("state2", ({ on }) => {
        on("action2", ({ transitionTo }) => {
          actions.push("action2");
          return transitionTo({ type: "state3" }, () => {
            actions.push("sideEffect2");
          });
        });
      });
      state("state3", ({ on }) => {
        on("action3", ({ dontTransition }) => {
          actions.push("action3");
          return dontTransition(() => {
            actions.push("sideEffect3");
          });
        });
      });
    });

    fsm.transition({ type: "action1" });
    fsm.transition({ type: "action2" });
    fsm.transition({ type: "action3" });

    setTimeout(() => {
      expect(actions).toEqual([
        "action1",
        "action2",
        "action3",
        "sideEffect1",
        "sideEffect2",
        "sideEffect3",
      ]);
      done();
    }, 0);
  });

  test("should properly unsubscribe when unsubscribe is called", () => {
    let count = 0;
    const fsm = new StateMachine(({ initialState, state }) => {
      initialState({ type: "state1" });

      state("state1", ({ on }) => {
        on("swap", ({ transitionTo }) => {
          return transitionTo({ type: "state2" });
        });
      });

      state("state2", ({ on }) => {
        on("swap", ({ transitionTo }) => {
          return transitionTo({ type: "state1" });
        });
      });
    });

    const unsubscribe1 = fsm.subscribe(() => {
      count++;
    });
    const unsubscribe2 = fsm.subscribe(() => {
      count++;
    });

    expect(count).toEqual(2);

    fsm.transition({ type: "swap" });

    expect(count).toEqual(4);

    unsubscribe1();
    fsm.transition({ type: "swap" });

    expect(count).toEqual(5);

    unsubscribe2();
    fsm.transition({ type: "swap" });

    expect(count).toEqual(5);
  });
});
