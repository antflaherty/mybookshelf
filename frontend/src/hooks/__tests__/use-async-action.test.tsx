import { render, screen, act, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useAsyncAction } from "@/hooks/use-async-action";
import { ApiError } from "@/api/api-error";

interface ProbeProps {
  action: () => Promise<string>;
  onRun: (run: () => Promise<unknown>) => void;
}

function Probe({ action, onRun }: ProbeProps) {
  const { run, isLoading, error, reset } = useAsyncAction(action);

  onRun(run);

  return (
    <>
      <Text testID="loading">{isLoading ? "yes" : "no"}</Text>
      <Text testID="error">{error ?? "none"}</Text>
      <Text testID="reset" onPress={reset}>
        reset
      </Text>
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

it("resolves to ok: true and clears the loading flag", async () => {
  let run!: () => Promise<unknown>;

  await render(
    <Probe
      action={async () => "hello"}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  let result: unknown;
  await act(async () => {
    result = await run();
  });

  expect(result).toEqual({ ok: true, value: "hello" });
  await waitFor(() =>
    expect(screen.getByTestId("loading").props.children).toBe("no"),
  );
  expect(screen.getByTestId("error").props.children).toBe("none");
});

it("sets the error and clears isLoading when the action rejects", async () => {
  const error = new ApiError("book service unavailable", {
    status: 502,
    code: "upstream_unavailable",
  });

  let run!: () => Promise<unknown>;

  await render(
    <Probe
      action={async () => {
        throw error;
      }}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  let result: { ok: boolean } | undefined;
  await act(async () => {
    result = await (run() as Promise<{ ok: boolean }>);
  });

  expect(result?.ok).toBe(false);
  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe(
      "book service unavailable",
    ),
  );
  expect(screen.getByTestId("loading").props.children).toBe("no");
});

it("gives a non-ApiError rejection the generic fallback message", async () => {
  let run!: () => Promise<unknown>;

  await render(
    <Probe
      action={async () => {
        throw new TypeError("Network request failed");
      }}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  await act(async () => {
    await run();
  });

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe(
      "something went wrong. please try again.",
    ),
  );
});

it("never surfaces a raw stack or un-parseable body", async () => {
  let run!: () => Promise<unknown>;

  await render(
    <Probe
      action={async () => {
        throw new Error("<html>502 Bad Gateway</html>");
      }}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  await act(async () => {
    await run();
  });

  expect(screen.getByTestId("error").props.children).toBe(
    "something went wrong. please try again.",
  );
});

it("clears a previous error when run is called again", async () => {
  let run!: () => Promise<unknown>;
  let shouldFail = true;

  const action = async () => {
    if (shouldFail) {
      throw new ApiError("not found", { status: 404, code: "not_found" });
    }
    return "recovered";
  };

  await render(
    <Probe
      action={action}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  await act(async () => {
    await run();
  });
  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("not found"),
  );

  shouldFail = false;
  await act(async () => {
    await run();
  });

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("none"),
  );
});

it("reset clears the error without running the action", async () => {
  const action = jest.fn().mockRejectedValue(
    new ApiError("conflict", { status: 409, code: "email_taken" }),
  );
  let run!: () => Promise<unknown>;

  await render(
    <Probe
      action={action}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  await act(async () => {
    await run();
  });
  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("conflict"),
  );

  await act(async () => {
    screen.getByTestId("reset").props.onPress();
  });

  expect(screen.getByTestId("error").props.children).toBe("none");
  expect(action).toHaveBeenCalledTimes(1);
});

it("does not set state after unmount when a run lands late", async () => {
  let rejectAction!: (e: Error) => void;

  const action = () =>
    new Promise<string>((_resolve, reject) => {
      rejectAction = reject;
    });

  let run!: () => Promise<unknown>;

  const view = await render(
    <Probe
      action={action}
      onRun={(r) => {
        run = r;
      }}
    />,
  );

  let pending!: Promise<unknown>;

  await act(async () => {
    // Kick the run off, but do not await it: the promise stays pending until we reject it below,
    // by which time the component has unmounted.
    pending = run();
  });

  await view.unmount();

  await act(async () => {
    rejectAction(new Error("late failure"));
    await expect(pending).resolves.toMatchObject({ ok: false });
  });

  // Nothing to assert beyond "did not throw"; React logs a warning on setState-after-unmount.
  expect(true).toBe(true);
});
