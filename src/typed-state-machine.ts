type BaseStateOrEvent = { type: string };

type InitialStateDefinition<State extends BaseStateOrEvent> = (
  state: State
) => void;

type StateDefinition<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> = <StateType extends State["type"]>(
  type: StateType,
  stateDefinitionCallback: (args: {
    onEnter: OnEnterOrExit<State, StateType>;
    onExit: OnEnterOrExit<State, StateType>;
    on: OnEvent<State, StateType, Event>;
  }) => void
) => void;

type OnEnterOrExitCallback<
  State extends BaseStateOrEvent,
  StateType extends State["type"]
> = (args: { state: Extract<State, { type: StateType }> }) => void;

type OnEnterOrExit<
  State extends BaseStateOrEvent,
  StateType extends State["type"]
> = (onEnterOrExitCallback: OnEnterOrExitCallback<State, StateType>) => void;

type OnEventCallback<
  State extends BaseStateOrEvent,
  StateType extends State["type"],
  Event extends BaseStateOrEvent,
  EventType extends Event["type"]
> = (args: {
  state: Extract<State, { type: StateType }>;
  event: Extract<Event, { type: EventType }>;
  transitionTo: (state: State, sideEffect?: () => void) => Transition<State>;
  dontTransition: (sideEffect?: () => void) => Transition<State>;
}) => Transition<State>;

type OnEvent<
  State extends BaseStateOrEvent,
  StateType extends State["type"],
  Event extends BaseStateOrEvent
> = <EventType extends Event["type"]>(
  type: EventType,
  onEventCallback: OnEventCallback<State, StateType, Event, EventType>
) => void;

type MachineConfiguration<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> = Record<string, StateConfiguration<State, Event> | undefined>;

type OnEnterOrExitConfiguration<State extends BaseStateOrEvent> = (args: {
  state: State;
}) => void;

type OnEventConfiguration<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> = (args: {
  state: State;
  event: Event;
  transitionTo: (state: State, sideEffect?: void) => Transition<State>;
  dontTransition: (sideEffect?: void) => Transition<State>;
}) => Transition<State>;

type StateConfiguration<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> = {
  onEnter?: OnEnterOrExitConfiguration<State>;
  onExit?: OnEnterOrExitConfiguration<State>;
  on: Record<string, OnEventConfiguration<State, Event> | undefined>;
};

type Transition<State> = {
  state: State | null;
  sideEffect: (() => void) | null;
};

type Listener<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> = (previous: State | null, current: State, event: Event | null) => void;

class StateMachine<
  State extends BaseStateOrEvent,
  Event extends BaseStateOrEvent
> {
  private _currentState!: State;
  private _configuration: MachineConfiguration<State, Event> = {};
  private _listeners = new Set<Listener<State, Event>>();
  private _scopeStack: string[] = [];

  public constructor(
    configCallback: ({
      initialState,
      state,
    }: {
      initialState: InitialStateDefinition<State>;
      state: StateDefinition<State, Event>;
    }) => void
  ) {
    if (typeof configCallback !== "function") {
      throw new Error(
        "The StateMachine constructor expects a callback as the first argument"
      );
    }

    this._scopeStack.unshift("config");
    configCallback({
      initialState: (state) => {
        this._checkConfigScope();
        this._currentState = state;
      },
      state: (state, stateDefinitionCallback) => {
        this._checkConfigScope();
        const stateConfiguration: StateConfiguration<State, Event> = {
          on: {},
        };

        this._scopeStack.unshift("state");
        stateDefinitionCallback({
          onEnter: (onEnterCallback) => {
            this._checkStateScope("onEnter");
            stateConfiguration.onEnter =
              onEnterCallback as OnEnterOrExitConfiguration<State>;
          },
          onExit: (onExitCallback) => {
            this._checkStateScope("onExit");
            stateConfiguration.onExit =
              onExitCallback as OnEnterOrExitConfiguration<State>;
          },
          on: (type, onEventCallback) => {
            this._checkStateScope("on");
            stateConfiguration.on[type] =
              onEventCallback as OnEventConfiguration<State, Event>;
          },
        });
        this._scopeStack.shift();

        this._configuration[state] = stateConfiguration;
      },
    });
    this._scopeStack.shift();

    if (this._currentState === undefined) {
      throw new Error("No initial state provided");
    }

    if (Object.keys(this._configuration).length === 0) {
      throw new Error("No state definition was provided");
    }

    this._configuration[this._currentState.type]?.onEnter?.({
      state: this._currentState,
    });
  }

  public transition(event: Event): void {
    const stateDefinition = this._configuration[this._currentState.type];

    if (!stateDefinition) {
      return;
    }

    const onEvent = stateDefinition.on[event.type];

    if (!onEvent) {
      return;
    }

    const { state, sideEffect } = onEvent({
      state: this._currentState,
      event,
      transitionTo: (state, sideEffect) => ({
        state,
        sideEffect: sideEffect ?? null,
      }),
      dontTransition: (sideEffect) => ({
        state: null,
        sideEffect: sideEffect ?? null,
      }),
    });

    const previousState = this._currentState;

    if (state !== null) {
      stateDefinition.onExit?.({ state: this._currentState });
      this._currentState = state;
      this._configuration[state.type]?.onEnter?.({ state });
    }

    for (const listener of this._listeners) {
      listener(previousState, state ?? previousState, event);
    }

    if (sideEffect) {
      setTimeout(() => {
        sideEffect?.();
      }, 0);
    }
  }

  public subscribe(listener: Listener<State, Event>) {
    this._listeners.add(listener);
    listener(null, this._currentState, null);
    return () => {
      this._listeners.delete(listener);
    };
  }

  public get state(): State {
    return this._currentState;
  }

  private _checkConfigScope() {
    if (this._scopeStack[0] !== "config") {
      throw new Error(
        "Call to `initialState` is allowed only from within the config callback, but not inside a state callback"
      );
    }
  }

  private _checkStateScope(name: string) {
    if (this._scopeStack[0] !== "state") {
      throw new Error(
        `Call to \`${name}\` is allowed only from within a state callback`
      );
    }
  }
}

export { StateMachine };
export type {
  BaseStateOrEvent,
  InitialStateDefinition,
  StateDefinition,
  OnEnterOrExitCallback,
  OnEnterOrExit,
  OnEventCallback,
  OnEvent,
  Transition,
  Listener,
};
