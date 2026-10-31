import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

it("opts out of Dark Reader in the server document before the application is parsed", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <p>Application</p>
    </RootLayout>,
  );
  const document = new DOMParser().parseFromString(html, "text/html");

  // This is the marker selector used by Dark Reader's dynamic theme engine.
  const lock = document.querySelector('meta[name="darkreader-lock"]');
  expect(lock?.parentElement).toBe(document.head);
  expect(html.indexOf('name="darkreader-lock"')).toBeLessThan(
    html.indexOf("<body"),
  );
  expect(document.head.querySelector("script")?.textContent).toContain(
    "prefers-color-scheme",
  );
});
