import type { ILink, Terminal } from "@xterm/xterm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLinkProvider } from "./index";
import { postMessage } from "../shared/vscode-api";

vi.mock("../shared/vscode-api", () => ({
  postMessage: vi.fn(),
}));

const mouseEvent = {} as MouseEvent;

function createTerminal(lineText: string): Terminal {
  return {
    buffer: {
      active: {
        getLine: vi.fn((index: number) =>
          index === 0
            ? {
                translateToString: () => lineText,
              }
            : undefined,
        ),
      },
    },
  } as unknown as Terminal;
}

async function provideLinks(lineText: string): Promise<ILink[] | undefined> {
  const provider = createLinkProvider(createTerminal(lineText));

  return new Promise((resolve) => {
    provider.provideLinks(1, resolve);
  });
}

describe("createLinkProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links a relative file path at the start of a line", async () => {
    const links = await provideLinks("src/webview/links/index.ts");

    expect(links).toHaveLength(1);
    expect(links?.[0].text).toBe("src/webview/links/index.ts");
    expect(links?.[0].range).toEqual({
      start: { x: 1, y: 1 },
      end: { x: 26, y: 1 },
    });

    links?.[0].activate(mouseEvent, links[0].text);

    expect(postMessage).toHaveBeenCalledWith({
      type: "openFile",
      path: "src/webview/links/index.ts",
      line: undefined,
      endLine: undefined,
      column: undefined,
    });
  });

  it("links at-mentions with hash line ranges", async () => {
    const links = await provideLinks("See @src/webview/links/index.ts#L15-L20");

    expect(links).toHaveLength(1);
    expect(links?.[0].text).toBe("@src/webview/links/index.ts#L15-L20");

    links?.[0].activate(mouseEvent, links[0].text);

    expect(postMessage).toHaveBeenCalledWith({
      type: "openFile",
      path: "src/webview/links/index.ts",
      line: 15,
      endLine: 20,
      column: undefined,
    });
  });

  it("links relative file paths with line and column suffixes", async () => {
    const links = await provideLinks("src/providers/MessageRouter.ts:347:3");

    expect(links).toHaveLength(1);
    expect(links?.[0].text).toBe("src/providers/MessageRouter.ts:347:3");

    links?.[0].activate(mouseEvent, links[0].text);

    expect(postMessage).toHaveBeenCalledWith({
      type: "openFile",
      path: "src/providers/MessageRouter.ts",
      line: 347,
      endLine: undefined,
      column: 3,
    });
  });

  it("links relative file paths with colon line ranges", async () => {
    const links = await provideLinks("src/webview/links/index.ts:15-21");

    expect(links).toHaveLength(1);
    expect(links?.[0].text).toBe("src/webview/links/index.ts:15-21");

    links?.[0].activate(mouseEvent, links[0].text);

    expect(postMessage).toHaveBeenCalledWith({
      type: "openFile",
      path: "src/webview/links/index.ts",
      line: 15,
      endLine: 21,
      column: undefined,
    });
  });

  it("omits trailing punctuation from the linked file path", async () => {
    const links = await provideLinks("Open (src/webview/links/index.ts).");

    expect(links).toHaveLength(1);
    expect(links?.[0].text).toBe("src/webview/links/index.ts");
  });
});
